#!/usr/bin/env python3
"""
PNCP Harvester — coleta as ETAPAS (não só o edital) sem quebrar.

Quatro endpoints da Consulta API (/api/consulta/v1), mesmo padrão em todos:
  fatiar (chave natural × janela de data) → paginar → retry/backoff → checkpoint → gravar.

  1) contratacoes/publicacao  (EDITAL)    — filtro server-side codigoMunicipioIbge ✔ (âncora da cidade)
  2) pca                      (PCA)        — filtro por codigoClassificacaoSuperior (classe CATSER/CATMAT);
                                             SEM filtro de município → filtra cnpj da cidade client-side
  3) atas                     (ATA)        — filtro server-side cnpj=<cnpjOrgao> ✔ (param 'cnpj')
  4) contratos                (CONTRATO)   — filtro server-side cnpjOrgao=<cnpjOrgao> ✔

Linkagem entre etapas (resolvida no cruzamento.py, não aqui):
  atas.numeroControlePNCPCompra  == edital.numeroControlePNCP   → "tem ata"
  contratos.numeroControlePncpCompra == edital.numeroControlePNCP → "tem contrato"
  PCA ↔ edital por (cnpjOrgao + segmento) e data (PCA antes do edital = antecipação real)

O app NUNCA consulta o PNCP ao vivo; consulta o JSONL que isto gera.
Stdlib apenas (urllib). Só leitura. Resiliente a kill (checkpoint por fatia).

Uso:
  python3 pncp_harvester.py            # roda o CONFIG abaixo (2 cidades, 12m, 4 etapas)
Saídas em ./pncp_data/:
  editais.jsonl  pca.jsonl  atas.jsonl  contratos.jsonl   (append, dedupe por id natural)
  _checkpoint.json   — fatias concluídas (retoma de onde parou)
  _failures.jsonl    — fatias que falharam após todos os retries (re-rodar depois)
  _orgaos.json       — cnpjOrgao→unidades da cidade, descobertos nos editais (insumo de atas/contratos)
  _meta.json         — config + contagens correntes (consumido pelo relatório)
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error, datetime as dt

BASE = "https://pncp.gov.br/api/consulta/v1"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pncp_data")
UA = "Sentinela/1.0 (pesquisa institucional; contato bionicaosilva@gmail.com)"

# ---------------- CONFIG ----------------
MUNICIPIOS = {"São Paulo": "3550308", "Teresina": "2211001"}     # IBGE
DATA_INICIAL = "20250619"                                        # yyyyMMdd (12 meses)
DATA_FINAL   = "20260619"
JANELA_DIAS  = 90                                               # fatia temporal dos editais (<=364)
TAM_PAGINA   = 50                                              # editais/pca
TAM_PAGINA_AC = 100                                           # atas/contratos (min 10; 100 é eficiente)

# TODAS as modalidades (enum oficial 1..14). Algumas devolvem 204 (sem dado) — normal.
MODALIDADES = {1:"Leilão-Eletrônico", 2:"Diálogo-Competitivo", 3:"Concurso",
               4:"Concorrência-Eletrônica", 5:"Concorrência-Presencial",
               6:"Pregão-Eletrônico", 7:"Pregão-Presencial", 8:"Dispensa",
               9:"Inexigibilidade", 10:"Manifestação-Interesse", 11:"Pré-qualificação",
               12:"Credenciamento", 13:"Leilão-Presencial", 14:"Inaplicabilidade"}

# Segmentos (keyword em objeto, minúsculo):
SEGMENTOS = {
  "controle-de-pragas": ["praga","dedetiz","desinsetiz","desratiz","descupiniz",
                          "controle de vetor","sanitiz","imuniz","desinfec","exterm"],
  "material-hospitalar": ["hospitalar","médico-hospitalar","material médico","correlato",
                          "seringa","luva ","gaze","cateter","curativo","equipo","insumo",
                          "medicamento","odontolog","laboratorial"],
  "material-de-expediente": ["expediente","escritório","papel a4","caneta","toner","cartucho",
                             "grampeador","material de consumo","suprimento","almoxarifado"],
}

# Classes (codigoClassificacaoSuperior) por segmento p/ varrer o PCA (recall);
# a precisão vem do filtro por keyword no item (mesma régua dos editais).
PCA_CLASSES = {
  "controle-de-pragas": [8531],                                  # Serviço de Desinfecção e Exterminação (validado Etapa B)
  "material-hospitalar": [6505,6510,6515,6520,6525,6530,6532,6540,6545,6550,6640],
  "material-de-expediente": [7510,7520,7530,7490,7045,7110],
}
ANOS_PCA = [2025, 2026]
MAX_RETRIES = 6
MAX_PAGES_PCA = 400      # teto por classe/ano (algumas classes nacionais são enormes)
# ----------------------------------------


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def janelas(ini, fim, dias):
    d0 = dt.datetime.strptime(ini, "%Y%m%d"); d1 = dt.datetime.strptime(fim, "%Y%m%d")
    cur = d0
    while cur <= d1:
        nxt = min(cur + dt.timedelta(days=dias-1), d1)
        yield cur.strftime("%Y%m%d"), nxt.strftime("%Y%m%d")
        cur = nxt + dt.timedelta(days=1)


def get(path, params):
    """GET com backoff exponencial. 204/404 = vazio legítimo (não-erro). 422 = parâmetro inválido (levanta)."""
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}{path}?{qs}"
    last = None
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=90) as r:
                body = r.read().decode("utf-8")
                if r.status == 204 or not body.strip():
                    return None
                return json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (204, 404):
                return None
            if e.code == 422:
                raise RuntimeError(f"HTTP 422 (parâmetro inválido): {url}") from e
            last = e
        except Exception as e:  # timeout/reset transitório → retry
            last = e
        time.sleep(min(60, 1.5 * (2 ** attempt)))
    raise RuntimeError(f"GET falhou após {MAX_RETRIES} tentativas: {url} :: {last}")


def paginate(path, base_params, page_size, max_pages, pause=0.5):
    """Itera páginas de um endpoint com envelope {data,totalPaginas,...}. Yield item a item."""
    page = 1
    while page <= max_pages:
        d = get(path, dict(base_params, pagina=page, tamanhoPagina=page_size))
        if not d:
            return
        items = d.get("data") if isinstance(d, dict) else d
        if not items:
            return
        for it in items:
            yield it
        tp = d.get("totalPaginas") if isinstance(d, dict) else None
        if tp is not None and page >= tp:
            return
        page += 1
        time.sleep(pause)


def seg_de(texto):
    t = (texto or "").lower()
    return [s for s, kws in SEGMENTOS.items() if any(k in t for k in kws)]


class Sink:
    """Arquivos de saída + checkpoint + dedupe, com flush incremental."""
    def __init__(self):
        os.makedirs(OUT, exist_ok=True)
        self.ck_path = os.path.join(OUT, "_checkpoint.json")
        self.done = set(json.load(open(self.ck_path))) if os.path.exists(self.ck_path) else set()
        self.f = {k: open(os.path.join(OUT, f"{k}.jsonl"), "a", encoding="utf-8")
                  for k in ("editais", "pca", "atas", "contratos")}
        self.fail = open(os.path.join(OUT, "_failures.jsonl"), "a", encoding="utf-8")
        self.seen = {k: set() for k in self.f}     # dedupe in-memory por id natural
        self.count = {k: 0 for k in self.f}
        # pré-carrega ids já gravados p/ dedupe entre execuções
        for k in self.f:
            p = os.path.join(OUT, f"{k}.jsonl")
            if os.path.exists(p):
                with open(p, encoding="utf-8") as fr:
                    for line in fr:
                        try:
                            self.seen[k].add(self._id(k, json.loads(line)))
                        except Exception:
                            pass
                self.count[k] = len(self.seen[k])

    @staticmethod
    def _id(kind, it):
        if kind == "editais":   return it.get("numeroControlePNCP")
        if kind == "pca":       return it.get("_id")
        if kind == "atas":      return it.get("numeroControlePNCPAta")
        if kind == "contratos": return it.get("numeroControlePNCP")
        return None

    def write(self, kind, it):
        i = self._id(kind, it)
        if i is None or i in self.seen[kind]:
            return False
        self.seen[kind].add(i)
        self.f[kind].write(json.dumps(it, ensure_ascii=False) + "\n")
        self.count[kind] += 1
        return True

    def slice_done(self, key):
        self.done.add(key)
        json.dump(sorted(self.done), open(self.ck_path, "w"))
        for f in self.f.values():
            f.flush()

    def slice_failed(self, key, err):
        self.fail.write(json.dumps({"slice": key, "erro": str(err)[:200]}) + "\n")
        self.fail.flush()

    def meta(self, extra=None):
        m = {"municipios": MUNICIPIOS, "data_inicial": DATA_INICIAL, "data_final": DATA_FINAL,
             "janela_dias": JANELA_DIAS, "modalidades": list(MODALIDADES),
             "segmentos": list(SEGMENTOS), "pca_classes": PCA_CLASSES,
             "counts": self.count, "n_fatias_concluidas": len(self.done)}
        if extra: m.update(extra)
        json.dump(m, open(os.path.join(OUT, "_meta.json"), "w"), ensure_ascii=False, indent=2)


def harvest_editais(sink, orgaos):
    """Fase 1: editais por cidade × modalidade × janela (município server-side). Descobre os órgãos."""
    for nome, mun in MUNICIPIOS.items():
        for modal, mnome in MODALIDADES.items():
            for d_ini, d_fim in janelas(DATA_INICIAL, DATA_FINAL, JANELA_DIAS):
                key = f"editais|{mun}|{modal}|{d_ini}"
                if key in sink.done:
                    continue
                base = {"dataInicial": d_ini, "dataFinal": d_fim,
                        "codigoModalidadeContratacao": modal, "codigoMunicipioIbge": mun}
                try:
                    n = 0
                    for it in paginate("/contratacoes/publicacao", base, TAM_PAGINA, max_pages=300):
                        it["_cidade"] = nome
                        it["_segmentos"] = seg_de(it.get("objetoCompra"))
                        oe = it.get("orgaoEntidade") or {}; uo = it.get("unidadeOrgao") or {}
                        cnpj = oe.get("cnpj")
                        if cnpj:
                            o = orgaos.setdefault(cnpj, {"cidade": nome, "razaoSocial": oe.get("razaoSocial"),
                                                          "unidades": {}, "n_editais": 0})
                            o["n_editais"] += 1
                            cu = uo.get("codigoUnidade")
                            if cu: o["unidades"][cu] = uo.get("nomeUnidade")
                        if sink.write("editais", it):
                            n += 1
                except Exception as e:
                    sink.slice_failed(key, e); log(f"[FALHA] {key} :: {e}"); continue
                sink.slice_done(key)
                log(f"[OK] editais {nome} {mnome} {d_ini}-{d_fim}: +{n} (tot editais {sink.count['editais']})")
                json.dump(orgaos, open(os.path.join(OUT, "_orgaos.json"), "w"), ensure_ascii=False, indent=2)
                sink.meta(); time.sleep(0.3)


def harvest_pca(sink):
    """Fase 2a: PCA por classe × ano (nacional), filtra cnpj da cidade client-side, tagueia segmento por keyword."""
    op = os.path.join(OUT, "_orgaos.json")
    orgaos = json.load(open(op)) if os.path.exists(op) else {}
    cidade_de = {c: o["cidade"] for c, o in orgaos.items()}
    cnpjs_cidade = set(cidade_de)
    log(f"PCA: {len(cnpjs_cidade)} CNPJs-órgão da cidade p/ filtro client-side")
    for seg, classes in PCA_CLASSES.items():
        for code in classes:
            for ano in ANOS_PCA:
                key = f"pca|{seg}|{code}|{ano}"
                if key in sink.done:
                    continue
                base = {"anoPca": ano, "codigoClassificacaoSuperior": code}
                try:
                    n = 0
                    for rec in paginate("/pca/", base, page_size=10, max_pages=MAX_PAGES_PCA, pause=0.6):
                        cnpj = rec.get("orgaoEntidadeCnpj")
                        if cnpj not in cnpjs_cidade:
                            continue
                        for it in (rec.get("itens") or []):
                            desc = it.get("descricaoItem") or it.get("descricao")
                            segs = seg_de(desc)
                            if seg not in segs:
                                segs = segs + [seg]      # garante o segmento da classe varrida
                            row = {
                                "_id": f"{rec.get('idPcaPncp')}|{it.get('numeroItem') or it.get('codigoItem') or desc}",
                                "_cidade": cidade_de.get(cnpj),
                                "_segmentos": segs,
                                "cnpjOrgao": cnpj,
                                "razaoSocialOrgao": rec.get("orgaoEntidadeRazaoSocial"),
                                "codigoUnidade": rec.get("codigoUnidade"),
                                "nomeUnidade": rec.get("nomeUnidade"),
                                "anoPca": ano,
                                "classe": code,
                                "dataPublicacaoPNCP": rec.get("dataPublicacaoPNCP"),
                                "descricaoItem": desc,
                                "valorTotal": it.get("valorTotal"),
                                "dataDesejada": it.get("dataDesejada"),
                            }
                            sink.write("pca", row); n += 1
                except Exception as e:
                    sink.slice_failed(key, e); log(f"[FALHA] {key} :: {e}"); continue
                sink.slice_done(key)
                log(f"[OK] pca {seg} classe {code}/{ano}: +{n} itens-célula (tot pca {sink.count['pca']})")
                sink.meta(); time.sleep(0.3)


def harvest_atas_contratos(sink):
    """Fase 2b: atas (cnpj=) e contratos (cnpjOrgao=) por órgão da cidade × janela 364d."""
    op = os.path.join(OUT, "_orgaos.json")
    orgaos = json.load(open(op)) if os.path.exists(op) else {}
    cidade_de = {c: o["cidade"] for c, o in orgaos.items()}
    for kind, path, filtro in [("atas", "/atas", "cnpj"), ("contratos", "/contratos", "cnpjOrgao")]:
        for cnpj, o in orgaos.items():
            for d_ini, d_fim in janelas(DATA_INICIAL, DATA_FINAL, 364):
                key = f"{kind}|{cnpj}|{d_ini}"
                if key in sink.done:
                    continue
                base = {"dataInicial": d_ini, "dataFinal": d_fim, filtro: cnpj}
                try:
                    n = 0
                    for it in paginate(path, base, TAM_PAGINA_AC, max_pages=200):
                        it["_cidade"] = cidade_de.get(cnpj)
                        obj = it.get("objetoContratacao") or it.get("objetoContrato")
                        it["_segmentos"] = seg_de(obj)
                        if sink.write(kind, it):
                            n += 1
                except Exception as e:
                    sink.slice_failed(key, e); log(f"[FALHA] {key} :: {e}"); continue
                sink.slice_done(key)
                if n:
                    log(f"[OK] {kind} {o.get('cidade')} {cnpj} {d_ini}: +{n} (tot {kind} {sink.count[kind]})")
                sink.meta(); time.sleep(0.2)


def main():
    sink = Sink()
    op = os.path.join(OUT, "_orgaos.json")
    orgaos = json.load(open(op)) if os.path.exists(op) else {}
    log("=== FASE 1: EDITAIS (âncora da cidade) ===")
    harvest_editais(sink, orgaos)
    log(f"\nEditais concluídos: {sink.count['editais']} · órgãos descobertos: {len(orgaos)}")
    log("\n=== FASE 2a: PCA (pré-edital) ===")
    harvest_pca(sink)
    log("\n=== FASE 2b: ATAS + CONTRATOS ===")
    harvest_atas_contratos(sink)
    sink.meta({"concluido": True})
    log(f"\nCONCLUÍDO. editais={sink.count['editais']} pca={sink.count['pca']} "
        f"atas={sink.count['atas']} contratos={sink.count['contratos']} "
        f"fatias={len(sink.done)} (saída em {OUT})")


if __name__ == "__main__":
    main()
