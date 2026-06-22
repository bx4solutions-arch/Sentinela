#!/usr/bin/env python3
"""
PROBE (read-only) — o endpoint de editais do PNCP aceita consulta NACIONAL por data?
Decide o eixo de iteração do harvester nacional (Etapa 1.1):
  - se nacional (sem município) funciona  -> iterar por (janela × modalidade), teto = nada (nacional)
  - se exigir UF                          -> iterar por (UF × janela × modalidade), teto = 27 UFs
  - se exigir município                   -> recuar p/ escopo PI+SP (NUNCA 5570 municípios)

Stdlib só. Não grava nada. Janela curta recente p/ ser leve.
"""
import json, urllib.parse, urllib.request, urllib.error, sys

BASE = "https://pncp.gov.br/api/consulta/v1"
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"
PATH = "/contratacoes/publicacao"

# janela curta recente (yyyyMMdd) — só pra sondar
DI, DF = "20260615", "20260622"
MODALIDADE = 6  # Pregão Eletrônico (o mais comum)


def get(params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}{PATH}?{qs}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=90) as r:
            body = r.read().decode("utf-8")
            return r.status, (json.loads(body) if body.strip() else None), url
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8")[:300]
        except Exception:
            pass
        return e.code, detail, url
    except Exception as e:
        return None, str(e), url


def ufs_da_pagina(data):
    ufs = {}
    for it in (data.get("data") or []):
        uo = it.get("unidadeOrgao") or {}
        uf = uo.get("ufSigla") or "?"
        ufs[uf] = ufs.get(uf, 0) + 1
    return ufs


def cenario(nome, params):
    print(f"\n===== {nome} =====")
    status, data, url = get(params)
    print(f"  params: {params}")
    print(f"  status: {status}")
    if isinstance(data, dict):
        tp = data.get("totalPaginas")
        tr = data.get("totalRegistros")
        n = len(data.get("data") or [])
        print(f"  totalRegistros={tr}  totalPaginas={tp}  itens_pagina={n}")
        if n:
            print(f"  UFs na 1a pagina: {ufs_da_pagina(data)}")
            ex = (data.get("data") or [])[0]
            print(f"  ex: situacao={ex.get('situacaoCompraNome')!r} uf={(ex.get('unidadeOrgao') or {}).get('ufSigla')!r} objeto={(ex.get('objetoCompra') or '')[:60]!r}")
        return tr, (data.get("data") or [])
    else:
        print(f"  corpo/erro: {str(data)[:300]}")
        return None, []


# 1) NACIONAL: só data + modalidade (sem município, sem uf)
tr_nac, itens = cenario("1) NACIONAL (data + modalidade, SEM municipio/uf)",
        {"dataInicial": DI, "dataFinal": DF, "codigoModalidadeContratacao": MODALIDADE,
         "pagina": 1, "tamanhoPagina": 50})

# 2) por UF (Piauí) — valida o teto de iteração = UF
cenario("2) por UF = PI (data + modalidade + uf)",
        {"dataInicial": DI, "dataFinal": DF, "codigoModalidadeContratacao": MODALIDADE,
         "uf": "PI", "pagina": 1, "tamanhoPagina": 50})

# 3) por municipio (comportamento atual) — comparacao
cenario("3) por MUNICIPIO = Teresina/PI (2211001)",
        {"dataInicial": DI, "dataFinal": DF, "codigoModalidadeContratacao": MODALIDADE,
         "codigoMunicipioIbge": "2211001", "pagina": 1, "tamanhoPagina": 50})

# 4) sem modalidade (data só) — a modalidade é obrigatoria?
cenario("4) SEM modalidade (so data)",
        {"dataInicial": DI, "dataFinal": DF, "pagina": 1, "tamanhoPagina": 50})

# diversidade de UF se nacional funcionou (varre 1a pagina e conta UFs distintas)
if tr_nac:
    distintas = {}
    for it in itens:
        uf = (it.get("unidadeOrgao") or {}).get("ufSigla") or "?"
        distintas[uf] = distintas.get(uf, 0) + 1
    print(f"\n>>> VEREDITO PROBE: nacional retornou {tr_nac} registros (modalidade {MODALIDADE}, 7 dias); UFs distintas na amostra: {sorted(distintas)}")
else:
    print("\n>>> VEREDITO PROBE: nacional NAO retornou — ver cenarios 2/3 p/ decidir eixo (UF ou municipio).")
