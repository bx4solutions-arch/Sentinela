#!/usr/bin/env python3
"""
Backfill on-demand por célula (cidade). Worker LOCAL.

Faz polling de `cidade_coletada` (status='pendente'), coleta os METADADOS dos editais
daquele município no PNCP (município-level, 24 meses, SEM documentos), carrega em
raw_editais/orgao e marca 'pronta'. Cidade já 'pronta' = reuso (não recoleta).

Uso:
  python3 worker/backfill_worker.py --once     # processa pendentes e sai (autoteste)
  python3 worker/backfill_worker.py            # loop contínuo (deixe rodando ao lado do dev)
"""
import json, sys, time, urllib.parse, urllib.request, urllib.error, datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://pncp.gov.br/api/consulta/v1"
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"
MODALIDADES = list(range(1, 15))
JANELA_DIAS = 90
MESES = 24
TAM_PAGINA = 50
MAX_RETRIES = 6

SEGMENTOS = {
    "controle-de-pragas": ["praga", "dedetiz", "desinsetiz", "desratiz", "descupiniz", "controle de vetor", "sanitiz", "imuniz", "desinfec", "exterm"],
    "material-hospitalar": ["hospitalar", "médico-hospitalar", "material médico", "correlato", "seringa", "luva ", "gaze", "cateter", "curativo", "equipo", "insumo", "medicamento", "odontolog", "laboratorial"],
    "material-de-expediente": ["expediente", "escritório", "papel a4", "caneta", "toner", "cartucho", "grampeador", "material de consumo", "suprimento", "almoxarifado"],
}


def log(m): print(m, file=sys.stderr, flush=True)


def env():
    e = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); e[k.strip()] = v.strip().strip('"').strip("'")
    rest = e.get("SUPABASE_REST_URL") or (e.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1")
    return rest.rstrip("/"), e["SUPABASE_SERVICE_ROLE_KEY"]


REST, SR = env()
SBH = {"apikey": SR, "Authorization": f"Bearer {SR}", "Content-Type": "application/json"}


def sb_get(path):
    req = urllib.request.Request(f"{REST}/{path}", headers=SBH)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def sb_write(path, rows, on_conflict, method="POST"):
    if not rows: return
    url = f"{REST}/{path}"
    if on_conflict: url += f"?on_conflict={on_conflict}"
    h = dict(SBH, Prefer="resolution=merge-duplicates,return=minimal")
    for i in range(0, len(rows), 500):
        chunk = rows[i:i + 500]
        req = urllib.request.Request(url, data=json.dumps(chunk).encode(), headers=h, method=method)
        urllib.request.urlopen(req, timeout=120).read()


def sb_patch(path, payload):
    req = urllib.request.Request(f"{REST}/{path}", data=json.dumps(payload).encode(),
                                 headers=dict(SBH, Prefer="return=minimal"), method="PATCH")
    urllib.request.urlopen(req, timeout=60).read()


def janelas(ini, fim, dias):
    cur = ini
    while cur <= fim:
        nxt = min(cur + dt.timedelta(days=dias - 1), fim)
        yield cur.strftime("%Y%m%d"), nxt.strftime("%Y%m%d"); cur = nxt + dt.timedelta(days=1)


def pncp_get(path, params):
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    last = None
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read().decode()
                return None if (r.status == 204 or not body.strip()) else json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (204, 404): return None
            if e.code == 422: raise RuntimeError(f"422 {url}")
            last = e
        except Exception as e:
            last = e
        time.sleep(min(60, 1.5 * (2 ** attempt)))
    raise RuntimeError(f"GET falhou: {url} :: {last}")


def paginate(path, base, pause=0.4):
    page = 1
    while page <= 400:
        d = pncp_get(path, dict(base, pagina=page, tamanhoPagina=TAM_PAGINA))
        if not d: return
        items = d.get("data") if isinstance(d, dict) else d
        if not items: return
        for it in items: yield it
        tp = d.get("totalPaginas") if isinstance(d, dict) else None
        if tp is not None and page >= tp: return
        page += 1; time.sleep(pause)


def seg_de(t):
    t = (t or "").lower()
    return [s for s, kws in SEGMENTOS.items() if any(k in t for k in kws)]


def coletar(codigo_ibge, municipio):
    """Coleta metadados de TODOS os editais do município (24 meses). Retorna (orgaos, editais)."""
    fim = dt.date.today()
    ini = fim - dt.timedelta(days=365 * MESES // 12)
    editais, vistos, orgaos = [], set(), {}
    falhas = 0
    for modal in MODALIDADES:
        for d0, d1 in janelas(dt.datetime.combine(ini, dt.time()), dt.datetime.combine(fim, dt.time()), JANELA_DIAS):
            params = {"dataInicial": d0, "dataFinal": d1, "codigoModalidadeContratacao": modal, "codigoMunicipioIbge": codigo_ibge}
            try:
                slice_items = list(paginate("/contratacoes/publicacao", params))
            except Exception as e:
                falhas += 1
                log(f"  [fatia falhou, pulando] modal={modal} {d0}-{d1}: {e}")
                continue
            for it in slice_items:
                ncp = it.get("numeroControlePNCP")
                if not ncp or ncp in vistos: continue
                vistos.add(ncp)
                oe = it.get("orgaoEntidade") or {}; uo = it.get("unidadeOrgao") or {}
                cnpj = oe.get("cnpj")
                if cnpj and cnpj not in orgaos:
                    orgaos[cnpj] = {"cnpj": cnpj, "razao_social": oe.get("razaoSocial"), "cidade": municipio,
                                    "poder_id": oe.get("poderId"), "esfera_id": oe.get("esferaId"),
                                    "uf_sigla": uo.get("ufSigla"), "codigo_ibge": uo.get("codigoIbge")}
                editais.append({
                    "numero_controle_pncp": ncp, "cnpj_orgao": cnpj, "cidade": municipio,
                    "segmentos": seg_de(it.get("objetoCompra")), "objeto": it.get("objetoCompra"),
                    "modalidade_id": it.get("modalidadeId"), "modalidade_nome": it.get("modalidadeNome"),
                    "situacao_nome": it.get("situacaoCompraNome"), "valor_estimado": it.get("valorTotalEstimado"),
                    "valor_homologado": it.get("valorTotalHomologado"), "data_publicacao": it.get("dataPublicacaoPncp"),
                    "data_abertura_proposta": it.get("dataAberturaProposta"), "data_encerramento": it.get("dataEncerramentoProposta"),
                    "link_origem": it.get("linkSistemaOrigem"), "payload": it,
                })
    return list(orgaos.values()), editais, falhas


def processar(cell):
    ibge, mun = cell["codigo_ibge"], cell.get("municipio") or cell["codigo_ibge"]
    log(f"[coletando] {mun} ({ibge})…")
    sb_patch(f"cidade_coletada?codigo_ibge=eq.{ibge}", {"status": "coletando"})
    try:
        orgaos, editais, falhas = coletar(ibge, mun)
        if not editais and falhas:
            sb_patch(f"cidade_coletada?codigo_ibge=eq.{ibge}", {"status": "erro"})
            log(f"[erro] {mun}: nenhuma fatia coletou ({falhas} falhas)"); return
        sb_write("orgao", orgaos, "cnpj")
        sb_write("raw_editais", editais, "numero_controle_pncp")
        sb_patch(f"cidade_coletada?codigo_ibge=eq.{ibge}",
                 {"status": "pronta", "editais_count": len(editais), "ultima_coleta": dt.datetime.utcnow().isoformat() + "Z"})
        log(f"[pronta] {mun}: {len(editais)} editais, {len(orgaos)} órgãos ({falhas} fatias puladas)")
    except Exception as e:
        sb_patch(f"cidade_coletada?codigo_ibge=eq.{ibge}", {"status": "erro"})
        log(f"[erro] {mun}: {e}")


def main():
    once = "--once" in sys.argv
    while True:
        pend = sb_get("cidade_coletada?status=eq.pendente&select=codigo_ibge,municipio")
        if pend:
            for c in pend: processar(c)
        elif once:
            log("sem pendentes."); break
        if once: break
        time.sleep(10)


if __name__ == "__main__":
    main()
