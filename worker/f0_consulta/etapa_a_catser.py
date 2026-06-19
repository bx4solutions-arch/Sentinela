#!/usr/bin/env python3
"""Etapa A — Descobrir o(s) CATSER da célula controle-de-pragas × São Luís/MA.

Seed por keyword no objetoCompra (modalidades dominantes de serviço), depois
busca os itens de cada edital casado para LER o CATSER do dado (não chutar).
Captura cnpjOrgao + codigoUnidadeAdministrativa (prova de unidade, A2/A3).

Só leitura. Saída: docs/f0-evidence/etapa_a_catser.json. STOP para aprovação.
"""
import json
import os
import sys

from client import IBGE_SAO_LUIS, UF, date_windows, get, paginate, unidade_de

EVID = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "f0-evidence")
OUT = os.path.normpath(os.path.join(EVID, "etapa_a_catser.json"))

# Seed ENXUTO (decisão do usuário): 12 meses, só modalidades dominantes 6 e 8.
# Termina rápido; os CATSER canônicos (refino #5) cobrem o que o seed perder —
# verificados pelo humano no gate de aprovação (confere os nomes de classificação).
DATA_INI = "20250619"
DATA_FIM = "20260619"
# Pregão Eletrônico (6) e Dispensa (8) concentram serviço de dedetização. Etapa C varre o enum todo.
MODALIDADES_SEED = [6, 8]

KEYWORDS = [
    "praga", "dedetiz", "desinsetiz", "desratiz", "descupiniz",
    "controle de vetor", "controle de roedor", "sanitiz", "imuniz",
    "controle integrado de praga",
]


def casa_keyword(texto):
    t = (texto or "").lower()
    return [k for k in KEYWORDS if k in t]


def itens_da_compra(cnpj, ano, sequencial):
    """GET dos itens de uma contratação. Retorna lista (ou [] se vazio)."""
    path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
    status, data = get(path, {"pagina": 1, "tamanhoPagina": 100})
    if not data:
        return []
    return data if isinstance(data, list) else (data.get("data") or [])


def classificacao_do_item(item):
    """Extrai campos de classificação CATSER/CATMAT do item, defensivo a schema."""
    return {
        "numeroItem": item.get("numeroItem"),
        "descricao": item.get("descricao"),
        "materialOuServico": item.get("materialOuServico") or item.get("materialOuServicoNome"),
        "codigoItemCatalogo": item.get("codigoItemCatalogo") or item.get("codigoItem"),
        "catalogo": item.get("nomeClassificacaoCatalogo") or item.get("catalogo"),
        "classificacaoSuperiorCodigo": item.get("classificacaoSuperiorCodigo"),
        "classificacaoSuperiorNome": item.get("classificacaoSuperiorNome"),
        "valorUnitarioEstimado": item.get("valorUnitarioEstimado"),
    }


def main():
    matched = []
    cnpjs = {}
    catser = {}
    item_keys_sample = None
    falhas = []  # janelas que falharam após retries — registradas, nunca silenciadas
    mods_concluidas = []

    def snapshot(parcial):
        out = {
            "etapa": "A",
            "celula": "controle-de-pragas x São Luís/MA",
            "municipioIbge": IBGE_SAO_LUIS,
            "janela_seed": {"dataInicial": DATA_INI, "dataFinal": DATA_FIM},
            "modalidades_seed": MODALIDADES_SEED,
            "modalidades_concluidas": list(mods_concluidas),
            "parcial": parcial,
            "keywords": KEYWORDS,
            "n_editais_casados": len(matched),
            "catser_empirico": sorted(catser.values(), key=lambda x: str(x["codigo"])),
            "cnpjs_orgaos_saoluis": sorted(cnpjs.values(), key=lambda x: x["cnpjOrgao"]),
            "diagnostico_item_keys": item_keys_sample,
            "janelas_falhadas": falhas,
            "editais_casados": matched,
        }
        os.makedirs(EVID, exist_ok=True)
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        return out

    for mod in MODALIDADES_SEED:
        base = {
            "codigoModalidadeContratacao": mod,
            "codigoMunicipioIbge": IBGE_SAO_LUIS,
            "uf": UF,
        }
        print(f"[modalidade {mod}] varrendo {DATA_INI}-{DATA_FIM}...", file=sys.stderr)
        for win_ini, win_fim in date_windows(DATA_INI, DATA_FIM, max_days=30):
            wb = dict(base, dataInicial=win_ini, dataFinal=win_fim)
            try:
                editais = list(paginate("/v1/contratacoes/publicacao", wb,
                                        page_size=10, max_pages=60, pause=1.2))
            except RuntimeError as e:
                print(f"  ! janela {win_ini}-{win_fim} mod {mod} falhou: {e}", file=sys.stderr)
                falhas.append({"modalidade": mod, "dataInicial": win_ini,
                               "dataFinal": win_fim, "erro": str(e)[:200]})
                continue
            for ed in editais:
                hits = casa_keyword(ed.get("objetoCompra"))
                if not hits:
                    continue
                u = unidade_de(ed)
                ano = ed.get("anoCompra")
                seq = ed.get("sequencialCompra")
                cnpj = u["cnpjOrgao"]
                rec = {
                    "numeroControlePNCP": ed.get("numeroControlePNCP"),
                    "objetoCompra": ed.get("objetoCompra"),
                    "modalidade": mod,
                    "modalidadeNome": ed.get("modalidadeNome"),
                    "anoCompra": ano,
                    "sequencialCompra": seq,
                    "valorTotalEstimado": ed.get("valorTotalEstimado"),
                    "dataPublicacaoPncp": ed.get("dataPublicacaoPncp"),
                    "keywords": hits,
                    **u,
                }
                # Busca itens para ler CATSER do dado.
                try:
                    itens = itens_da_compra(cnpj, ano, seq)
                except Exception as e:  # noqa: BLE001
                    print(f"  ! falha itens {cnpj}/{ano}/{seq}: {e}", file=sys.stderr)
                    itens = []
                if itens and item_keys_sample is None:
                    item_keys_sample = sorted(itens[0].keys())
                classifs = [classificacao_do_item(it) for it in itens]
                rec["itens_classificacao"] = classifs
                for c in classifs:
                    cod = c.get("classificacaoSuperiorCodigo") or c.get("codigoItemCatalogo")
                    if cod:
                        catser.setdefault(str(cod), {
                            "codigo": cod,
                            "classificacaoSuperiorNome": c.get("classificacaoSuperiorNome"),
                            "catalogo": c.get("catalogo"),
                            "exemplo_descricao": c.get("descricao"),
                            "fonte": "empirico",
                        })
                matched.append(rec)
                if cnpj:
                    cnpjs[cnpj] = {"cnpjOrgao": cnpj, "razaoSocialOrgao": u["razaoSocialOrgao"]}

        mods_concluidas.append(mod)
        snapshot(parcial=True)  # checkpoint após cada modalidade
        print(f"[modalidade {mod}] checkpoint salvo "
              f"(editais={len(matched)}, catser={len(catser)})", file=sys.stderr)

    out = snapshot(parcial=False)

    print("\nEtapa A concluída.")
    print(f"  editais casados (keyword): {len(matched)}")
    print(f"  códigos CATSER/catálogo empíricos: {len(catser)}")
    print(f"  órgãos (cnpj) de São Luís: {len(cnpjs)}")
    print(f"  item keys (diagnóstico schema): {item_keys_sample}")
    print(f"  janelas falhadas (após retries): {len(falhas)}")
    print(f"  saída: {OUT}")


if __name__ == "__main__":
    main()
