#!/usr/bin/env python3
"""
HARVESTER de CONTRATOS (Camada 2 — Bloco 1) — contrato vencendo + quem ganhou.

Probe (worker/harvester/probe_contratos.py): /contratos aceita consulta NACIONAL por data
(dataInicial/dataFinal; SEM modalidade). Cada contrato traz:
  - dataVigenciaFim  -> "contrato vencendo em X dias"
  - niFornecedor + nomeRazaoSocialFornecedor + valorGlobal -> "quem ganhou" (vencedor)
  - numeroControlePncpCompra -> liga ao edital (raw_editais)

Só metadado, upsert DIRETO (idempotente), retry/backoff + checkpoint + CANARY, uf_sigla denormalizado.
NÃO baixa documento.

Uso:
  python3 worker/harvester/contratos.py --inicio 20250601 --fim 20250630   # janela (p/ vencendo ~12m)
  python3 worker/harvester/contratos.py --dias 30                          # últimos N dias (quem ganhou recente)
  python3 worker/harvester/contratos.py --reset-checkpoint
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

BASE = "https://pncp.gov.br/api/consulta/v1"
PATH = "/contratos"
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"
ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "worker" / "harvester" / "pncp_data"
CK_PATH = DATA / "_checkpoint_contratos.json"
CANARY_PATH = DATA / "_canary_contratos.json"

TAM_PAGINA = 50
MAX_RETRIES = 6
JANELA_DIAS = 1          # 1 dia/fatia: ~5600 contratos → checkpoint granular, sem acumular memória
BATCH = 500
FLUSH_PAGINAS = 10       # upsert incremental a cada N páginas (não espera a fatia inteira)
PAUSA_PAGINA = 0.4       # respeita o rate-limit do PNCP (contratos é pesado)
CANARY_MAX_MISS_RATE = 0.02
CRITICOS = ["numeroControlePNCP", "orgaoEntidade.cnpj", "unidadeOrgao.ufSigla", "dataVigenciaFim", "niFornecedor"]


def log(m): print(m, file=sys.stderr, flush=True)


def load_env():
    env = {}
    envf = ROOT / ".env.local"
    for line in envf.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    rest = env.get("SUPABASE_REST_URL") or ((env.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1") if env.get("SUPABASE_URL") else "")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not rest or not key:
        sys.exit("ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local")
    return rest.rstrip("/"), key


def get(params):
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
                raise RuntimeError(f"HTTP {e.code}: {url}") from e
            last = e  # 429/5xx → retry
        except Exception as e:
            last = e
        time.sleep(min(60, 1.5 * (2 ** attempt)))
    raise RuntimeError(f"GET falhou após {MAX_RETRIES}: {url} :: {last}")


def janelas(ini, fim, dias):
    d0 = dt.datetime.strptime(ini, "%Y%m%d"); d1 = dt.datetime.strptime(fim, "%Y%m%d")
    cur = d0
    while cur <= d1:
        nxt = min(cur + dt.timedelta(days=dias - 1), d1)
        yield cur.strftime("%Y%m%d"), nxt.strftime("%Y%m%d")
        cur = nxt + dt.timedelta(days=1)


def getpath(d, dotted):
    cur = d
    for p in dotted.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(p)
    return cur


def to_rows(itens):
    rows = []
    for c in itens:
        oe = c.get("orgaoEntidade") or {}
        uo = c.get("unidadeOrgao") or {}
        tc = c.get("tipoContrato") or {}
        rows.append({
            "numero_controle_pncp": c.get("numeroControlePNCP"),
            "numero_controle_compra": c.get("numeroControlePncpCompra"),
            "cnpj_orgao": oe.get("cnpj"),
            "uf_sigla": uo.get("ufSigla"),
            "cidade": uo.get("municipioNome"),
            "objeto": c.get("objetoContrato"),
            "ni_fornecedor": c.get("niFornecedor"),
            "nome_fornecedor": c.get("nomeRazaoSocialFornecedor"),
            "tipo_pessoa": c.get("tipoPessoa"),
            "valor_global": c.get("valorGlobal"),
            "valor_inicial": c.get("valorInicial"),
            "data_vigencia_inicio": c.get("dataVigenciaInicio"),
            "data_vigencia_fim": c.get("dataVigenciaFim"),
            "data_assinatura": c.get("dataAssinatura"),
            "data_publicacao": c.get("dataPublicacaoPncp"),
            "tipo_contrato": tc.get("nome"),
            "payload": c,
        })
    return rows


def upsert(rest, key, rows):
    if not rows:
        return 0
    url = f"{rest}/contratos?on_conflict=numero_controle_pncp"
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
               "Prefer": "resolution=merge-duplicates,return=minimal"}
    sent = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        for attempt in range(4):
            r = requests.post(url, headers=headers, data=json.dumps(chunk), timeout=120)
            if r.status_code < 300:
                break
            if attempt == 3:
                sys.exit(f"ERRO contratos lote {i}: HTTP {r.status_code} {r.text[:300]}")
            time.sleep(2 * (attempt + 1))
        sent += len(chunk)
    return sent


def load_ck():
    return set(json.loads(CK_PATH.read_text())) if CK_PATH.exists() else set()


def save_ck(done):
    DATA.mkdir(parents=True, exist_ok=True)
    CK_PATH.write_text(json.dumps(sorted(done), ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int)
    ap.add_argument("--inicio")
    ap.add_argument("--fim")
    ap.add_argument("--reset-checkpoint", action="store_true")
    args = ap.parse_args()

    rest, key = load_env()
    hoje = dt.date.today()
    fim = args.fim or hoje.strftime("%Y%m%d")
    if args.inicio:
        inicio = args.inicio
    elif args.dias:
        inicio = (hoje - dt.timedelta(days=args.dias - 1)).strftime("%Y%m%d")
    else:
        inicio = (hoje - dt.timedelta(days=1)).strftime("%Y%m%d")

    if args.reset_checkpoint and CK_PATH.exists():
        CK_PATH.unlink()

    def flush(itens):
        if not itens:
            return 0
        for c in itens:
            canary["total"] += 1
            for cr in CRITICOS:
                if not getpath(c, cr):
                    canary["miss"][cr] += 1
            uf = getpath(c, "unidadeOrgao.ufSigla") or "?"
            canary["ufs"][uf] = canary["ufs"].get(uf, 0) + 1
        upsert(rest, key, to_rows(itens))
        return len(itens)

    done = load_ck()
    canary = {"total": 0, "miss": {c: 0 for c in CRITICOS}, "ufs": {}}
    total = 0
    log(f"== Harvester CONTRATOS: {inicio}..{fim} (janela {JANELA_DIAS}d) ==")
    t0 = time.time()
    for di, df in janelas(inicio, fim, JANELA_DIAS):
        slug = f"contr|{di}|{df}"
        if slug in done:
            continue
        pagina, total_paginas = 1, 1
        buf = []
        while pagina <= total_paginas:
            d = get({"dataInicial": di, "dataFinal": df, "pagina": pagina, "tamanhoPagina": TAM_PAGINA})
            if not d or not d.get("data"):
                break
            total_paginas = d.get("totalPaginas") or 1
            buf.extend(d["data"])
            if len(buf) >= FLUSH_PAGINAS * TAM_PAGINA:   # upsert incremental
                total += flush(buf); buf = []
            pagina += 1
            time.sleep(PAUSA_PAGINA)
        total += flush(buf)
        log(f"  {slug}: acumulado {total} contratos (UFs={len(canary['ufs'])})")
        done.add(slug)
        save_ck(done)

    # canary
    alerta = False
    det = {}
    tot = canary["total"]
    for c, miss in canary["miss"].items():
        rate = (miss / tot) if tot else 0.0
        det[c] = {"miss": miss, "rate": round(rate, 4)}
        if tot >= 100 and rate > CANARY_MAX_MISS_RATE and c != "niFornecedor":
            alerta = True  # niFornecedor pode faltar legitimamente (contrato sem fornecedor PJ)
    n_ufs = len([u for u in canary["ufs"] if u != "?"])
    if tot >= 500 and n_ufs < 5:
        alerta = True
    DATA.mkdir(parents=True, exist_ok=True)
    CANARY_PATH.write_text(json.dumps({"janela": f"{inicio}..{fim}", "total": tot, "ufs_distintas": n_ufs,
                                       "ufs": canary["ufs"], "campos_criticos": det, "alerta": alerta},
                                      ensure_ascii=False, indent=2))
    log(("🚨 CANARY ALERTA contratos" if alerta else f"✅ CANARY ok: {tot} contratos, {n_ufs} UFs"))
    log(f"== concluído: {total} contratos em {time.time()-t0:.0f}s ==")


if __name__ == "__main__":
    main()
