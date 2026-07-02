// Sentinela — emendas-harvester
//
// Busca emendas parlamentares reais via API "Emendas Parlamentares" do Portal
// da Transparência (CGU) e grava em public.emendas. Fecha o terceiro pé do
// Raio-X Financeiro (Capacidade=SICONFI, Apetite=PCA/execução, e agora
// Capacidade/Apetite reforçados por emenda — ver docs/PRD-emendas-enquadramento-copy.md
// pra entender por que emenda NÃO vira driver de "Acesso").
//
// Fonte: https://api.portaldatransparencia.gov.br/api-de-dados/emendas
// Exige token gratuito (cadastro por e-mail em
// portaldatransparencia.gov.br/api-de-dados/cadastrar-email), enviado no
// header `chave-api-dados`. Lido de Deno.env.get("PORTAL_TRANSPARENCIA_TOKEN")
// — precisa ser configurado como secret do projeto Supabase (nunca commitado).
// Se o secret não existir, a função registra um incidente crítico com o passo
// a passo exato e para, sem tentar adivinhar/fabricar dado.
//
// Enriquecimento explicitamente FORA de escopo desta versão (documentado, não
// esquecido):
// - autor_partido: a API de Emendas da CGU não devolve partido no payload.
//   Precisaria cruzar codigoAutor com a API de Dados Abertos da Câmara/Senado.
//   Fica NULL até isso ser construído — nunca fabricado.
// - /emendas/documentos/{codigo}: dá a linha do tempo eventos individuais
//   (datas de cada empenho/liquidação/pagamento). Esta versão usa só os
//   totais agregados de /emendas (suficiente pra regra "empenhada, não paga").
//   Timeline granular fica pra uma v2, quando o produto precisar de "parado
//   há X dias" como sinal.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarIncidente, amostra } from "../_shared/registrar-incidente.ts";

const CGU_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const MAX_DETALHES_POR_EXECUCAO = 100; // trava de segurança contra N+1 explosivo

function anosCandidatos(): number[] {
  const anoAtual = new Date().getUTCFullYear();
  return [anoAtual, anoAtual - 1, anoAtual - 2];
}

async function getCguComRetry(url: string, token: string, tentativas = 5): Promise<any> {
  let ultimoErro: unknown = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, {
        headers: { "chave-api-dados": token, Accept: "application/json" },
      });
      if (res.status === 200) return await res.json();
      if (res.status === 404) return [];
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      throw new Error(`HTTP ${res.status} em ${url}`);
    } catch (e) {
      ultimoErro = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`Falhou após ${tentativas} tentativas: ${url} — ${String(ultimoErro)}`);
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = Deno.env.get("PORTAL_TRANSPARENCIA_TOKEN");
  if (!token) {
    await registrarIncidente(supabase, {
      integracao: "emendas",
      severidade: "critico",
      titulo: "PORTAL_TRANSPARENCIA_TOKEN não configurado — emendas-harvester não pode rodar",
      detalhe:
        "A API de Emendas Parlamentares da CGU exige um token gratuito (chave-api-dados). Sem ele, a função para aqui — nunca inventa dado de emenda.",
      acaoSugerida:
        "1) Cadastrar e-mail em https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email. " +
        "2) Copiar o token recebido por e-mail. " +
        "3) Rodar `supabase secrets set PORTAL_TRANSPARENCIA_TOKEN=<token>` (ou configurar em Project Settings > Edge Functions > Secrets no dashboard). " +
        "4) Reinvocar esta função.",
      contextoTecnico: { endpointAfetado: `${CGU_BASE}/emendas` },
    });
    return new Response(JSON.stringify({ erro: "token_ausente" }), { status: 500 });
  }

  const { data: configs, error: cfgErr } = await supabase
    .from("harvester_config")
    .select("codigo_municipio_ibge")
    .eq("ativo", true)
    .not("codigo_municipio_ibge", "is", null);

  if (cfgErr) {
    await registrarIncidente(supabase, {
      integracao: "emendas",
      severidade: "critico",
      titulo: "Falha ao ler harvester_config para escopo do emendas-harvester",
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
    resultados.push(await processarMunicipio(supabase, codigoIbge as string, token));
  }

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Garante uma linha mínima do ente federativo em orgaos, chaveada por
 * codigo_ibge — só se ainda não existir. NÃO sobrescreve/enriquece uma linha
 * já existente (isso é responsabilidade do siconfi-harvester, que tem dado
 * mais confiável de nome/uf/população vindo do RREO). Ver
 * supabase/functions/siconfi-harvester/index.ts::garantirEnteCanonico — as
 * duas funções cooperam na mesma linha, nunca competem: quem chegar primeiro
 * cria um stub mínimo, o SICONFI sempre enriquece por cima no próximo run.
 */
async function garantirEnteMinimo(
  supabase: any,
  codigoIbge: string,
  localidadeDoGasto: string | null
): Promise<string> {
  const { data: existente } = await supabase
    .from("orgaos")
    .select("id")
    .eq("codigo_ibge", codigoIbge)
    .maybeSingle();

  if (existente) return existente.id;

  const { data: novo } = await supabase
    .from("orgaos")
    .insert({
      nome: localidadeDoGasto ?? `Ente federativo — código IBGE ${codigoIbge}`,
      codigo_ibge: codigoIbge,
      esfera: "M",
      poder: "E",
      cnpj: null,
    })
    .select()
    .single();

  return novo.id;
}

async function buscarEmendasDoAno(
  codigoIbge: string,
  ano: number,
  token: string
): Promise<{ itens: any[]; erros: Array<{ etapa: string; mensagem: string }> }> {
  const itens: any[] = [];
  const erros: Array<{ etapa: string; mensagem: string }> = [];
  let pagina = 1;
  const MAX_PAGINAS = 20; // trava de segurança

  while (pagina <= MAX_PAGINAS) {
    try {
      const url = `${CGU_BASE}/emendas?ano=${ano}&codigoMunicipio=${codigoIbge}&pagina=${pagina}`;
      const resposta = await getCguComRetry(url, token);
      const pagina_itens: any[] = Array.isArray(resposta)
        ? resposta
        : resposta?.items ?? resposta?.data ?? [];
      if (pagina_itens.length === 0) break;
      itens.push(...pagina_itens);
      pagina += 1;
      await new Promise((r) => setTimeout(r, 250)); // respeita rate limit (90 req/min)
    } catch (e) {
      erros.push({ etapa: `emendas ano=${ano} pagina=${pagina}`, mensagem: String(e) });
      break;
    }
  }

  return { itens, erros };
}

async function buscarDetalheEmenda(
  codigoEmenda: string,
  token: string
): Promise<{ orgaoExecutor: string | null; programaGovernamental: string | null } | null> {
  try {
    const detalhe = await getCguComRetry(
      `${CGU_BASE}/emendas/${encodeURIComponent(codigoEmenda)}`,
      token
    );
    const d = Array.isArray(detalhe) ? detalhe[0] : detalhe;
    return {
      orgaoExecutor: d?.orgaoExecutor ?? null,
      programaGovernamental: d?.programaGovernamental ?? null,
    };
  } catch {
    return null; // detalhe é enriquecimento — nunca derruba o run principal por causa dele
  }
}

async function processarMunicipio(supabase: any, codigoIbge: string, token: string) {
  const { data: run } = await supabase
    .from("harvester_runs")
    .insert({ fonte: "emendas", integracao: "emendas", status: "em_execucao" })
    .select()
    .single();

  let itensLidos = 0;
  let itensNovos = 0;
  let itensAtualizados = 0;
  let detalhesConsultados = 0;
  const erros: Array<{ etapa: string; mensagem: string }> = [];

  for (const ano of anosCandidatos()) {
    const { itens, erros: errosAno } = await buscarEmendasDoAno(codigoIbge, ano, token);
    erros.push(...errosAno);
    itensLidos += itens.length;

    for (const item of itens) {
      const codigoEmenda: string | null = item.codigoEmenda ?? null;
      if (!codigoEmenda) {
        erros.push({ etapa: `emenda sem codigoEmenda (ano=${ano})`, mensagem: amostra(item, 300) });
        continue;
      }

      const orgaoId = await garantirEnteMinimo(supabase, codigoIbge, item.localidadeDoGasto ?? null);

      let orgaoExecutor: string | null = null;
      let programaGovernamental: string | null = null;
      if (detalhesConsultados < MAX_DETALHES_POR_EXECUCAO) {
        const detalhe = await buscarDetalheEmenda(codigoEmenda, token);
        if (detalhe) {
          orgaoExecutor = detalhe.orgaoExecutor;
          programaGovernamental = detalhe.programaGovernamental;
        }
        detalhesConsultados += 1;
        await new Promise((r) => setTimeout(r, 250));
      }

      const linha = {
        codigo_emenda: codigoEmenda,
        orgao_id: orgaoId,
        ano: item.ano ?? ano,
        tipo_emenda: item.tipoEmenda ?? null,
        autor_nome: item.nomeAutor ?? null,
        autor_codigo: item.codigoAutor ?? null,
        autor_partido: null, // nunca fabricado — ver comentário no topo do arquivo
        autor_uf: null,
        funcao: item.nomeFuncao ?? null,
        subfuncao: item.nomeSubfuncao ?? null,
        orgao_executor: orgaoExecutor,
        programa_governamental: programaGovernamental,
        valor_empenhado: item.valorEmpenhado ?? null,
        valor_liquidado: item.valorLiquidado ?? null,
        valor_pago: item.valorPago ?? null,
        valor_resto_inscrito: item.valorRestoInscrito ?? null,
        valor_resto_pago: item.valorRestoPago ?? null,
        valor_resto_cancelado: item.valorRestoCancelado ?? null,
        atualizado_em: new Date().toISOString(),
      };

      const { error: upsertErr, data: upsertData } = await supabase
        .from("emendas")
        .upsert(linha, { onConflict: "codigo_emenda" })
        .select("id");

      if (upsertErr) {
        erros.push({ etapa: `upsert emenda ${codigoEmenda}`, mensagem: upsertErr.message });
      } else if (upsertData) {
        itensAtualizados += 1;
      }
    }
  }

  if (itensLidos === 0 && erros.length > 0) {
    await registrarIncidente(supabase, {
      integracao: "emendas",
      runId: run.id,
      severidade: "atencao",
      titulo: `Nenhuma emenda retornada para código IBGE ${codigoIbge} em nenhum dos anos tentados`,
      detalhe: "Pode ser ausência real de emendas pro município, ou mudança de formato da resposta da API.",
      acaoSugerida:
        "Testar manualmente a URL do /emendas pra esse codigoMunicipio no navegador (com o header chave-api-dados); se o formato mudou, ajustar buscarEmendasDoAno() em supabase/functions/emendas-harvester/index.ts.",
      contextoTecnico: { codigoIbge, anosTentados: anosCandidatos(), erros: amostra(erros) },
    });
  }

  await supabase
    .from("harvester_runs")
    .update({
      status: erros.length > 0 ? "parcial" : "sucesso",
      itens_lidos: itensLidos,
      itens_novos: itensNovos,
      itens_atualizados: itensAtualizados,
      erros,
      finalizado_em: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { codigoIbge, itensLidos, itensAtualizados, detalhesConsultados };
}
