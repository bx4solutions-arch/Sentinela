#!/usr/bin/env python3
"""
Escopo de coleta = CÉLULAS ATIVAS (setor × região). Fonte da verdade: `cidade_coletada`
(status='pronta'), onde cada linha é uma UNIDADE DE COLETA:
  - nivel='municipio' → uma cidade (codigo_ibge), restrita a segmentos[]
  - nivel='estado'    → uma UF inteira (uf), restrita a segmentos[]
  - segmentos vazio   → TODOS os segmentos daquela região (legado/região-only)

A guarda de ingestão é 2D: REGIÃO (ibge/uf) E SEGMENTO. Sem unidade ativa → nada coleta
(o servidor nasce vazio). Toda gravação em raw_editais/raw_pca/orgao atravessa `Escopo`.

Stdlib apenas (urllib). Lê o REST do Supabase com a service-role key.
"""
import json
import sys
import urllib.request


def carregar_unidades(rest, key):
    """Lê `cidade_coletada` status='pronta' → lista de unidades de coleta (cidade ou estado).

    Lista VAZIA se não houver célula ativa — é o que faz o servidor nascer vazio.
    """
    # 'pronta' = já coletada (delta diário); 'pendente' = recém-registrada (faz backfill).
    url = (f"{rest}/cidade_coletada"
           f"?status=in.(pronta,pendente)&select=nivel,codigo_ibge,municipio,uf,segmentos,status")
    req = urllib.request.Request(url, headers={
        "apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        sys.exit(f"ERRO: não consegui ler cidade_coletada (escopo de células): {e}")


def promover_pendentes(rest, key):
    """Marca unidades 'pendente' como 'pronta' (após a 1ª coleta de backfill).

    Não-fatal: se falhar, a coleta já ocorreu; só o status não virou (re-tenta no próximo run).
    """
    url = f"{rest}/cidade_coletada?status=eq.pendente"
    body = json.dumps({"status": "pronta"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json", "Prefer": "return=minimal"})
    try:
        urllib.request.urlopen(req, timeout=60)
    except Exception as e:
        print(f"aviso: não consegui promover pendentes→pronta: {e}", file=sys.stderr)


class Escopo:
    """Guarda 2D (região × segmento) resolvida a partir das unidades ativas.

    `segs` por região é um set de segmentos, ou None = "todos" (absorvente: se qualquer
    unidade daquela região pede todos, a região coleta todos).
    """

    def __init__(self, unidades):
        self.seg_por_ibge = {}   # ibge -> set|None
        self.seg_por_uf = {}     # uf   -> set|None
        self.seg_por_nome = {}   # municipio -> set|None  (fallback p/ linhas sem ibge)
        for u in unidades or []:
            segs = set(u.get("segmentos") or [])
            valor = None if not segs else segs       # vazio = todos = None
            if u.get("nivel") == "estado" and u.get("uf"):
                self._add(self.seg_por_uf, u["uf"], valor)
            elif u.get("codigo_ibge"):
                self._add(self.seg_por_ibge, str(u["codigo_ibge"]), valor)
                if u.get("municipio"):
                    self._add(self.seg_por_nome, u["municipio"], valor)

    @staticmethod
    def _add(m, k, segs):
        if k not in m:
            m[k] = segs
        elif m[k] is None or segs is None:
            m[k] = None                       # qualquer "todos" absorve
        else:
            m[k] = m[k] | segs

    @property
    def ibge_set(self):
        return set(self.seg_por_ibge)

    @property
    def uf_set(self):
        return set(self.seg_por_uf)

    @property
    def nomes_set(self):
        return set(self.seg_por_nome)

    def _segs_regiao(self, ibge, uf, nome):
        """Segmentos ativos da região (set | None=todos), ou ('fora') se região não monitorada."""
        ib = str(ibge or "")
        if ib and ib in self.seg_por_ibge:
            return self.seg_por_ibge[ib]
        if uf and uf in self.seg_por_uf:
            return self.seg_por_uf[uf]
        if nome and nome in self.seg_por_nome:
            return self.seg_por_nome[nome]
        return "fora"

    def em_regiao(self, ibge=None, uf=None, nome=None):
        """Só a dimensão de REGIÃO (sem segmento) — p/ tabelas sem segmento, ex.: orgao."""
        return self._segs_regiao(ibge, uf, nome) != "fora"

    def aceita(self, ibge=None, uf=None, segmentos_edital=None, nome=None):
        """True se está no escopo: região ativa E segmento casado (None/vazio = todos)."""
        segs = self._segs_regiao(ibge, uf, nome)
        if segs == "fora":
            return False
        if segs is None:                      # região coleta todos os segmentos
            return True
        return bool(set(segmentos_edital or []) & segs)


if __name__ == "__main__":
    # Autoteste: imprime o escopo ativo e prova a guarda 2D (não grava nada).
    from pathlib import Path
    ROOT = Path(__file__).resolve().parents[2]
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    rest = (env.get("SUPABASE_REST_URL")
            or env.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1").rstrip("/")
    unidades = carregar_unidades(rest, env["SUPABASE_SERVICE_ROLE_KEY"])
    esc = Escopo(unidades)
    print(f"Unidades ativas: {len(unidades)}")
    for u in unidades:
        regiao = u.get("municipio") or u.get("uf")
        segs = u.get("segmentos") or "(todos)"
        print(f"  - [{u.get('nivel')}] {regiao} ({u.get('uf')}) segmentos={segs}")
    # prova: SP (cidade ativa, segmentos vazio=todos) aceita; Rio (fora) rejeita
    print("\nGuarda 2D:")
    print(f"  SP/pragas  -> {esc.aceita(ibge='3550308', segmentos_edital=['controle-de-pragas'])} (esperado True se SP ativa)")
    print(f"  Rio/pragas -> {esc.aceita(ibge='3304557', segmentos_edital=['controle-de-pragas'])} (esperado False)")
