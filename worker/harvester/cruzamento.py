#!/usr/bin/env python3
"""
Cruzamento por órgão+objeto — responde "quais dados são válidos e a partir de qual etapa".

Âncora = EDITAL (cada edital com segmento vira uma oportunidade). Para cada um marca
quais ETAPAS existem ao redor:
  PCA       — há item de PCA do MESMO cnpjOrgao com segmento sobreposto?
              pca_antes = a publicação do PCA é ANTERIOR à do edital (antecipação real).
  EDITAL    — sempre presente (é a âncora).
  ATA       — alguma ata com numeroControlePNCPCompra == numeroControlePNCP do edital.
  CONTRATO  — algum contrato com numeroControlePncpCompra == numeroControlePNCP do edital.

Entrada:  pncp_data/{editais,pca,atas,contratos}.jsonl
Saídas:   ../../lib/real-data.json        (consumido pelo dashboard)
          pncp_data/_cruzamento_resumo.json (espelho p/ auditoria)

Stdlib apenas. Idempotente: pode rodar quantas vezes quiser conforme o harvest cresce.
"""
import json, os, sys, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "pncp_data")
OUT_APP = os.path.normpath(os.path.join(HERE, "..", "..", "lib", "real-data.json"))
OUT_RESUMO = os.path.join(DATA, "_cruzamento_resumo.json")


def read_jsonl(name):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        return []
    out = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    out.append(json.loads(line))
                except Exception:
                    pass
    return out


def d10(s):
    """Primeiros 10 chars como date (YYYY-MM-DD). Tolera ISO com hora ou None."""
    if not s:
        return None
    try:
        return dt.date.fromisoformat(str(s)[:10])
    except Exception:
        return None


def main():
    editais = read_jsonl("editais.jsonl")
    pca = read_jsonl("pca.jsonl")
    atas = read_jsonl("atas.jsonl")
    contratos = read_jsonl("contratos.jsonl")

    # Índices de linkagem
    atas_por_compra = {}
    for a in atas:
        k = a.get("numeroControlePNCPCompra")
        if k:
            atas_por_compra.setdefault(k, []).append(a)
    contr_por_compra = {}
    for c in contratos:
        k = c.get("numeroControlePncpCompra") or c.get("numeroControlePNCPCompra")
        if k:
            contr_por_compra.setdefault(k, []).append(c)
    # PCA indexado por cnpjOrgao → [(segmentos, data)]
    pca_por_orgao = {}
    for p in pca:
        cnpj = p.get("cnpjOrgao")
        if cnpj:
            pca_por_orgao.setdefault(cnpj, []).append(
                (set(p.get("_segmentos") or []), d10(p.get("dataPublicacaoPNCP"))))

    oportunidades = []
    # agreg[(cidade,segmento)] = contadores
    agreg = {}

    for e in editais:
        segs = e.get("_segmentos") or []
        if not segs:
            continue  # só oportunidades de segmento viram card; volume total fica em totais
        ncp = e.get("numeroControlePNCP")
        oe = e.get("orgaoEntidade") or {}
        uo = e.get("unidadeOrgao") or {}
        cnpj = oe.get("cnpj")
        d_edital = d10(e.get("dataPublicacaoPncp") or e.get("dataPublicacaoPNCP"))

        # PCA do mesmo órgão com segmento sobreposto
        tem_pca = False
        pca_antes = False
        pca_data_antes = None
        for seg_set, pdata in pca_por_orgao.get(cnpj, []):
            if seg_set & set(segs):
                tem_pca = True
                if pdata and d_edital and pdata <= d_edital:
                    pca_antes = True
                    if pca_data_antes is None or pdata < pca_data_antes:
                        pca_data_antes = pdata

        la = atas_por_compra.get(ncp, [])
        lc = contr_por_compra.get(ncp, [])
        etapas = {
            "pca": tem_pca,
            "pca_antes": pca_antes,
            "edital": True,
            "ata": len(la) > 0,
            "contrato": len(lc) > 0,
        }
        op = {
            "id": ncp,
            "cidade": e.get("_cidade"),
            "segmentos": segs,
            "orgao": oe.get("razaoSocial"),
            "cnpjOrgao": cnpj,
            "unidade": uo.get("nomeUnidade"),
            "codigoUnidadeAdministrativa": uo.get("codigoUnidade"),
            "objeto": (e.get("objetoCompra") or "")[:240],
            "valor": e.get("valorTotalEstimado"),
            "modalidade": e.get("modalidadeNome"),
            "data_edital": str(d_edital) if d_edital else None,
            "pca_data": str(pca_data_antes) if pca_data_antes else None,
            "n_atas": len(la),
            "n_contratos": len(lc),
            "etapas": etapas,
        }
        oportunidades.append(op)

        for seg in segs:
            a = agreg.setdefault((e.get("_cidade"), seg),
                                 {"n": 0, "pca": 0, "pca_antes": 0, "com_ata": 0,
                                  "com_contrato": 0, "valor_total": 0.0})
            a["n"] += 1
            a["pca"] += int(tem_pca)
            a["pca_antes"] += int(pca_antes)
            a["com_ata"] += int(etapas["ata"])
            a["com_contrato"] += int(etapas["contrato"])
            try:
                a["valor_total"] += float(e.get("valorTotalEstimado") or 0)
            except Exception:
                pass

    por_cidade_segmento = [
        {"cidade": cid, "segmento": seg, **v}
        for (cid, seg), v in sorted(agreg.items(), key=lambda kv: (kv[0][0] or "", kv[0][1]))
    ]

    # ordena oportunidades: mais "quentes" primeiro (mais etapas presentes, pca_antes no topo)
    def score(o):
        et = o["etapas"]
        return (et["pca_antes"], et["contrato"], et["ata"], et["pca"])
    oportunidades.sort(key=score, reverse=True)

    meta = {}
    mp = os.path.join(DATA, "_meta.json")
    if os.path.exists(mp):
        meta = json.load(open(mp))

    totais = {
        "editais": len(editais),
        "editais_com_segmento": len(oportunidades),
        "pca_itens": len(pca),
        "atas": len(atas),
        "contratos": len(contratos),
        "oportunidades": len(oportunidades),
        "com_pca": sum(1 for o in oportunidades if o["etapas"]["pca"]),
        "pca_antes_do_edital": sum(1 for o in oportunidades if o["etapas"]["pca_antes"]),
        "com_ata": sum(1 for o in oportunidades if o["etapas"]["ata"]),
        "com_contrato": sum(1 for o in oportunidades if o["etapas"]["contrato"]),
    }

    payload = {
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "fonte": "PNCP Consulta API (/api/consulta/v1) — coleta local, sem live no app",
        "config": {k: meta.get(k) for k in ("municipios", "data_inicial", "data_final",
                                            "segmentos", "n_fatias_concluidas", "concluido")},
        "totais": totais,
        "por_cidade_segmento": por_cidade_segmento,
        "oportunidades": oportunidades,
    }

    os.makedirs(os.path.dirname(OUT_APP), exist_ok=True)
    json.dump(payload, open(OUT_APP, "w"), ensure_ascii=False, indent=2)
    json.dump(payload, open(OUT_RESUMO, "w"), ensure_ascii=False, indent=2)

    print("== CRUZAMENTO ==")
    print(json.dumps(totais, ensure_ascii=False, indent=2))
    print(f"\npor cidade × segmento ({len(por_cidade_segmento)} células):")
    for r in por_cidade_segmento:
        print(f"  {r['cidade']:<12} {r['segmento']:<24} n={r['n']:<4} "
              f"PCA={r['pca']:<3} PCA-antes={r['pca_antes']:<3} ata={r['com_ata']:<3} contrato={r['com_contrato']}")
    print(f"\n→ app: {OUT_APP}")
    print(f"→ resumo: {OUT_RESUMO}")


if __name__ == "__main__":
    main()
