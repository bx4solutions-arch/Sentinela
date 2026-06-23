#!/usr/bin/env python3
"""
PROBE (read-only) — endpoint de CONTRATOS e RESULTADO do PNCP (Bloco 1 / Camada 2).
Decide o eixo de coleta: nacional-por-data (como editais) OU por cnpjOrgao (como o harvester antigo).
Stdlib só. Não grava nada. Janela curta recente.
"""
import json, urllib.parse, urllib.request, urllib.error, sys

BASE = "https://pncp.gov.br/api/consulta/v1"
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"
DI, DF = "20260501", "20260601"


def get(path, params):
    url = f"{BASE}{path}?{urllib.parse.urlencode(params)}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            body = r.read().decode("utf-8")
            return r.status, (json.loads(body) if body.strip() else None), url
    except urllib.error.HTTPError as e:
        d = ""
        try:
            d = e.read().decode("utf-8")[:300]
        except Exception:
            pass
        return e.code, d, url
    except Exception as e:
        return None, str(e), url


def cen(nome, path, params):
    print(f"\n===== {nome} =====")
    st, data, url = get(path, params)
    print(f"  {path}  params={params}")
    print(f"  status={st}")
    if isinstance(data, dict):
        tr = data.get("totalRegistros"); tp = data.get("totalPaginas"); n = len(data.get("data") or [])
        print(f"  totalRegistros={tr} totalPaginas={tp} itens={n}")
        if n:
            ex = data["data"][0]
            print(f"  keys: {sorted(ex.keys())[:20]}")
            print(f"  ex.dataVigenciaFim={ex.get('dataVigenciaFim')} valorGlobal={ex.get('valorGlobal') or ex.get('valorInicial')}")
            uo = ex.get('unidadeOrgao') or {}
            print(f"  uf={uo.get('ufSigla')} municipio={uo.get('municipioNome')} obj={(ex.get('objetoContrato') or ex.get('objetoCompra') or '')[:50]!r}")
    else:
        print(f"  corpo/erro: {str(data)[:280]}")


# CONTRATOS — variantes
cen("1) /contratos nacional por data", "/contratos", {"dataInicial": DI, "dataFinal": DF, "pagina": 1, "tamanhoPagina": 20})
cen("2) /contratos por dataVigencia", "/contratos", {"dataVigenciaInicial": DI, "dataVigenciaFinal": DF, "pagina": 1, "tamanhoPagina": 20})
cen("3) /contratos por cnpjOrgao (BB)", "/contratos", {"dataInicial": DI, "dataFinal": DF, "cnpjOrgao": "00000000000191", "pagina": 1, "tamanhoPagina": 20})
cen("4) /contratos/atualizacao", "/contratos/atualizacao", {"dataInicial": DI, "dataFinal": DF, "pagina": 1, "tamanhoPagina": 20})

# RESULTADO / itens — variantes (quem ganhou)
cen("5) /contratacoes/<id>/itens/resultados (precisa id) — só forma", "/contratacoes/publicacao", {"dataInicial": DI, "dataFinal": DF, "codigoModalidadeContratacao": 6, "pagina": 1, "tamanhoPagina": 1})
