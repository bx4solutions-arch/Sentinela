#!/usr/bin/env python3
"""Etapa C — Editais + contratos da célula (controle-de-pragas × São Luís/MA).

Varre o ENUM COMPLETO de modalidade (refino #7) em /v1/contratacoes/publicacao,
município 2111300, janela 24 meses. Classifica cada edital como da célula por
keyword no objeto (confirmável por CATSER da Etapa A). Dedupe por
numeroControlePNCP. Captura unidadeOrgao.codigoUnidade (prova de unidade).
Depois puxa /v1/contratos por órgão para histórico de incumbente/preço.

Só leitura, incremental por modalidade (resiliente a kill). Saídas:
docs/f0-evidence/etapa_c_editais.json e etapa_c_contratos.json.
"""
import json
import os
import sys

from client import IBGE_SAO_LUIS, MODALIDADES, UF, date_windows, paginate, unidade_de

EVID = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "f0-evidence"))
IN_A = os.path.join(EVID, "etapa_a_catser.json")
OUT_ED = os.path.join(EVID, "etapa_c_editais.json")
OUT_CT = os.path.join(EVID, "etapa_c_contratos.json")

# Janela 24 meses (confirmada pelo usuário): jun/2024 a jun/2026.
DATA_INI = "20240619"
DATA_FIM = "20260619"

KEYWORDS = [
    "praga", "dedetiz", "desinsetiz", "desratiz", "descupiniz",
    "controle de vetor", "controle de roedor", "sanitiz", "imuniz",
    "controle integrado de praga",
]


def casa_keyword(texto):
    t = (texto or "").lower()
    return [k for k in KEYWORDS if k in t]


def edital_rec(ed, hits):
    u = unidade_de(ed)
    return {
        "numeroControlePNCP": ed.get("numeroControlePNCP"),
        "objetoCompra": ed.get("objetoCompra"),
        "modalidadeId": ed.get("modalidadeId"),
        "modalidadeNome": ed.get("modalidadeNome"),
        "anoCompra": ed.get("anoCompra"),
        "sequencialCompra": ed.get("sequencialCompra"),
        "valorTotalEstimado": ed.get("valorTotalEstimado"),
        "valorTotalHomologado": ed.get("valorTotalHomologado"),
        "dataPublicacaoPncp": ed.get("dataPublicacaoPncp"),
        "situacaoCompraId": ed.get("situacaoCompraId"),
        "situacaoCompraNome": ed.get("situacaoCompraNome"),
        "existeResultado": bool(ed.get("valorTotalHomologado")),
        "keywords": hits,
        "cnpjOrgao": u["cnpjOrgao"],
        "razaoSocialOrgao": u["razaoSocialOrgao"],
        "codigoUnidadeAdministrativa": u["codigoUnidadeAdministrativa"],
        "nomeUnidade": u["nomeUnidade"],
        "municipioNome": u["municipioNome"],
        "codigoIbge": u["codigoIbge"],
    }


def varrer_editais():
    editais = {}  # dedupe por numeroControlePNCP
    por_modalidade = []
    falhas = []

    def dump(parcial, mods_ok):
        out = {
            "etapa": "C-editais",
            "celula": "controle-de-pragas x São Luís/MA",
            "municipioIbge": IBGE_SAO_LUIS,
            "janela": {"dataInicial": DATA_INI, "dataFinal": DATA_FIM},
            "parcial": parcial,
            "modalidades_concluidas": mods_ok,
            "keywords": KEYWORDS,
            "n_editais_celula": len(editais),
            "n_editais_total_vistos": sum(m["n_total"] for m in por_modalidade),
            "por_modalidade": por_modalidade,
            "falhas": falhas,
            "editais_celula": sorted(editais.values(), key=lambda x: x.get("dataPublicacaoPncp") or ""),
        }
        os.makedirs(EVID, exist_ok=True)
        with open(OUT_ED, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        return out

    mods_ok = []
    for mod in sorted(MODALIDADES):
        base = {"codigoModalidadeContratacao": mod, "codigoMunicipioIbge": IBGE_SAO_LUIS, "uf": UF}
        n_mod_total = 0
        n_mod_celula = 0
        print(f"[modalidade {mod} {MODALIDADES[mod]}] varrendo...", file=sys.stderr)
        for win_ini, win_fim in date_windows(DATA_INI, DATA_FIM, max_days=30):
            wb = dict(base, dataInicial=win_ini, dataFinal=win_fim)
            try:
                lote = list(paginate("/v1/contratacoes/publicacao", wb,
                                     page_size=10, max_pages=80, pause=1.0))
            except RuntimeError as e:
                falhas.append({"modalidade": mod, "dataInicial": win_ini,
                               "dataFinal": win_fim, "erro": str(e)[:200]})
                continue
            for ed in lote:
                n_mod_total += 1
                hits = casa_keyword(ed.get("objetoCompra"))
                if not hits:
                    continue
                ncp = ed.get("numeroControlePNCP")
                if ncp and ncp not in editais:
                    editais[ncp] = edital_rec(ed, hits)
                    n_mod_celula += 1
        por_modalidade.append({"modalidade": mod, "nome": MODALIDADES[mod],
                               "n_total": n_mod_total, "n_celula": n_mod_celula})
        mods_ok.append(mod)
        dump(parcial=True, mods_ok=list(mods_ok))
        print(f"  mod {mod}: total={n_mod_total} célula={n_mod_celula} "
              f"(acum célula={len(editais)})", file=sys.stderr)

    return dump(parcial=False, mods_ok=list(mods_ok))


def varrer_contratos(cnpjs):
    """Histórico de contratos por órgão (incumbente/preço). Defensivo a schema."""
    contratos = {}
    falhas = []
    for cnpj in cnpjs:
        base = {"cnpjOrgao": cnpj}
        for win_ini, win_fim in date_windows(DATA_INI, DATA_FIM, max_days=180):
            wb = dict(base, dataInicial=win_ini, dataFinal=win_fim)
            try:
                lote = list(paginate("/v1/contratos", wb, page_size=10, max_pages=50, pause=1.0))
            except RuntimeError as e:
                falhas.append({"cnpjOrgao": cnpj, "dataInicial": win_ini,
                               "dataFinal": win_fim, "erro": str(e)[:200]})
                continue
            for ct in lote:
                hits = casa_keyword(ct.get("objetoContrato") or ct.get("objeto"))
                if not hits:
                    continue
                ncp = (ct.get("numeroControlePncpCompra") or ct.get("numeroControlePNCP")
                       or json.dumps(ct, sort_keys=True)[:80])
                u = unidade_de(ct)
                contratos.setdefault(ncp, {
                    "numeroControlePNCP": ct.get("numeroControlePNCP") or ct.get("numeroControlePncpCompra"),
                    "objeto": ct.get("objetoContrato") or ct.get("objeto"),
                    "nomeRazaoSocialFornecedor": ct.get("nomeRazaoSocialFornecedor") or ct.get("nomeFornecedor"),
                    "niFornecedor": ct.get("niFornecedor"),
                    "valorGlobal": ct.get("valorGlobal") or ct.get("valorInicial"),
                    "dataVigenciaInicio": ct.get("dataVigenciaInicio"),
                    "dataVigenciaFim": ct.get("dataVigenciaFim"),
                    "cnpjOrgao": u["cnpjOrgao"] or cnpj,
                    "codigoUnidadeAdministrativa": u["codigoUnidadeAdministrativa"],
                    "keywords": hits,
                })
    out = {
        "etapa": "C-contratos",
        "janela": {"dataInicial": DATA_INI, "dataFinal": DATA_FIM},
        "n_contratos_celula": len(contratos),
        "falhas": falhas,
        "contratos_celula": sorted(contratos.values(), key=lambda x: x.get("dataVigenciaInicio") or ""),
    }
    with open(OUT_CT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    return out


def main():
    ed = varrer_editais()
    cnpjs = sorted({e["cnpjOrgao"] for e in ed["editais_celula"] if e.get("cnpjOrgao")})
    print(f"\nEditais da célula: {ed['n_editais_celula']}  | órgãos p/ contratos: {len(cnpjs)}",
          file=sys.stderr)
    ct = varrer_contratos(cnpjs)

    print("\nEtapa C concluída.")
    print(f"  editais da célula (24m): {ed['n_editais_celula']} "
          f"(de {ed['n_editais_total_vistos']} editais vistos)")
    print(f"  contratos da célula: {ct['n_contratos_celula']}")
    print(f"  saídas: {OUT_ED} ; {OUT_CT}")


if __name__ == "__main__":
    main()
