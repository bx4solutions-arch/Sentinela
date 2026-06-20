#!/usr/bin/env python3
"""
Backfill + medição de matéria-prima (F0) de uma célula.
Célula default: controle de pragas × São Luís/MA.

Fonte: PNCP search API (texto livre + filtro UF) + consulta PCA.
Saída: /tmp/f0_<slug>.json  (dataset bruto + métricas)

Uso: python3 worker/f0_pull.py
Régua: somente leitura de API pública, sem token. Doc: docs/fontes.md
"""
import json, sys, time, urllib.parse, urllib.request

UA = "Sentinela/0.1"
SEARCH = "https://pncp.gov.br/api/search/"
CONSULTA = "https://pncp.gov.br/api/consulta/v1"

# --- recorte da célula ---
UF = "MA"
MUNICIPIO = "São Luís"
MUNICIPIO_ID = "636"  # ID interno do PNCP (NÃO é o IBGE 2111300). Filtra server-side.
# A busca do PNCP é AND entre termos -> consultar cada sinônimo SEPARADO e unir (dedupe).
OBJETO_QUERIES = [
    "controle de pragas",
    "dedetização",
    "desinsetização",
    "desratização",
    "controle de vetores",
]
# sinônimos para classificar/match de objeto no texto
OBJ_RX = ("praga", "dedetiz", "desinsetiz", "desratiz", "imuniz", "controle de vetor", "sanitiz")


def http_json(url, retries=4):
    """GET com backoff: o PNCP reseta conexão (WAF/rate-limit) sob carga."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def search_all(q, municipio_id, max_pages=30):
    """Pagina a busca por objeto, filtrando município no servidor (municipios=<id>).
    NOTA: tam_pagina>10 e o param 'ordenacao' provocam connection reset no PNCP;
    filtrar por município mantém o nº de páginas baixo e evita o WAF."""
    out, pagina, total = [], 1, 0
    while pagina <= max_pages:
        qs = urllib.parse.urlencode({
            "q": q, "municipios": municipio_id,
            "tipos_documento": "edital",  # obrigatório; a API retorna tipos mistos mesmo assim
            "pagina": pagina, "tam_pagina": 10,
        })
        d = http_json(f"{SEARCH}?{qs}")
        items = d.get("items", [])
        out.extend(items)
        total = d.get("total", 0)
        if len(out) >= total or not items:
            break
        pagina += 1
        time.sleep(0.8)
    return out, total


def is_obj_match(text):
    t = (text or "").lower()
    return any(rx in t for rx in OBJ_RX)


def main():
    # multi-query + união por numero_controle_pncp (a busca é AND entre termos)
    seen, raw = set(), []
    totals = {}
    for q in OBJETO_QUERIES:
        items, total = search_all(q, MUNICIPIO_ID)
        totals[q] = total
        for it in items:
            key = it.get("numero_controle_pncp") or it.get("id")
            if key not in seen:
                seen.add(key)
                raw.append(it)
        time.sleep(0.8)
    # já filtrado por município no servidor; confirma por segurança
    saoluis = [it for it in raw if (it.get("municipio_nome") or "").strip().lower() == MUNICIPIO.lower()]

    # classificação por tipo de documento
    by_tipo = {}
    for it in saoluis:
        tipo = it.get("tipo_nome") or it.get("document_type") or "?"
        by_tipo[tipo] = by_tipo.get(tipo, 0) + 1

    # matching de objeto: % dos itens de São Luís cujo título/descrição batem nos sinônimos
    obj_hits = [it for it in saoluis if is_obj_match((it.get("title", "") + " " + it.get("description", "")))]
    matching_pct = round(100 * len(obj_hits) / len(saoluis), 1) if saoluis else 0.0

    # incumbentes / valores / resultado
    com_valor = [it for it in saoluis if it.get("valor_global")]
    com_resultado = [it for it in saoluis if it.get("tem_resultado")]

    metrics = {
        "celula": f"controle-de-pragas x {MUNICIPIO}/{UF}",
        "totais_MA_por_query": totals,
        "uniao_MA_dedup": len(raw),
        "docs_sao_luis": len(saoluis),
        "por_tipo": by_tipo,
        "matching_objeto_pct": matching_pct,
        "docs_com_valor": len(com_valor),
        "docs_com_resultado": len(com_resultado),
    }

    sample = [{
        "tipo": it.get("tipo_nome"),
        "orgao": it.get("orgao_nome"),
        "desc": (it.get("description") or "")[:80],
        "data_pub": it.get("data_publicacao_pncp"),
        "data_assinatura": it.get("data_assinatura"),
        "valor": it.get("valor_global"),
        "tem_resultado": it.get("tem_resultado"),
        "modalidade": it.get("modalidade_licitacao_nome"),
        "url": it.get("item_url"),
    } for it in saoluis]

    result = {"metrics": metrics, "sample": sample}
    out_path = "/tmp/f0_controle-pragas_saoluis.json"
    with open(out_path, "w") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(json.dumps(metrics, ensure_ascii=False, indent=2))
    print(f"\n[dataset completo salvo em {out_path} — {len(saoluis)} docs de São Luís]")


if __name__ == "__main__":
    main()
