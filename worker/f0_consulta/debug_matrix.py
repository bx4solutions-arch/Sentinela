#!/usr/bin/env python3
"""Debug — isola o que dispara 422/500 em /contratacoes/publicacao. Read-only."""
import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://pncp.gov.br/api/consulta"
UA = "Sentinela-F0/0.1 (pesquisa institucional)"


def try_get(params):
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}/v1/contratacoes/publicacao?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode("utf-8"))
            tot = data.get("totalRegistros") if isinstance(data, dict) else len(data)
            return f"HTTP {r.status}  totalRegistros={tot}"
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}  {e.read().decode('utf-8')[:200]}"
    except Exception as e:  # noqa: BLE001
        return f"ERRO {type(e).__name__}: {e}"


def c(ini, fim, tam, **extra):
    p = {"dataInicial": ini, "dataFinal": fim, "codigoModalidadeContratacao": 6,
         "codigoMunicipioIbge": "2111300", "uf": "MA", "pagina": 1, "tamanhoPagina": tam}
    p.update(extra)
    return p


CASES = [
    ("2026 jan tam10 (ok ref)", c("20260101", "20260131", 10)),
    ("2026 Q1 tam20", c("20260101", "20260331", 20)),
    ("2026 Q1 tam30", c("20260101", "20260331", 30)),
    ("2025 mar (1mes) tam10", c("20250301", "20250331", 10)),
    ("2025 mar (1mes) tam10 retry", c("20250301", "20250331", 10)),
    ("2025 1 semana tam10", c("20250301", "20250307", 10)),
    ("2024 nov (1mes) tam10", c("20241101", "20241130", 10)),
    ("2025 mar sem municipio tam10", {"dataInicial": "20250301", "dataFinal": "20250331", "codigoModalidadeContratacao": 6, "uf": "MA", "pagina": 1, "tamanhoPagina": 10}),
]

for label, params in CASES:
    print(f"{label:34s} -> {try_get(params)}")
