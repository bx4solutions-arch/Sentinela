#!/usr/bin/env python3
"""Cliente HTTP compartilhado da PNCP Consulta API (/api/consulta/v1).

Só leitura. stdlib apenas (convenção do repo). Backoff exponencial, paginação
educada (sem paralelismo), e helper que sempre extrai a unidade administrativa
(unidadeOrgao.codigoUnidade = codigoUnidadeAdministrativa do addendum A2/A3).
"""
import datetime
import json
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://pncp.gov.br/api/consulta"
IBGE_SAO_LUIS = "2111300"
UF = "MA"
UA = "Sentinela-F0/0.1 (pesquisa institucional; contato bionicaosilva@gmail.com)"

# Enum completo de codigoModalidadeContratacao (PNCP). Etapa C itera TODAS (refino #7).
MODALIDADES = {
    1: "Leilão - Eletrônico",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência - Eletrônica",
    5: "Concorrência - Presencial",
    6: "Pregão - Eletrônico",
    7: "Pregão - Presencial",
    8: "Dispensa de Licitação",
    9: "Inexigibilidade",
    10: "Manifestação de Interesse",
    11: "Pré-qualificação",
    12: "Credenciamento",
    13: "Leilão - Presencial",
    14: "Inaplicabilidade da Licitação",
}


def get(path, params, max_retries=7, timeout=90):
    """GET com backoff exponencial. Retorna (status, json) ou levanta no esgotamento.

    HTTP 500 da PNCP costuma ser SQLTransientConnectionException (pool JDBC
    esgotado) — transitório; tratamos como retryável com backoff longo. 422 é
    erro de parâmetro (janela > 1 ano) → não adianta retentar, levanta logo.
    """
    qs = urllib.parse.urlencode(params)
    url = f"{BASE}{path}?{qs}"
    last_err = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read().decode("utf-8")
                if r.status == 204 or not body.strip():
                    return r.status, None
                return r.status, json.loads(body)
        except urllib.error.HTTPError as e:
            # 204/404 = sem dado para os filtros; não é erro fatal.
            if e.code in (204, 404):
                return e.code, None
            if e.code == 422:  # parâmetro inválido — retentar não resolve
                raise RuntimeError(f"HTTP 422 (parâmetro inválido): {url}") from e
            last_err = e
        except Exception as e:  # noqa: BLE001 - rede instável; backoff e retenta
            last_err = e
        time.sleep(min(60, 2.0 * (2 ** attempt)))  # 2,4,8,16,32,60,60s
    raise RuntimeError(f"GET falhou após {max_retries} tentativas: {url} :: {last_err}")


def paginate(path, base_params, page_size, max_pages=200, pause=0.7):
    """Itera páginas de um endpoint com envelope {data,totalPaginas,...}.

    Yield item a item. Respeita totalPaginas e para em página vazia.
    """
    page = 1
    while page <= max_pages:
        params = dict(base_params, pagina=page, tamanhoPagina=page_size)
        status, data = get(path, params)
        if not data:
            return
        items = data.get("data") if isinstance(data, dict) else data
        if not items:
            return
        for it in items:
            yield it
        total_paginas = data.get("totalPaginas") if isinstance(data, dict) else None
        if total_paginas is not None and page >= total_paginas:
            return
        page += 1
        time.sleep(pause)


def date_windows(data_ini, data_fim, max_days=364):
    """Fatia [data_ini, data_fim] (yyyyMMdd) em sub-janelas de no máx. max_days.

    A Consulta API /contratacoes/publicacao rejeita (HTTP 422) intervalos > ~1 ano.
    Yields tuplas (ini_yyyyMMdd, fim_yyyyMMdd) contíguas, inclusivas.
    """
    d0 = datetime.datetime.strptime(data_ini, "%Y%m%d").date()
    d1 = datetime.datetime.strptime(data_fim, "%Y%m%d").date()
    step = datetime.timedelta(days=max_days)
    cur = d0
    while cur <= d1:
        fim = min(cur + step, d1)
        yield cur.strftime("%Y%m%d"), fim.strftime("%Y%m%d")
        cur = fim + datetime.timedelta(days=1)


def unidade_de(registro):
    """Extrai (cnpjOrgao, codigoUnidadeAdministrativa, nomeUnidade) de um registro.

    codigoUnidadeAdministrativa := unidadeOrgao.codigoUnidade (prova de filtro
    por unidade, addendum A2/A3). Retorna None nos campos ausentes.
    """
    oe = registro.get("orgaoEntidade") or {}
    uo = registro.get("unidadeOrgao") or {}
    return {
        "cnpjOrgao": oe.get("cnpj"),
        "razaoSocialOrgao": oe.get("razaoSocial"),
        "codigoUnidadeAdministrativa": uo.get("codigoUnidade"),
        "nomeUnidade": uo.get("nomeUnidade"),
        "municipioNome": uo.get("municipioNome"),
        "codigoIbge": uo.get("codigoIbge"),
    }
