// Sentinela — siconfi-harvester
// Busca dados fiscais reais (RREO — Receita Corrente Líquida e Receita Realizada)
// da API pública do Tesouro Nacional (SICONFI) e grava em orgao_fiscal.
//
// Escopo real desta versão (v1): usa apenas o endpoint /rreo, que testamos e
// confirmamos funcionar de forma confiável. O endpoint /rgf (despesa com
// pessoal, dívida consolidada líquida) foi testado com ~18 combinações de
// parâmetros documentadas/plausíveis (id_ente, an_exercicio, nr_periodo,
// co_tipo_demonstrativo, co_poder em E/C, no_anexo com e sem citação LRF
// completa, com aspas retas e sem) e todas retornaram 0 registros — inclusive
// para consultas sem filtro de ente nenhum, o que descarta ser um gap de
// dado específico de Teresina. A API SICONFI não publica Swagger/OpenAPI
// público, então o parâmetro exato ainda não foi descoberto. despesa_pessoal,
// divida e capag ficam NULL até isso ser resolvido — nunca inventados.
// Ver memória do projeto (sentinela-siconfi) para o histórico completo.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarIncidente, amostra } from "../_shared/registrar-incidente.ts";

const SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

async function getComRetry(url: string, tentativas = 5): Promise<any> {
  let ultimoErro: unknown = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return await res.json();
      if (res.status === 404) return { items: [] };
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status} em ${url}`);
    } catch (e) {
      ultimoErro = e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Falhou após ${tentativas} tentativas: ${url} — ${String(ultimoErro)}`);
}

// RREO do 6º bimestre de um exercício normalmente já está publicado em
// janeiro/fevereiro do ano seguinte. Começamos pelo último exercício fechado
// (ano atual - 1); se ainda não estiver publicado, processarMunicipio tenta
// os anos anteriores até achar o mais recente com dado real disponível.
function exerciciosCandidatos(): number[] {
  const anoBase = new Date().getUTCFullYear() - 1;
  return [anoBase, anoBase - 1, anoBase - 2];
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: configs, error: cfgErr } = await supabase
    .from("harvester_config")
    .select("codigo_municipio_ibge")
    .eq("ativo", true)
    .not("codigo_municipio_ibge", "is", null);

  if (cfgErr) {
    await registrarIncidente(supabase, {
      integracao: "siconfi",
      severidade: "critico",
      titulo: "Falha ao ler harvester_config para escopo do SICONFI",
      detalhe: cfgErr.message,
      acaoSugerida: "Verificar permissão de service_role em harvester_config (RLS).",
      contextoTecnico: { erro: amostra(cfgErr) },
    });
    return new Response(JSON.stringify({ erro: "config" }), { status: 500 });
  }

  const codigos = Array.from(
    new Set((configs ?? []).map((c) => c.codigo_municipio_ibge).filter(Boolean))
  );
  const resultados = [];
  for (const codigoIbge of codigos) {
    resultados.push(await processarMunicipio(supabase, codigoIbge as string, exerciciosCandidatos()));
  }

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function buscarRreo(codigoIbge: string, exercicio: number) {
  let receitaRealizada: number | null = null;
  let rcl: number | null = null;
  let populacao: number | null = null;
  let instituicao: string | null = null;
  let uf: string | null = null;
  let itensLidos = 0;
  const erros: Array<{ etapa: string; mensagem: string }> = [];

  try {
    const anexo01 = await getComRetry(
      `${SICONFI_BASE}/rreo?an_exercicio=${exercicio}&id_ente=${codigoIbge}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(
        "RREO-Anexo 01"
      )}&limit=200`
    );
    itensLidos += anexo01.items?.length ?? 0;
    const linhaReceita = (anexo01.items ?? []).find(
      (i: any) =>
        i.cod_conta === "ReceitasExcetoIntraOrcamentarias" && i.coluna === "Até o Bimestre (c)"
    );
    receitaRealizada = linhaReceita?.valor ?? null;
    populacao = anexo01.items?.[0]?.populacao ?? null;
    // "instituicao" e "uf" vêm prontos na própria resposta do RREO (é o nome
    // oficial que a STN usa pro ente — ex. "Prefeitura Municipal de Teresina - PI")
    // — usamos como fonte da linha canônica do ente, sem precisar do endpoint
    // /entes (confirmamos que ele ignora todo filtro e sempre devolve os ~5.570
    // municípios do Brasil inteiro, inviável de paginar a cada execução).
    instituicao = anexo01.items?.[0]?.instituicao ?? null;
    uf = anexo01.items?.[0]?.uf ?? null;
  } catch (e) {
    erros.push({ etapa: "rreo anexo 01 (receita realizada)", mensagem: String(e) });
  }

  try {
    const anexo03 = await getComRetry(
      `${SICONFI_BASE}/rreo?an_exercicio=${exercicio}&id_ente=${codigoIbge}&nr_periodo=6&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(
        "RREO-Anexo 03"
      )}&limit=500`
    );
    itensLidos += anexo03.items?.length ?? 0;
    const linhaRcl = (anexo03.items ?? []).find(
      (i: any) =>
        i.cod_conta === "ReceitasCorrentesLiquidasExcetoTransferenciasEFUNDEB" &&
        i.coluna === "TOTAL (ÚLTIMOS 12 MESES)"
    );
    rcl = linhaRcl?.valor ?? null;
    instituicao = instituicao ?? anexo03.items?.[0]?.instituicao ?? null;
    uf = uf ?? anexo03.items?.[0]?.uf ?? null;
  } catch (e) {
    erros.push({ etapa: "rreo anexo 03 (RCL)", mensagem: String(e) });
  }

  return { receitaRealizada, rcl, populacao, instituicao, uf, itensLidos, erros };
}

/**
 * Garante a linha canônica do ente federativo (o município como um todo) em
 * orgaos, chaveada por codigo_ibge (unique no schema). NUNCA reaproveita um
 * órgão criado pelo harvester PNCP (secretaria/fundação com CNPJ próprio) —
 * cria/atualiza uma linha própria, com cnpj null (não temos o CNPJ real da
 * Prefeitura vindo do RREO, e não fabricamos um).
 */
async function garantirEnteCanonico(
  supabase: any,
  codigoIbge: string,
  dados: { instituicao: string | null; uf: string | null; populacao: number | null }
): Promise<string> {
  const nome = dados.instituicao ?? `Ente federativo — código IBGE ${codigoIbge}`;

  const { data: existente } = await supabase
    .from("orgaos")
    .select("id")
    .eq("codigo_ibge", codigoIbge)
    .maybeSingle();

  if (existente) {
    await supabase
      .from("orgaos")
      .update({
        nome,
        uf: dados.uf,
        populacao: dados.populacao,
        esfera: "M",
        poder: "E",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", existente.id);
    return existente.id;
  }

  const { data: novo } = await supabase
    .from("orgaos")
    .insert({
      nome,
      codigo_ibge: codigoIbge,
      uf: dados.uf,
      populacao: dados.populacao,
      esfera: "M",
      poder: "E",
      cnpj: null,
    })
    .select()
    .single();

  return novo.id;
}

async function processarMunicipio(supabase: any, codigoIbge: string, exercicios: number[]) {
  const { data: run } = await supabase
    .from("harvester_runs")
    .insert({ fonte: "siconfi", integracao: "siconfi", status: "em_execucao" })
    .select()
    .single();

  let itensLidos = 0;
  let erros: Array<{ etapa: string; mensagem: string }> = [];
  let receitaRealizada: number | null = null;
  let rcl: number | null = null;
  let populacao: number | null = null;
  let instituicao: string | null = null;
  let uf: string | null = null;
  let exercicioUsado: number | null = null;

  // Tenta o exercício mais recente primeiro; cai para o anterior só se
  // nenhum dado real vier — nunca mistura dado de anos diferentes na mesma linha.
  for (const exercicio of exercicios) {
    const r = await buscarRreo(codigoIbge, exercicio);
    itensLidos += r.itensLidos;
    if (r.receitaRealizada !== null || r.rcl !== null) {
      receitaRealizada = r.receitaRealizada;
      rcl = r.rcl;
      populacao = r.populacao;
      instituicao = r.instituicao;
      uf = r.uf;
      exercicioUsado = exercicio;
      erros = r.erros;
      break;
    }
    erros = erros.concat(r.erros);
  }

  if (exercicioUsado === null) {
    await registrarIncidente(supabase, {
      integracao: "siconfi",
      runId: run.id,
      severidade: "critico",
      titulo: `Nenhum dado de RREO retornado para código IBGE ${codigoIbge} (exercícios ${exercicios.join(", ")})`,
      detalhe:
        "Nem receita realizada (Anexo 01) nem RCL (Anexo 03) vieram preenchidos em nenhum dos exercícios tentados. Pode ser que o formato de resposta da API tenha mudado.",
      acaoSugerida:
        "Testar manualmente a URL do RREO para esse id_ente/exercício no navegador; se algum campo mudou de nome, ajustar o parser em buscarRreo() de supabase/functions/siconfi-harvester/index.ts.",
      contextoTecnico: {
        codigoIbge,
        exerciciosTentados: exercicios,
        erros: amostra(erros),
      },
    });
    await supabase
      .from("harvester_runs")
      .update({ status: "erro", itens_lidos: itensLidos, erros, finalizado_em: new Date().toISOString() })
      .eq("id", run.id);
    return { codigoIbge, status: "sem_dado" };
  }

  // Só agora criamos/atualizamos a linha canônica do ente — com dado real
  // (nome, uf, população) vindo da própria resposta do RREO, nunca antes disso.
  const orgaoId = await garantirEnteCanonico(supabase, codigoIbge, { instituicao, uf, populacao });

  const linha = {
    orgao_id: orgaoId,
    ano: exercicioUsado,
    rcl,
    receita_per_capita: receitaRealizada && populacao ? receitaRealizada / populacao : null,
    despesa_pessoal: null,
    divida: null,
    capag: null,
  };

  const { error: upsertErr } = await supabase
    .from("orgao_fiscal")
    .upsert(linha, { onConflict: "orgao_id,ano" });

  if (upsertErr) {
    erros.push({ etapa: "upsert orgao_fiscal", mensagem: upsertErr.message });
  }

  await supabase
    .from("harvester_runs")
    .update({
      status: erros.length > 0 ? "parcial" : "sucesso",
      itens_lidos: itensLidos,
      itens_atualizados: upsertErr ? 0 : 1,
      erros,
      finalizado_em: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { codigoIbge, status: "ok", orgaoId, exercicioUsado, rcl, receitaRealizada };
}
