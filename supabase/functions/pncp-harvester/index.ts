// supabase/functions/pncp-harvester/index.ts
//
// Motor de ingestão do PNCP — a "célula" da Sentinela, não um dump nacional.
// Princípios (skill pncp-licitacoes/references/cicatrizes-de-producao.md):
//   1. Escopo por município/UF (harvester_config), nunca varredura nacional.
//   2. Idempotente: upsert por numeroControlePNCP, re-rodar não duplica.
//   3. Retry/backoff: a API do governo cai; não derruba o run por um 5xx.
//   4. Nunca forjar dado: campo ausente vira alerta, não vira valor inventado.
//   5. Copiloto, nunca piloto: quando o formato da API muda, isso vira um
//      alerta em `alertas_integracao` para revisão humana — a função NUNCA
//      tenta se "autocorrigir" e publicar sozinha em produção.
//
// Disparo: pg_cron -> pg_net (agendado) ou invocação manual (teste/depuração).
// Nenhuma credencial fica no código: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// chegam como env var injetada pelo runtime do Supabase Edge Functions.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarIncidente, amostra } from "../_shared/registrar-incidente.ts";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

// Campos que TODO item de /v1/contratacoes/publicacao deveria ter. Se sumir
// algum, é sinal de mudança de contrato da API -> alerta, não invenção de dado.
const CAMPOS_ESPERADOS = [
  "numeroControlePNCP",
  "orgaoEntidade",
  "unidadeOrgao",
  "objetoCompra",
  "modalidadeId",
  "valorTotalEstimado",
  "dataAberturaProposta",
  "situacaoCompraNome",
];

interface RunLog {
  itens_lidos: number;
  itens_novos: number;
  itens_atualizados: number;
  erros: Array<{ etapa: string; mensagem: string }>;
}

function envOrThrow(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}

async function getComRetry(url: string, tentativas = 5): Promise<any> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetch(url, { headers: { accept: "*/*" } });
      if (resp.status === 204) return {};
      if (resp.ok) return await resp.json();
      if ([429, 500, 502, 503, 504].includes(resp.status)) {
        await new Promise((r) => setTimeout(r, 2 ** i * 1000));
        continue;
      }
      if (resp.status === 404) return {};
      throw new Error(`HTTP ${resp.status} em ${url}`);
    } catch (e) {
      if (i === tentativas - 1) throw e;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw new Error(`Falhou após ${tentativas} tentativas: ${url}`);
}

function janelaDias(dias: number): { di: string; df: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - dias * 86400000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return { di: fmt(inicio), df: fmt(hoje) };
}

/** Detecta drift de contrato: campo esperado ausente no primeiro item da página. */
function detectarAnomaliaSchema(item: Record<string, unknown>): string[] {
  return CAMPOS_ESPERADOS.filter((c) => !(c in item));
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = envOrThrow("SUPABASE_URL");
  const serviceKey = envOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: configs, error: cfgErro } = await supabase
    .from("harvester_config")
    .select("*")
    .eq("ativo", true);

  if (cfgErro) {
    return new Response(JSON.stringify({ ok: false, erro: cfgErro.message }), { status: 500 });
  }
  if (!configs || configs.length === 0) {
    return new Response(JSON.stringify({ ok: true, mensagem: "Nenhum recorte ativo em harvester_config." }));
  }

  const resultados = [];
  for (const cfg of configs) {
    resultados.push(await processarRecorte(supabase, cfg));
  }

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: { "content-type": "application/json" },
  });
});

async function processarRecorte(supabase: ReturnType<typeof createClient>, cfg: any) {
  const log: RunLog = { itens_lidos: 0, itens_novos: 0, itens_atualizados: 0, erros: [] };

  const { data: run } = await supabase
    .from("harvester_runs")
    .insert({ config_id: cfg.id, fonte: "pncp", integracao: "pncp", status: "em_execucao" })
    .select()
    .single();
  const runId = run?.id;

  try {
    const { di, df } = janelaDias(cfg.janela_dias ?? 3);
    const modalidades: number[] = cfg.modalidades ?? [6, 4, 8, 9];

    for (const modalidade of modalidades) {
      let pagina = 1;
      let totalPaginas = 1;

      do {
        const params = new URLSearchParams({
          dataInicial: di,
          dataFinal: df,
          codigoModalidadeContratacao: String(modalidade),
          pagina: String(pagina),
        });
        if (cfg.codigo_municipio_ibge) params.set("codigoMunicipioIbge", cfg.codigo_municipio_ibge);
        if (cfg.uf) params.set("uf", cfg.uf);

        const url = `${PNCP_BASE}/v1/contratacoes/publicacao?${params.toString()}`;
        let dados: any;
        try {
          dados = await getComRetry(url);
        } catch (e) {
          log.erros.push({ etapa: `editais modalidade=${modalidade} pagina=${pagina}`, mensagem: String(e) });
          break; // não derruba o run inteiro por uma janela ruim; segue pras próximas
        }

        const itens: any[] = dados.data ?? [];
        totalPaginas = dados.totalPaginas ?? 1;

        if (itens.length > 0) {
          const faltando = detectarAnomaliaSchema(itens[0]);
          if (faltando.length > 0) {
            await registrarIncidente(supabase, {
              integracao: "pncp",
              runId,
              severidade: "critico",
              titulo: "Campo(s) esperado(s) sumiram da resposta do PNCP",
              detalhe: `A API pode ter mudado de formato. Campos ausentes: ${faltando.join(", ")}.`,
              acaoSugerida:
                `Abrir ${url} manualmente e comparar com CAMPOS_ESPERADOS em ` +
                `supabase/functions/pncp-harvester/index.ts. Se o PNCP renomeou/removeu campo, ` +
                `ajustar o parser em upsertLicitacao() e CAMPOS_ESPERADOS, redeployar, e só então ` +
                `confiar de novo nos dados deste recorte (os itens deste run já foram gravados ` +
                `com o que deu pra ler — revisar se algum ficou com "Não informado" indevido).`,
              contextoTecnico: {
                endpoint: "/v1/contratacoes/publicacao",
                url,
                campos_esperados: CAMPOS_ESPERADOS,
                campos_ausentes: faltando,
                amostra_resposta: amostra(itens[0]),
                config_id: cfg.id,
                recorte: cfg.rotulo,
              },
            });
            log.erros.push({ etapa: "schema", mensagem: `Campos ausentes: ${faltando.join(", ")}` });
            // Não inventa dado no lugar do campo ausente — só registra e segue,
            // deixando a revisão humana decidir se ainda é seguro usar o resto.
          }
        }

        for (const item of itens) {
          log.itens_lidos++;
          const resultado = await upsertLicitacao(supabase, item);
          if (resultado === "novo") log.itens_novos++;
          if (resultado === "atualizado") log.itens_atualizados++;
        }

        pagina++;
        await new Promise((r) => setTimeout(r, 200)); // respeita a infra do governo
      } while (pagina <= totalPaginas);
    }

    const status = log.erros.length > 0 ? "parcial" : "sucesso";
    await supabase
      .from("harvester_runs")
      .update({ ...log, status, finalizado_em: new Date().toISOString() })
      .eq("id", runId);

    if (status === "parcial") {
      await registrarIncidente(supabase, {
        integracao: "pncp",
        runId,
        severidade: "atencao",
        titulo: `Run parcial no recorte "${cfg.rotulo}"`,
        detalhe: `${log.erros.length} etapa(s) falharam durante a coleta, mas o run seguiu — os dados que deram certo já estão gravados.`,
        acaoSugerida:
          `Ler harvester_runs.erros deste run (id ${runId}) pra ver qual página/modalidade falhou. ` +
          `Se for erro de rede/5xx pontual do PNCP, normalmente resolve sozinho no próximo ciclo (2h) — ` +
          `só agir se o mesmo ponto falhar em 2+ runs seguidos.`,
        contextoTecnico: { run_id: runId, recorte: cfg.rotulo, erros: log.erros },
      });
    }

    return { config: cfg.rotulo, status, ...log };
  } catch (e) {
    await supabase
      .from("harvester_runs")
      .update({
        status: "erro",
        finalizado_em: new Date().toISOString(),
        erros: [...log.erros, { etapa: "fatal", mensagem: String(e) }],
      })
      .eq("id", runId);

    await registrarIncidente(supabase, {
      integracao: "pncp",
      runId,
      severidade: "critico",
      titulo: `Run falhou por completo no recorte "${cfg.rotulo}"`,
      detalhe: String(e),
      acaoSugerida:
        `Ver o stack em contexto_tecnico.erro abaixo. Rodar a função manualmente ` +
        `(invocar pncp-harvester) pra reproduzir antes de mexer no código. Se for erro de ` +
        `conexão/timeout, considerar aumentar o timeout do cron (net.http_post timeout_milliseconds).`,
      contextoTecnico: { run_id: runId, recorte: cfg.rotulo, erro: String(e), itens_lidos_antes_da_falha: log.itens_lidos },
    });

    return { config: cfg.rotulo, status: "erro", mensagem: String(e) };
  }
}

/** Upsert idempotente de órgão + licitação. Nunca inventa campo ausente. */
async function upsertLicitacao(supabase: ReturnType<typeof createClient>, item: any): Promise<"novo" | "atualizado" | "ignorado"> {
  const numeroControle = item.numeroControlePNCP;
  if (!numeroControle) return "ignorado";

  const orgaoEnt = item.orgaoEntidade ?? {};
  const unidade = item.unidadeOrgao ?? {};

  // upsert do órgão contratante — CNPJ é a chave universal (município usa
  // também codigo_ibge quando a esfera é Municipal).
  let orgaoId: string | null = null;
  if (orgaoEnt.cnpj) {
    const { data: orgaoExistente } = await supabase
      .from("orgaos")
      .select("id")
      .eq("cnpj", orgaoEnt.cnpj)
      .maybeSingle();

    if (orgaoExistente) {
      orgaoId = orgaoExistente.id;
    } else {
      // codigo_ibge NÃO é gravado aqui de propósito: um órgão participante de
      // licitação (secretaria/fundação, tem CNPJ próprio) não é o mesmo
      // conceito que o "ente federativo" (o município como um todo, que é o
      // que SICONFI/emendas/PCA descrevem). codigo_ibge é único no banco —
      // gravá-lo aqui prendia o dado municipal a qualquer órgão que chegasse
      // primeiro (achado real: em Teresina/PI virou a Fundação Municipal de
      // Saúde, não a Prefeitura). A linha canônica do ente é gerenciada pelo
      // siconfi-harvester, que sabe de verdade qual instituição corresponde
      // ao codigo_ibge (vem direto da resposta do RREO/SICONFI).
      const { data: novoOrgao } = await supabase
        .from("orgaos")
        .insert({
          nome: orgaoEnt.razaoSocial ?? "Não informado",
          cnpj: orgaoEnt.cnpj,
          uf: unidade.ufSigla ?? null,
          esfera: orgaoEnt.esferaId ?? null,
          poder: orgaoEnt.poderId ?? null,
        })
        .select()
        .single();
      orgaoId = novoOrgao?.id ?? null;
    }
  }

  // Migration 17: vincula o órgão gestor ao ente federativo canônico via
  // codigo_ibge da unidade compradora. Idempotente e re-executável — o
  // backfill das licitações antigas acontece sozinho no próximo run.
  const codigoIbge = unidade.codigoIbge != null ? String(unidade.codigoIbge) : null;
  if (orgaoId && codigoIbge) {
    await vincularEnteCanonico(supabase, orgaoId, codigoIbge);
  }

  const linha = {
    numero_controle_pncp: numeroControle,
    numero_compra: item.numeroCompra ?? null,
    orgao_nome: orgaoEnt.razaoSocial ?? "Não informado",
    orgao_id: orgaoId,
    modalidade: item.modalidadeNome ?? null,
    objeto: item.objetoCompra ?? "Não informado",
    valor_total: item.valorTotalEstimado ?? null,
    data_abertura: item.dataAberturaProposta ?? null,
    data_publicacao: item.dataPublicacaoPncp ?? null,
    data_encerramento_proposta: item.dataEncerramentoProposta ?? null,
    portal: item.usuarioNome ?? null,
    esfera: orgaoEnt.esferaId ?? null,
    uf: unidade.ufSigla ?? null,
    registro_preco: item.srp ?? false,
    ano_compra: item.anoCompra ?? null,
    sequencial_compra: item.sequencialCompra ?? null,
    link_sistema_origem: item.linkSistemaOrigem ?? null,
    municipio: unidade.municipioNome ?? null,
    codigo_ibge: codigoIbge,
    unidade_nome: unidade.nomeUnidade ?? null,
    modo_disputa: item.modoDisputaNome ?? null,
    atualizado_em: new Date().toISOString(),
  };

  const { data: existente } = await supabase
    .from("licitacoes")
    .select("id")
    .eq("numero_controle_pncp", numeroControle)
    .maybeSingle();

  if (existente) {
    await supabase.from("licitacoes").update(linha).eq("id", existente.id);
    return "atualizado";
  }
  await supabase.from("licitacoes").insert(linha);
  return "novo";
}

// Cache por invocação: codigo_ibge -> id do ente canônico (ou null se não existe)
const cacheEnte = new Map<string, string | null>();

/**
 * Migration 17 (orgaos.ente_id): vincula órgão gestor → linha canônica do
 * ente federativo. Só vincula quando o ente já existe (criado pelo
 * siconfi-harvester — único que sabe qual instituição corresponde ao
 * codigo_ibge). NUNCA cria o ente aqui, pela mesma razão documentada acima
 * sobre codigo_ibge. Idempotente: `.is("ente_id", null)` faz as chamadas
 * seguintes virarem no-op.
 */
async function vincularEnteCanonico(
  supabase: ReturnType<typeof createClient>,
  orgaoId: string,
  codigoIbge: string,
): Promise<void> {
  let enteId: string | null;
  if (cacheEnte.has(codigoIbge)) {
    enteId = cacheEnte.get(codigoIbge) ?? null;
  } else {
    const { data: ente } = await supabase
      .from("orgaos")
      .select("id")
      .eq("codigo_ibge", codigoIbge)
      .maybeSingle();
    enteId = ente?.id ?? null;
    cacheEnte.set(codigoIbge, enteId);
  }
  if (!enteId || enteId === orgaoId) return;
  await supabase.from("orgaos").update({ ente_id: enteId }).eq("id", orgaoId).is("ente_id", null);
}
