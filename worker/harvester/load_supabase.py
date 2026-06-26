#!/usr/bin/env python3
"""
Loader idempotente: carrega worker/harvester/pncp_data/*.jsonl no Supabase (staging cru).

- upsert por PK (cnpj / numero_controle_pncp / _id) → re-rodar não duplica.
- enriquece `orgao` com poder/esfera/uf/ibge a partir do 1º edital de cada CNPJ.
- carrega em lotes via PostgREST com Prefer: resolution=merge-duplicates.

Uso: python3 worker/harvester/load_supabase.py
Lê credenciais de .env.local (SUPABASE_URL/SUPABASE_REST_URL + SUPABASE_SERVICE_ROLE_KEY).
"""
import json
import os
import sys
import time
from pathlib import Path

import requests

import scope as escopo  # guarda de células ativas (mesmo diretório)

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "worker" / "harvester" / "pncp_data"
BATCH = 1000


def load_env():
    env = {}
    envf = ROOT / ".env.local"
    if envf.exists():
        for line in envf.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    base = env.get("SUPABASE_REST_URL") or (
        (env.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1") if env.get("SUPABASE_URL") else ""
    )
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not base or not key:
        sys.exit("ERRO: defina SUPABASE_URL (ou SUPABASE_REST_URL) e SUPABASE_SERVICE_ROLE_KEY em .env.local")
    return base.rstrip("/"), key


def iter_jsonl(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def date_only(v):
    return v[:10] if isinstance(v, str) and v else None


def upsert(base, key, table, rows, on_conflict):
    if not rows:
        return 0
    url = f"{base}/{table}?on_conflict={on_conflict}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    sent = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        for attempt in range(4):
            r = requests.post(url, headers=headers, data=json.dumps(chunk), timeout=120)
            if r.status_code < 300:
                break
            if attempt == 3:
                sys.exit(f"ERRO {table} lote {i}: HTTP {r.status_code} {r.text[:400]}")
            time.sleep(2 * (attempt + 1))
        sent += len(chunk)
        print(f"  {table}: {sent}/{len(rows)}", flush=True)
    return sent


def main():
    base, key = load_env()

    # ESCOPO = células ativas (cidade_coletada status='pronta'). Sem célula → nada entra.
    unidades = escopo.carregar_unidades(base, key)
    if not unidades:
        sys.exit("Nenhuma célula ativa (cidade_coletada status='pronta'). Nada a carregar.")
    esc = escopo.Escopo(unidades)
    print(f"Escopo ativo: {len(unidades)} unidade(s) — só região×segmento dentro do escopo será gravado.")

    # --- orgao: base do _orgaos.json, enriquecido pelo 1º edital de cada cnpj ---
    orgaos = json.loads((DATA / "_orgaos.json").read_text())
    enrich = {}
    for e in iter_jsonl(DATA / "editais.jsonl"):
        oe = e.get("orgaoEntidade") or {}
        uo = e.get("unidadeOrgao") or {}
        c = oe.get("cnpj")
        if c and c not in enrich:
            enrich[c] = {
                "poder_id": oe.get("poderId"),
                "esfera_id": oe.get("esferaId"),
                "uf_sigla": uo.get("ufSigla"),
                "codigo_ibge": uo.get("codigoIbge"),
            }
    orgao_rows = []
    for cnpj, o in orgaos.items():
        ex = enrich.get(cnpj, {})
        orgao_rows.append({
            "cnpj": cnpj,
            "razao_social": o.get("razaoSocial"),
            "cidade": o.get("cidade"),
            "unidades": o.get("unidades"),
            "n_editais": o.get("n_editais"),
            "poder_id": ex.get("poder_id"),
            "esfera_id": ex.get("esfera_id"),
            "uf_sigla": ex.get("uf_sigla"),
            "codigo_ibge": ex.get("codigo_ibge"),
        })
    # orgao não tem segmento → guarda só por REGIÃO
    n0 = len(orgao_rows)
    orgao_rows = [o for o in orgao_rows
                  if esc.em_regiao(ibge=o.get("codigo_ibge"), uf=o.get("uf_sigla"), nome=o.get("cidade"))]
    print(f"orgao: {len(orgao_rows)} linhas no escopo ({n0 - len(orgao_rows)} fora-de-escopo rejeitadas)")
    upsert(base, key, "orgao", orgao_rows, "cnpj")

    # --- raw_editais ---
    ed_rows = []
    for e in iter_jsonl(DATA / "editais.jsonl"):
        oe = e.get("orgaoEntidade") or {}
        ed_rows.append({
            "numero_controle_pncp": e.get("numeroControlePNCP"),
            "cnpj_orgao": oe.get("cnpj"),
            "cidade": e.get("_cidade"),
            "segmentos": e.get("_segmentos") or [],
            "objeto": e.get("objetoCompra"),
            "modalidade_id": e.get("modalidadeId"),
            "modalidade_nome": e.get("modalidadeNome"),
            "situacao_nome": e.get("situacaoCompraNome"),
            "valor_estimado": e.get("valorTotalEstimado"),
            "valor_homologado": e.get("valorTotalHomologado"),
            "data_publicacao": e.get("dataPublicacaoPncp"),
            "data_abertura_proposta": e.get("dataAberturaProposta"),
            "data_encerramento": e.get("dataEncerramentoProposta"),
            "link_origem": e.get("linkSistemaOrigem"),
            "payload": e,
        })
    # raw_editais: guarda 2D região×segmento (ibge/uf do payload, segmentos classificados)
    n0 = len(ed_rows)
    ed_rows = [r for r in ed_rows if esc.aceita(
        ibge=(r.get("payload", {}).get("unidadeOrgao") or {}).get("codigoIbge"),
        uf=(r.get("payload", {}).get("unidadeOrgao") or {}).get("ufSigla"),
        nome=r.get("cidade"),
        segmentos_edital=r.get("segmentos"))]
    print(f"raw_editais: {len(ed_rows)} linhas no escopo ({n0 - len(ed_rows)} fora-de-escopo rejeitadas)")
    upsert(base, key, "raw_editais", ed_rows, "numero_controle_pncp")

    # --- raw_pca ---
    pca_rows = []
    for p in iter_jsonl(DATA / "pca.jsonl"):
        classe = p.get("classe")
        pca_rows.append({
            "id": p.get("_id"),
            "cnpj_orgao": p.get("cnpjOrgao"),
            "cidade": p.get("_cidade"),
            "segmentos": p.get("_segmentos") or [],
            "classe": str(classe) if classe is not None else None,
            "descricao_item": p.get("descricaoItem"),
            "valor_total": p.get("valorTotal"),
            "ano_pca": p.get("anoPca"),
            "data_publicacao": date_only(p.get("dataPublicacaoPNCP")),
            "data_desejada": date_only(p.get("dataDesejada")),
            "payload": p,
        })
    # raw_pca não tem ibge/uf na linha → guarda por nome da cidade × segmento
    n0 = len(pca_rows)
    pca_rows = [r for r in pca_rows if esc.aceita(nome=r.get("cidade"), segmentos_edital=r.get("segmentos"))]
    print(f"raw_pca: {len(pca_rows)} linhas no escopo ({n0 - len(pca_rows)} fora-de-escopo rejeitadas)")
    upsert(base, key, "raw_pca", pca_rows, "id")

    print("OK — ingestão concluída.")


if __name__ == "__main__":
    main()
