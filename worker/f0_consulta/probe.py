#!/usr/bin/env python3
"""F0 probe — confirma o contrato real da PNCP Consulta API (read-only, mínimo).

Não escreve nada. Só imprime: status HTTP, chaves do envelope, e os nomes de
campo relevantes (objetoCompra, unidadeOrgao.codigoUnidade, valores, datas) de
1 página pequena de /v1/contratacoes/publicacao para São Luís/MA.
"""
import json
import urllib.parse
import urllib.request

BASE = "https://pncp.gov.br/api/consulta"
IBGE_SAO_LUIS = "2111300"
UA = "Sentinela-F0/0.1 (pesquisa institucional; contato bionicaosilva@gmail.com)"


def get(path, params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}{path}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, json.loads(r.read().decode("utf-8")), url


def main():
    # Janela curta de sondagem: 1º trim/2026. Modalidade 6 = Pregão Eletrônico (req.).
    params = {
        "dataInicial": "20260101",
        "dataFinal": "20260331",
        "codigoModalidadeContratacao": 6,
        "codigoMunicipioIbge": IBGE_SAO_LUIS,
        "uf": "MA",
        "pagina": 1,
        "tamanhoPagina": 10,
    }
    try:
        status, data, url = get("/v1/contratacoes/publicacao", params)
    except Exception as e:
        print(f"ERRO na requisição: {type(e).__name__}: {e}")
        return

    print(f"URL: {url}")
    print(f"HTTP {status}")
    if isinstance(data, dict):
        print(f"Chaves do envelope: {list(data.keys())}")
        print(f"totalRegistros: {data.get('totalRegistros')}  totalPaginas: {data.get('totalPaginas')}")
        items = data.get("data") or data.get("items") or []
    else:
        items = data if isinstance(data, list) else []
        print(f"Resposta é lista direta, len={len(items)}")

    print(f"Itens na página: {len(items)}")
    if items:
        first = items[0]
        print(f"Chaves de 1 edital: {sorted(first.keys())}")
        uo = first.get("unidadeOrgao") or {}
        oe = first.get("orgaoEntidade") or {}
        print("--- campos-chave do 1o edital ---")
        print(f"objetoCompra: {str(first.get('objetoCompra'))[:120]}")
        print(f"valorTotalEstimado: {first.get('valorTotalEstimado')}")
        print(f"valorTotalHomologado: {first.get('valorTotalHomologado')}")
        print(f"dataPublicacaoPncp: {first.get('dataPublicacaoPncp')}")
        print(f"numeroControlePNCP: {first.get('numeroControlePNCP')}")
        print(f"modalidadeNome: {first.get('modalidadeNome')}")
        print(f"orgaoEntidade.cnpj: {oe.get('cnpj')}  razaoSocial: {oe.get('razaoSocial')}")
        print(f"unidadeOrgao.codigoUnidade: {uo.get('codigoUnidade')}  nomeUnidade: {uo.get('nomeUnidade')}")
        print(f"unidadeOrgao.municipioNome: {uo.get('municipioNome')}  codigoIbge: {uo.get('codigoIbge')}")


if __name__ == "__main__":
    main()
