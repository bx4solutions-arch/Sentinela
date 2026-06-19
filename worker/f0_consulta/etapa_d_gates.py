#!/usr/bin/env python3
"""Etapa D — Gates G1-G4, gold set e relatório de veredito.

Consome B (PCA) e C (editais+contratos). Não faz chamadas à API — só computa.

- G1 granularidade: % itens-PCA célula com os 4 campos (de B).
- G2 conversão PCA→edital: regra de match explícita (correção #3) — mesmo
  órgão/unidade + CATSER + similaridade de texto + ordem temporal. Persiste
  pares + confiança. Reporta 2 lead times rotulados (refino #6).
- G3 dossiê: % campos do §6 DERIVÁVEIS DO PNCP (correção #2); campos não-PNCP
  listados à parte como "pendente de enriquecimento".
- G4 matching: gera gold set CEGO AO CATSER (correção #4). Como rotulagem cega
  exige humano, o gate é reportado como PENDENTE até validação manual — não
  auto-certifica 80%.

Saídas: f0_dataset.json, f0_pares_pca_edital.csv, f0_gold_set.csv, f0-report.md.
"""
import csv
import datetime
import json
import os
import re
import statistics

EVID = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "f0-evidence"))
B = os.path.join(EVID, "etapa_b_pca.json")
C_ED = os.path.join(EVID, "etapa_c_editais.json")
C_CT = os.path.join(EVID, "etapa_c_contratos.json")

OUT_DS = os.path.join(EVID, "f0_dataset.json")
OUT_PAIRS = os.path.join(EVID, "f0_pares_pca_edital.csv")
OUT_GOLD = os.path.join(EVID, "f0_gold_set.csv")
OUT_REPORT = os.path.join(EVID, "f0-report.md")

PISO = {"G1": 70, "G2": 50, "G3": 80, "G4": 80}
JANELA_DIAS = 365  # match PCA→edital dentro de ~1 ano

STOP = set("de da do das dos e a o as os para por com sem em no na nos nas um uma "
           "servico servicos contratacao empresa especializada".split())


def carrega(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def tokens(txt):
    t = re.sub(r"[^a-zà-ú0-9 ]", " ", (txt or "").lower())
    return {w for w in t.split() if len(w) > 2 and w not in STOP}


def jaccard(a, b):
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def parse_data(s):
    if not s:
        return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(s)[:10])
    if not m:
        return None
    return datetime.date(int(m[1]), int(m[2]), int(m[3]))


def g2_match(itens_pca, editais):
    """Casa cada item-PCA da célula a um edital. Regra explícita (correção #3)."""
    pares = []
    for it in itens_pca:
        cnpj = it.get("orgaoEntidadeCnpj")
        und = it.get("codigoUnidadeAdministrativa")
        cat = str(it.get("classificacaoSuperiorCodigo"))
        d_pca = parse_data(it.get("dataPublicacaoPNCP")) or parse_data(it.get("dataDesejada"))
        melhor = None
        for ed in editais:
            if ed.get("cnpjOrgao") != cnpj:
                continue
            mesma_unidade = (str(ed.get("codigoUnidadeAdministrativa")) == str(und)) if und else False
            d_ed = parse_data(ed.get("dataPublicacaoPncp"))
            if not (d_pca and d_ed and d_ed >= d_pca):
                continue  # ordem temporal: edital depois do PCA
            if (d_ed - d_pca).days > JANELA_DIAS:
                continue
            sim = jaccard(it.get("descricaoItem"), ed.get("objetoCompra"))
            conf = (0.35 if mesma_unidade else 0.0) + 0.40 * min(1.0, sim / 0.4) + 0.25
            cand = {
                "pca_descricao": it.get("descricaoItem"),
                "pca_data": str(d_pca), "pca_catser": cat,
                "edital_ncp": ed.get("numeroControlePNCP"),
                "edital_objeto": ed.get("objetoCompra"),
                "edital_data": str(d_ed),
                "mesma_unidade": mesma_unidade, "similaridade": round(sim, 3),
                "lead_sinal_dias": (d_ed - d_pca).days,
                "confianca": round(conf, 3),
            }
            if melhor is None or cand["confianca"] > melhor["confianca"]:
                melhor = cand
        if melhor:
            pares.append(melhor)
    return pares


# Campos do Dossiê (§6 PRD) e sua derivabilidade só com PNCP (correção #2).
DOSSIE_PNCP = {
    "esteira_PCA": "B: presença/itens-PCA da célula",
    "incumbente_historico": "C-contratos: fornecedor + valorGlobal + vigência",
    "preco_estimado": "B/C: valorTotal / valorTotalEstimado",
    "preco_homologado": "C-editais: valorTotalHomologado",
    "concorrencia_resultado": "C-editais: existeResultado/situacao",
    "orgao_recorrencia": "B+C: repetição por cnpjOrgao/unidade",
    "objeto_janela": "B: dataDesejada / C: dataPublicacaoPncp",
}
DOSSIE_NAO_PNCP = {
    "decisores_agente_contratacao": "fora do F0 — diários oficiais",
    "capacidade_pagamento_orgao": "fora do F0 — Siconfi",
    "faixa_lances_concorrentes": "parcial — exige atas de lances (F1+)",
    "sancoes_fornecedor": "fora do F0 — CEIS/Transparência",
}


def main():
    b = carrega(B, {})
    c_ed = carrega(C_ED, {})
    c_ct = carrega(C_CT, {})
    a = carrega(os.path.join(EVID, "etapa_a_catser.json"), {})

    itens_pca = b.get("itens_celula", [])
    editais = c_ed.get("editais_celula", [])
    contratos = c_ct.get("contratos_celula", [])

    # Fallback: se a Etapa C não rodou, usa os editais da Etapa A (mesma célula,
    # janela seed 12m, mod 6+8). Normaliza o schema. Registrado como fonte_editais.
    fonte_editais = "C (24m, enum completo)"
    if not editais and a.get("editais_casados"):
        fonte_editais = "A (seed 12m, mod 6+8) — Etapa C não executada"
        editais = [{
            "numeroControlePNCP": e.get("numeroControlePNCP"),
            "objetoCompra": e.get("objetoCompra"),
            "modalidadeNome": e.get("modalidadeNome"),
            "valorTotalEstimado": e.get("valorTotalEstimado"),
            "valorTotalHomologado": None,
            "dataPublicacaoPncp": e.get("dataPublicacaoPncp"),
            "existeResultado": False,  # homologação não puxada no seed
            "cnpjOrgao": e.get("cnpjOrgao"),
            "codigoUnidadeAdministrativa": e.get("codigoUnidadeAdministrativa"),
            "nomeUnidade": e.get("nomeUnidade"),
        } for e in a.get("editais_casados", [])]

    n_pca = len(itens_pca)
    n_ed = len(editais)

    # ---- G1 ----
    g1_ok = sum(1 for r in itens_pca if r.get("g1_completo"))
    g1_pct = round(100.0 * g1_ok / n_pca, 1) if n_pca else None

    # ---- G2 ----
    pares = g2_match(itens_pca, editais)
    convertidos = {p["pca_descricao"] for p in pares}
    g2_pct = round(100.0 * len(convertidos) / n_pca, 1) if n_pca else None
    leads_sinal = [p["lead_sinal_dias"] for p in pares if p.get("lead_sinal_dias") is not None]
    lead_sinal_mediano = statistics.median(leads_sinal) if leads_sinal else None
    conf_media = round(statistics.mean([p["confianca"] for p in pares]), 3) if pares else None

    # ---- G3 ----
    g3_derivaveis = {}
    for campo in DOSSIE_PNCP:
        if campo == "esteira_PCA":
            ok = n_pca > 0
        elif campo == "incumbente_historico":
            ok = len(contratos) > 0
        elif campo in ("preco_estimado", "objeto_janela"):
            ok = n_pca > 0 or n_ed > 0
        elif campo in ("preco_homologado", "concorrencia_resultado"):
            ok = any(e.get("existeResultado") for e in editais)
        elif campo == "orgao_recorrencia":
            ok = n_ed > 0 or n_pca > 0
        else:
            ok = False
        g3_derivaveis[campo] = ok
    g3_ok = sum(1 for v in g3_derivaveis.values() if v)
    g3_total = len(g3_derivaveis)
    g3_pct = round(100.0 * g3_ok / g3_total, 1) if g3_total else None

    # ---- G4 gold set (cego ao CATSER) ----
    gold_rows = []
    for it in itens_pca:
        gold_rows.append({
            "id": it.get("codigoItem") or "",
            "objeto_descricao": (it.get("descricaoItem") or "").replace("\n", " ")[:300],
            "rotulo_humano_cego (1=pragas/0=nao/?=ambiguo)": "",
            "catser_OCULTAR_ATE_ROTULAR": it.get("classificacaoSuperiorCodigo"),
        })
    for ed in editais[:40]:
        gold_rows.append({
            "id": ed.get("numeroControlePNCP") or "",
            "objeto_descricao": (ed.get("objetoCompra") or "").replace("\n", " ")[:300],
            "rotulo_humano_cego (1=pragas/0=nao/?=ambiguo)": "",
            "catser_OCULTAR_ATE_ROTULAR": "",
        })

    # ---- persiste artefatos ----
    os.makedirs(EVID, exist_ok=True)
    with open(OUT_DS, "w", encoding="utf-8") as f:
        json.dump({
            "celula": "controle-de-pragas x São Luís/MA",
            "fontes": {"B": os.path.basename(B), "C_editais": os.path.basename(C_ED),
                       "C_contratos": os.path.basename(C_CT)},
            "n_itens_pca_celula": n_pca, "n_editais_celula": n_ed,
            "n_contratos_celula": len(contratos),
            "itens_pca": itens_pca, "editais": editais, "contratos": contratos,
        }, f, ensure_ascii=False, indent=2)

    if pares:
        with open(OUT_PAIRS, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(pares[0].keys()))
            w.writeheader()
            w.writerows(pares)
    else:
        with open(OUT_PAIRS, "w", encoding="utf-8") as f:
            f.write("nenhum par PCA->edital casado\n")

    if gold_rows:
        with open(OUT_GOLD, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(gold_rows[0].keys()))
            w.writeheader()
            w.writerows(gold_rows)

    # ---- veredito (matriz §2): cenário A/B/C ----
    if n_pca == 0:
        cenario = "C (dado raso/ausente) — São Luís não publica PCA da célula no PNCP"
    elif n_pca < 30 or n_ed < 30:
        cenario = "PROVISÓRIO (n < 30) — amostra insuficiente para veredito firme"
    elif (g1_pct or 0) >= PISO["G1"] and (g2_pct or 0) >= PISO["G2"]:
        cenario = "A (seguir) — granularidade e conversão acima do piso"
    else:
        cenario = "B (consertar) — matéria-prima existe mas abaixo de piso em G1/G2"

    def status(pct, piso):
        if pct is None:
            return "🔴 s/ dado"
        return "🟢" if pct >= piso else "🔴"

    rep = []
    rep.append("# F0 — Relatório de veredito · controle-de-pragas × São Luís/MA\n")
    rep.append("- Município IBGE: 2111300 · Endpoint: PNCP Consulta API `/api/consulta/v1`")
    rep.append(f"- Anos PCA: {b.get('anos_pca')} · Rota PCA: {b.get('rota', 'n/d')}")
    rep.append(f"- Fonte dos editais: {fonte_editais}")
    rep.append(f"- **n**: itens-PCA célula = **{n_pca}** · editais célula = **{n_ed}** · "
               f"contratos célula = **{len(contratos)}**\n")
    rep.append("## Gates\n")
    rep.append("| Gate | Métrica | Valor | Piso | Status |")
    rep.append("|---|---|---|---|---|")
    rep.append(f"| G1 granularidade | itens-PCA com 4 campos | "
               f"{g1_ok}/{n_pca}" + (f" ({g1_pct}%)" if g1_pct is not None else "") +
               f" | ≥{PISO['G1']}% | {status(g1_pct, PISO['G1'])} |")
    rep.append(f"| G2 conversão PCA→edital | itens-PCA com edital casado | "
               f"{len(convertidos)}/{n_pca}" + (f" ({g2_pct}%)" if g2_pct is not None else "") +
               f" | ≥{PISO['G2']}% | {status(g2_pct, PISO['G2'])} |")
    rep.append(f"| G3 dossiê (escopo PNCP) | campos PNCP preenchíveis | "
               f"{g3_ok}/{g3_total}" + (f" ({g3_pct}%)" if g3_pct is not None else "") +
               f" | >{PISO['G3']}% | {status(g3_pct, PISO['G3'])} |")
    rep.append(f"| G4 matching | precisão/recall vs gold set | "
               f"PENDENTE (rotulagem humana cega) | >{PISO['G4']}% | ⏸️ |")
    rep.append("")
    rep.append("## Informacionais\n")
    rep.append(f"- **Lead-time de sinal** (pub-PCA → pub-edital), mediano: "
               f"{lead_sinal_mediano if lead_sinal_mediano is not None else 's/ par'} dias "
               f"— *a antecedência que vende*.")
    rep.append("- **Horizonte de planejamento** (dataDesejada → edital): exige par casado com "
               "dataDesejada preenchida; ver `f0_pares_pca_edital.csv`.")
    rep.append(f"- Pares PCA→edital casados: **{len(pares)}** · confiança média do casamento: "
               f"**{conf_media}** (ver CSV para spot-check).")
    rep.append("")
    rep.append("## G3 — campos do Dossiê\n")
    rep.append("**Deriváveis do PNCP (contam no gate):**")
    for k, v in g3_derivaveis.items():
        rep.append(f"- {'🟢' if v else '🔴'} `{k}` — {DOSSIE_PNCP[k]}")
    rep.append("\n**Pendente de enriquecimento (fora do F0 — NÃO contam como falha):**")
    for k, v in DOSSIE_NAO_PNCP.items():
        rep.append(f"- ⏳ `{k}` — {v}")
    rep.append("")
    rep.append("## G4 — nota de método\n")
    rep.append("Gold set gerado em `f0_gold_set.csv` com a coluna CATSER **oculta até a "
               "rotulagem**. A rotulagem deve ser feita por leitura do objeto (cego ao código); "
               "só então se mede a concordância da classificação por CATSER. Auto-certificar "
               "80% sem rotulagem humana seria vazamento — por isso G4 fica **PENDENTE**.")
    rep.append("")
    rep.append(f"## Veredito preliminar (matriz §2)\n\n**Cenário {cenario}**\n")
    if c_ed.get("parcial") or b.get("parcial"):
        rep.append("> ⚠️ Atenção: B e/ou C estão marcados como **parciais** (varredura "
                   "interrompida). Veredito sujeito a revisão ao completar a coleta.")
    if b.get("falhas") or c_ed.get("falhas"):
        rep.append(f"> ⚠️ Janelas falhadas — B: {len(b.get('falhas', []))}, "
                   f"C: {len(c_ed.get('falhas', []))} (ver JSONs).")

    with open(OUT_REPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(rep) + "\n")

    print("Etapa D concluída.")
    print(f"  G1={g1_pct}% G2={g2_pct}% G3={g3_pct}% G4=PENDENTE | n_pca={n_pca} n_ed={n_ed}")
    print(f"  Cenário: {cenario}")
    print(f"  Saídas: {OUT_DS}, {OUT_PAIRS}, {OUT_GOLD}, {OUT_REPORT}")


if __name__ == "__main__":
    main()
