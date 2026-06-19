#!/usr/bin/env python3
"""Etapa B — Existência e granularidade do PCA (controle-de-pragas × São Luís/MA).

ROTA CANÔNICA (revisada): /v1/pca/usuario?cnpj= exige idUsuario (inviável) e os
editais de São Luís são SEM catálogo (CATSER empírico = 0). Então usamos o
código CATSER canônico da célula — classe 8531 "Serviço de Desinfecção e
Exterminação" — em /v1/pca/?codigoClassificacaoSuperior=8531 (nacional) e
filtramos São Luís client-side por orgaoEntidadeCnpj (lista da Etapa A), já que
o endpoint não tem filtro por município.

Captura por item: descricaoItem, nomeClassificacaoCatalogo, pdmCodigo, valorTotal,
valorUnitario, quantidadeEstimada, dataDesejada, dataPublicacaoPNCP,
unidadeRequisitante, orgaoEntidadeCnpj, codigoUnidade (codigoUnidadeAdministrativa).

Só leitura, incremental (resiliente a kill). Saída: docs/f0-evidence/etapa_b_pca.json.
"""
import json
import os
import sys

from client import get, paginate

EVID = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "f0-evidence"))
IN_A = os.path.join(EVID, "etapa_a_catser.json")
OUT = os.path.join(EVID, "etapa_b_pca.json")

ANOS_PCA = [2025, 2026]
# CATSER canônico da célula (urbano). 8534/9490 ficam fora (agrícola/ambiental).
CATSER_CELULA = [8531]


def campo(item, *nomes):
    for n in nomes:
        v = item.get(n)
        if v not in (None, ""):
            return v
    return None


def extrai_item(it, rec, ano):
    out = {
        "descricaoItem": campo(it, "descricaoItem", "descricao"),
        "nomeClassificacaoCatalogo": campo(it, "nomeClassificacaoCatalogo"),
        "pdmCodigo": campo(it, "pdmCodigo"),
        "pdmDescricao": campo(it, "pdmDescricao"),
        "codigoItem": campo(it, "codigoItem", "catalogoCodigoItem"),
        "classificacaoSuperiorCodigo": campo(it, "classificacaoSuperiorCodigo",
                                             "codigoClassificacaoSuperior"),
        "valorTotal": campo(it, "valorTotal"),
        "valorUnitario": campo(it, "valorUnitario", "valorUnitarioEstimado"),
        "quantidadeEstimada": campo(it, "quantidadeEstimada", "quantidade"),
        "dataDesejada": campo(it, "dataDesejada"),
        "categoriaItemPcaNome": campo(it, "categoriaItemPcaNome", "categoriaItemNome"),
        "unidadeRequisitante": campo(it, "unidadeRequisitante"),
        "orgaoEntidadeCnpj": rec.get("orgaoEntidadeCnpj"),
        "orgaoEntidadeRazaoSocial": rec.get("orgaoEntidadeRazaoSocial"),
        "codigoUnidadeAdministrativa": rec.get("codigoUnidade"),
        "nomeUnidade": rec.get("nomeUnidade"),
        "dataPublicacaoPNCP": rec.get("dataPublicacaoPNCP"),
        "anoPca": ano,
        "na_celula": True,  # filtrado por código CATSER 8531
    }
    out["g1_completo"] = all([
        out["descricaoItem"], out["nomeClassificacaoCatalogo"],
        out["valorTotal"] is not None, out["dataDesejada"],
    ])
    return out


def main():
    with open(IN_A, encoding="utf-8") as f:
        a = json.load(f)
    sl_cnpjs = {o["cnpjOrgao"] for o in a.get("cnpjs_orgaos_saoluis", []) if o.get("cnpjOrgao")}
    print(f"CNPJs São Luís (Etapa A): {len(sl_cnpjs)} | CATSER célula: {CATSER_CELULA}", file=sys.stderr)

    itens_celula = []
    por_orgao = {}
    outros_ma = []  # razão social MARANHÃO/SÃO LUÍS fora da lista A (revisão manual)
    falhas = []
    n_nacional = {}

    def snapshot(parcial):
        comp = sum(1 for r in itens_celula if r["g1_completo"])
        out = {
            "etapa": "B",
            "celula": "controle-de-pragas x São Luís/MA",
            "rota": "CATSER canônico 8531 (Serviço de Desinfecção e Exterminação) + filtro CNPJ São Luís",
            "endpoint": "/v1/pca/?codigoClassificacaoSuperior=8531",
            "anos_pca": ANOS_PCA,
            "catser_celula": CATSER_CELULA,
            "parcial": parcial,
            "n_registros_nacionais_8531": n_nacional,
            "presenca_pca_celula": len(itens_celula) > 0,
            "n_itens_celula": len(itens_celula),
            "g1_preview": {
                "itens_celula": len(itens_celula),
                "itens_com_4_campos": comp,
                "pct": round(100.0 * comp / len(itens_celula), 1) if itens_celula else None,
            },
            "por_orgao": [{"cnpj": k, **v} for k, v in por_orgao.items()],
            "outros_orgaos_ma_revisar": outros_ma,
            "falhas": falhas,
            "itens_celula": itens_celula,
        }
        os.makedirs(EVID, exist_ok=True)
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        return out

    for code in CATSER_CELULA:
        for ano in ANOS_PCA:
            base = {"anoPca": ano, "codigoClassificacaoSuperior": code}
            try:
                _, head = get("/v1/pca/", dict(base, pagina=1, tamanhoPagina=10))
                tp = (head or {}).get("totalPaginas") or 0
                n_nacional[f"{code}/{ano}"] = (head or {}).get("totalRegistros")
            except RuntimeError as e:
                falhas.append({"code": code, "ano": ano, "fase": "head", "erro": str(e)[:160]})
                print(f"  [8531/{ano}] head falhou: {e}", file=sys.stderr)
                continue
            print(f"[8531/{ano}] {n_nacional[f'{code}/{ano}']} registros nacionais, {tp} páginas",
                  file=sys.stderr)
            pagina = 0
            try:
                for rec in paginate("/v1/pca/", base, page_size=10, max_pages=tp + 2, pause=0.8):
                    cnpj = rec.get("orgaoEntidadeCnpj")
                    rz = (rec.get("orgaoEntidadeRazaoSocial") or "").upper()
                    if cnpj in sl_cnpjs:
                        its = rec.get("itens") or []
                        for it in its:
                            itens_celula.append(extrai_item(it, rec, ano))
                        d = por_orgao.setdefault(cnpj, {"razaoSocial": rec.get("orgaoEntidadeRazaoSocial"),
                                                        "n_registros": 0, "n_itens": 0})
                        d["n_registros"] += 1
                        d["n_itens"] += len(its)
                    elif "MARANH" in rz or "SAO LUIS" in rz or "SÃO LUÍS" in rz:
                        outros_ma.append({"cnpj": cnpj, "razaoSocial": rec.get("orgaoEntidadeRazaoSocial"),
                                          "nomeUnidade": rec.get("nomeUnidade"), "anoPca": ano})
                    pagina += 1
                    if pagina % 5 == 0:
                        snapshot(parcial=True)
                        print(f"  ...{pagina} registros varridos (célula até agora: {len(itens_celula)} itens)",
                              file=sys.stderr)
            except RuntimeError as e:
                falhas.append({"code": code, "ano": ano, "fase": "scan", "erro": str(e)[:160]})
                print(f"  [8531/{ano}] scan interrompido: {e}", file=sys.stderr)
            snapshot(parcial=True)

    out = snapshot(parcial=False)
    n = out["n_itens_celula"]
    print("\nEtapa B concluída.")
    print(f"  São Luís publica PCA de dedetização (8531)? {'SIM' if n else 'NÃO'}")
    print(f"  n itens-PCA da célula: {n}")
    if n:
        print(f"  G1 preview: {out['g1_preview']['itens_com_4_campos']}/{n} "
              f"({out['g1_preview']['pct']}%) com os 4 campos")
    print(f"  órgãos São Luís com PCA 8531: {len(por_orgao)}")
    print(f"  outros órgãos MA p/ revisar: {len(outros_ma)} | falhas: {len(falhas)}")
    print(f"  saída: {OUT}")


if __name__ == "__main__":
    main()
