#!/usr/bin/env python3
"""
HARVESTER POR CÉLULA (Camada 1 — Descoberta) — metadado dos editais novos das CIDADES ATIVAS.

Princípio do projeto (régua): ingestão por célula = setor × região. NUNCA dump nacional.
O escopo vem de `cidade_coletada` (status='pronta') via worker/harvester/scope.py.
Eixo de iteração = (cidade ativa × janela × modalidade 1..14), com filtro server-side
`codigoMunicipioIbge` — só vem o que a cidade pediu. Sem célula ativa → NADA é coletado
(o servidor nasce vazio). Toda gravação atravessa a guarda de escopo (defesa em profundidade).

[Histórico] Este worker já fez crawl NACIONAL por data (sem filtro de município), o que
estourou a cota com ~86k editais de cidades sem célula. Isso foi REVERTIDO: agora é por-cidade.

- SÓ metadado (KB por edital). NÃO baixa documento (Camada 3 é on-demand no clique).
- UPSERT DIRETO no Supabase (raw_editais on_conflict=numero_controle_pncp; orgao on_conflict=cnpj).
  Idempotente: re-rodar não duplica. JSONL é só log/debug opcional.
- Retry/backoff + checkpoint por fatia (retoma de onde parou).
- CANARY: valida presença dos campos críticos; se o PNCP mudar/renomear schema, ALERTA
  (o risco real é falha silenciosa). Grava _canary_nacional.json.

Uso:
  python3 worker/harvester/nacional.py                      # delta do dia (ontem→hoje), só células ativas
  python3 worker/harvester/nacional.py --dias 30            # backfill: últimos 30 dias, só células ativas
  python3 worker/harvester/nacional.py --inicio 20260401 --fim 20260622
  python3 worker/harvester/nacional.py --loop               # contínuo (worker local/dev; sleep 6h)
  python3 worker/harvester/nacional.py --reset-checkpoint   # ignora checkpoint

Lê .env.local (SUPABASE_URL/SUPABASE_REST_URL + SUPABASE_SERVICE_ROLE_KEY).
"""
import argparse
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import requests

import scope as escopo  # guarda de células ativas (mesmo diretório)

BASE = "https://pncp.gov.br/api/consulta/v1"
PATH = "/contratacoes/publicacao"
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "worker" / "harvester" / "pncp_data"
CK_PATH = DATA / "_checkpoint_nacional.json"
CANARY_PATH = DATA / "_canary_nacional.json"

MODALIDADES = list(range(1, 15))  # 1..14 (enum oficial). Algumas dão 204/0 — normal.
TAM_PAGINA = 50                   # probe: 5 dá 400; 50 funciona
MAX_RETRIES = 6
JANELA_DIAS = 7                   # fatia temporal (checkpointável)
BACKFILL_DIAS = 365               # unidade 'pendente' (cliente novo) puxa 1 ano de histórico
BATCH = 500                       # upsert em lotes
CANARY_MAX_MISS_RATE = 0.02       # >2% de um campo crítico ausente => alerta

# Classificação de segmento por keyword no objeto (mesma régua do harvester de cidade).
SEGMENTOS = {
    "controle-de-pragas": ["praga", "dedetiz", "desinsetiz", "desratiz", "descupiniz",
                           "controle de vetor", "sanitiz", "imuniz", "desinfec", "exterm"],
    "material-hospitalar": ["hospitalar", "médico-hospitalar", "material médico", "correlato",
                            "seringa", "luva ", "gaze", "cateter", "curativo", "equipo", "insumo",
                            "medicamento", "odontolog", "laboratorial"],
    "material-de-expediente": ["expediente", "escritório", "papel a4", "caneta", "toner", "cartucho",
                               "grampeador", "material de consumo", "suprimento", "almoxarifado"],
}
CRITICOS = ["numeroControlePNCP", "orgaoEntidade.cnpj", "unidadeOrgao.ufSigla", "situacaoCompraNome"]


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def load_env():
    env = {}
    envf = ROOT / ".env.local"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    rest = env.get("SUPABASE_REST_URL") or (
        (env.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1") if env.get("SUPABASE_URL") else "")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not rest or not key:
        sys.exit("ERRO: defina SUPABASE_URL (ou SUPABASE_REST_URL) e SUPABASE_SERVICE_ROLE_KEY em .env.local")
    return rest.rstrip("/"), key


def get(params):
    """GET com backoff exponencial. 204/404 = vazio legítimo. 400/422 = parâmetro inválido (levanta)."""
    url = f"{BASE}{PATH}?{urllib.parse.urlencode(params)}"
    last = None
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read().decode("utf-8")
                if r.status == 204 or not body.strip():
                    return None
                return json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (204, 404):
                return None
            if e.code in (400, 422):
                raise RuntimeError(f"HTTP {e.code} (parâmetro inválido): {url}") from e
            last = e
        except Exception as e:
            last = e
        time.sleep(min(60, 1.5 * (2 ** attempt)))
    raise RuntimeError(f"GET falhou após {MAX_RETRIES} tentativas: {url} :: {last}")


def janelas(ini, fim, dias):
    d0 = dt.datetime.strptime(ini, "%Y%m%d")
    d1 = dt.datetime.strptime(fim, "%Y%m%d")
    cur = d0
    while cur <= d1:
        nxt = min(cur + dt.timedelta(days=dias - 1), d1)
        yield cur.strftime("%Y%m%d"), nxt.strftime("%Y%m%d")
        cur = nxt + dt.timedelta(days=1)


def classificar(objeto):
    o = (objeto or "").lower()
    return [seg for seg, kws in SEGMENTOS.items() if any(k in o for k in kws)]


def getpath(d, dotted):
    cur = d
    for part in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def to_rows(itens):
    """Mapeia editais do PNCP → linhas de raw_editais + dict de orgao (por cnpj)."""
    ed_rows, orgaos = [], {}
    for e in itens:
        oe = e.get("orgaoEntidade") or {}
        uo = e.get("unidadeOrgao") or {}
        cnpj = oe.get("cnpj")
        ed_rows.append({
            "numero_controle_pncp": e.get("numeroControlePNCP"),
            "cnpj_orgao": cnpj,
            "uf_sigla": uo.get("ufSigla"),
            "cidade": uo.get("municipioNome"),
            "segmentos": classificar(e.get("objetoCompra")),
            "objeto": e.get("objetoCompra"),
            "modalidade_id": e.get("modalidadeId"),
            "modalidade_nome": e.get("modalidadeNome"),
            "situacao_nome": e.get("situacaoCompraNome"),
            "valor_estimado": e.get("valorTotalEstimado"),
            "valor_homologado": e.get("valorTotalHomologado"),
            "data_publicacao": e.get("dataPublicacaoPncp"),
            "data_abertura_proposta": e.get("dataAberturaProposta"),
            "data_encerramento": e.get("dataEncerramentoProposta"),
            "link_origem": e.get("linkSistemaOrigem"),
            "payload": e,
        })
        if cnpj and cnpj not in orgaos:
            orgaos[cnpj] = {
                "cnpj": cnpj,
                "razao_social": oe.get("razaoSocial"),
                "cidade": uo.get("municipioNome"),
                "poder_id": oe.get("poderId"),
                "esfera_id": oe.get("esferaId"),
                "uf_sigla": uo.get("ufSigla"),
                "codigo_ibge": uo.get("codigoIbge"),
            }
    return ed_rows, orgaos


def upsert(rest, key, table, rows, on_conflict):
    if not rows:
        return 0
    url = f"{rest}/{table}?on_conflict={on_conflict}"
    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    sent = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        for attempt in range(4):
            r = requests.post(url, headers=headers, data=json.dumps(chunk), timeout=120)
            if r.status_code < 300:
                break
            if attempt == 3:
                sys.exit(f"ERRO {table} lote {i}: HTTP {r.status_code} {r.text[:400]}")
            time.sleep(2 * (attempt + 1))
        sent += len(chunk)
    return sent


def load_ck():
    if CK_PATH.exists():
        return set(json.loads(CK_PATH.read_text()))
    return set()


def save_ck(done):
    DATA.mkdir(parents=True, exist_ok=True)
    CK_PATH.write_text(json.dumps(sorted(done), ensure_ascii=False))


def run_range(rest, key, inicio, fim, done, unidades, esc, backfill_inicio=None):
    """Itera (unidade ativa × janela × modalidade). Unidade = cidade (codigoMunicipioIbge)
    ou estado (uf), filtro server-side. Guarda 2D região×segmento antes de gravar.

    Janela por unidade: 'pendente' (cliente novo) puxa desde backfill_inicio; 'pronta' usa
    o delta [inicio..fim]. Checkpoint por fatia (slug inclui nível+chave da unidade).
    """
    canary = {"total": 0, "miss": {c: 0 for c in CRITICOS}, "ufs": {}}
    total_editais = 0
    rejeitados = 0
    for u in unidades:
        if u.get("nivel") == "estado":
            chave = u.get("uf")
            regiao_param = {"uf": chave}                 # ← trava de estado (server-side)
            rotulo = f"uf:{chave}"
        else:
            chave = str(u.get("codigo_ibge"))
            regiao_param = {"codigoMunicipioIbge": chave}  # ← trava de cidade (server-side)
            rotulo = u.get("municipio") or chave
        u_inicio = backfill_inicio if (u.get("status") == "pendente" and backfill_inicio) else inicio
        for di, df in janelas(u_inicio, fim, JANELA_DIAS):
            for mod in MODALIDADES:
                slug = f"ed|{u.get('nivel')}:{chave}|{mod}|{di}|{df}"
                if slug in done:
                    continue
                pagina, total_paginas = 1, 1
                itens_fatia = []
                while pagina <= total_paginas:
                    params = {"dataInicial": di, "dataFinal": df,
                              "codigoModalidadeContratacao": mod,
                              **regiao_param,
                              "pagina": pagina, "tamanhoPagina": TAM_PAGINA}
                    d = get(params)
                    if not d or not d.get("data"):
                        break
                    total_paginas = d.get("totalPaginas") or 1
                    itens_fatia.extend(d["data"])
                    pagina += 1
                    time.sleep(0.2)
                # GUARDA 2D: descarta item fora de região OU fora de segmento ativo.
                # (região é redundante com o filtro server-side; segmento é o corte de cota.)
                if itens_fatia:
                    antes = len(itens_fatia)
                    itens_fatia = [e for e in itens_fatia if esc.aceita(
                        ibge=getpath(e, "unidadeOrgao.codigoIbge"),
                        uf=getpath(e, "unidadeOrgao.ufSigla"),
                        nome=getpath(e, "unidadeOrgao.municipioNome"),
                        segmentos_edital=classificar(e.get("objetoCompra")))]
                    rejeitados += antes - len(itens_fatia)
                if itens_fatia:
                    # CANARY: presença dos campos críticos (falha silenciosa é o risco real)
                    for e in itens_fatia:
                        canary["total"] += 1
                        for c in CRITICOS:
                            if not getpath(e, c):
                                canary["miss"][c] += 1
                        uf = getpath(e, "unidadeOrgao.ufSigla") or "?"
                        canary["ufs"][uf] = canary["ufs"].get(uf, 0) + 1
                    ed_rows, orgaos = to_rows(itens_fatia)
                    upsert(rest, key, "orgao", list(orgaos.values()), "cnpj")
                    upsert(rest, key, "raw_editais", ed_rows, "numero_controle_pncp")
                    total_editais += len(ed_rows)
                    log(f"  {rotulo} {slug}: {len(ed_rows)} editais")
                done.add(slug)
                save_ck(done)
    if rejeitados:
        log(f"⚠️  guarda de escopo rejeitou {rejeitados} editais fora de célula ativa")
    return total_editais, canary


def escrever_canary(canary, inicio, fim):
    alerta = False
    detalhes = {}
    tot = canary["total"]
    for c, miss in canary["miss"].items():
        rate = (miss / tot) if tot else 0.0
        detalhes[c] = {"miss": miss, "rate": round(rate, 4)}
        if tot >= 100 and rate > CANARY_MAX_MISS_RATE:
            alerta = True
    # Coleta por célula traz POUCAS UFs (1 por cidade) — isso é o esperado, não alarma.
    # O canary aqui só vigia falha silenciosa de schema (campo crítico ausente).
    n_ufs = len([u for u in canary["ufs"] if u != "?"])
    out = {
        "janela": f"{inicio}..{fim}",
        "total_editais": tot,
        "ufs_distintas": n_ufs,
        "ufs": canary["ufs"],
        "campos_criticos": detalhes,
        "limiar_miss": CANARY_MAX_MISS_RATE,
        "alerta": alerta,
    }
    DATA.mkdir(parents=True, exist_ok=True)
    CANARY_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2))
    if alerta:
        log("🚨 CANARY ALERTA: schema do PNCP pode ter mudado (campo crítico ausente ou poucas UFs). Ver _canary_nacional.json")
    else:
        log(f"✅ CANARY ok: {tot} editais, {n_ufs} UFs, campos críticos presentes.")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, help="últimos N dias até hoje")
    ap.add_argument("--inicio", help="yyyyMMdd")
    ap.add_argument("--fim", help="yyyyMMdd (default: hoje)")
    ap.add_argument("--loop", action="store_true", help="contínuo (worker local/dev; sleep 6h)")
    ap.add_argument("--reset-checkpoint", action="store_true")
    args = ap.parse_args()

    rest, key = load_env()

    # ESCOPO = células ativas (fonte da verdade: cidade_coletada status='pronta').
    # Cada unidade é cidade OU estado, com segmentos. Sem unidade → servidor nasce vazio.
    unidades = escopo.carregar_unidades(rest, key)
    if not unidades:
        log("Nenhuma célula ativa (cidade_coletada status='pronta' vazia). Nada a coletar. Saindo.")
        return
    esc = escopo.Escopo(unidades)
    log("Escopo ativo: " + ", ".join(
        f"[{u.get('nivel')}]{u.get('municipio') or u.get('uf')}"
        f"{'/' + ','.join(u['segmentos']) if u.get('segmentos') else '/(todos)'}"
        for u in unidades))

    hoje = dt.date.today()
    fim = args.fim or hoje.strftime("%Y%m%d")
    if args.inicio:
        inicio = args.inicio
    elif args.dias:
        inicio = (hoje - dt.timedelta(days=args.dias - 1)).strftime("%Y%m%d")
    else:
        inicio = (hoje - dt.timedelta(days=1)).strftime("%Y%m%d")  # delta diário (ontem→hoje)

    if args.reset_checkpoint and CK_PATH.exists():
        CK_PATH.unlink()

    while True:
        backfill_inicio = (hoje - dt.timedelta(days=BACKFILL_DIAS - 1)).strftime("%Y%m%d")
        n_pend = sum(1 for u in unidades if u.get("status") == "pendente")
        done = load_ck()
        log(f"== Harvester por célula: delta {inicio}..{fim} "
            f"({len(unidades)} unidade(s), {n_pend} em backfill desde {backfill_inicio}) ==")
        t0 = time.time()
        total, canary = run_range(rest, key, inicio, fim, done, unidades, esc, backfill_inicio)
        escrever_canary(canary, inicio, fim)
        # 1ª coleta dos novos concluída → vira 'pronta' (radar passa a exibir como recorte preciso)
        escopo.promover_pendentes(rest, key)
        log(f"== concluído: {total} editais em {time.time()-t0:.0f}s ==")
        if not args.loop:
            break
        log("loop: dormindo 6h…")
        time.sleep(6 * 3600)
        hoje = dt.date.today()
        fim = hoje.strftime("%Y%m%d")
        inicio = (hoje - dt.timedelta(days=1)).strftime("%Y%m%d")


if __name__ == "__main__":
    main()
