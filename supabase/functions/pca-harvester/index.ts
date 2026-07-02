// Sentinela — pca-harvester
//
// Busca o Plano de Contratação Anual (PCA) real via API pública do PNCP —
// o que cada órgão DECLAROU que vai comprar no ano. É o sinal de antecipação
// mais direto que existe (junto com contrato vencendo), alimenta o eixo
// Apetite do Raio-X (ver docs da skill pncp-licitacoes: "PCA é o sinal
// pré-edital que sobra depois de tirar DFD/ETP/TR, que são fase interna").
//
// Endpoint real confirmado via swagger oficial (pncp.gov.br/api/consulta/v3/api-docs)
// em 02/07/2026: `/v1/pca/atualizacao` — diferente de `/v1/pca/` (que exige
// codigoClassificacaoSuperior obrigatório, ou seja, é pensado pra "quem vai
// comprar da minha categoria" em varredura nacional — o que a skill
// pncp-licitacoes proíbe explicitamente). `/v1/pca/atualizacao` filtra por
// `cnpj` do órgão (opcional mas é o que usamos) — mesmo padrão de escopo por
// CNPJ/UASG já usado no pncp-harvester, nunca varredura nacional.
//
// Escopo: para cada harvester_config ativo, usa o mesmo recorte municipal já
// provado (união via licitacoes.municipio, já que órgãos participantes não
// guardam codigo_ibge — ver comentário em processarMunicipio). Busca PCA só
// dos órgãos de esfera municipal desse recorte.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarIncidente, amostra } from "../_shared/registrar-incidente.ts";

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

async function getComRetry(url: string, tentativas = 5): Promise<any> {
  let ultimoErro: unknown = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 200) {
        // PNCP às vezes devolve 200 com corpo vazio (0 bytes) quando não há
        // nada na janela — visto na prática em 02/07/2026 (SyntaxError:
        // Unexpected end of JSON input ao chamar res.json() direto). Vazio é
        // caso normal, não erro — mesma lição documentada na skill
        // pncp-licitacoes ("vazio como caso normal").
        const texto = await res.text();
        if (!texto) return { data: [] };
        try {
          return JSON.parse(texto);
        } catch {
          return { data: [] };
        }
      }
      if (res.status === 204 || res.status === 404) return { data: [] };
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

function janelaAtualizacao(): { dataInicio: string; dataFim: string } {
  // Testado em produção em 02/07/2026: uma janela de 18 meses devolveu HTTP
  // 422 (Unprocessable Entity) — o endpoint /v1/pca/atualizacao aparenta
  // limitar o intervalo, igual outros endpoints de "atualização" do PNCP
  // (ver cicatrizes-de-producao.md da skill pncp-licitacoes: "consultas por
  // publicação costumam limitar o intervalo"). 90 dias é uma janela curta
  // seguindo o mesmo padrão — se ainda estourar, o incidente registrado por
  // registrarIncidente() vai trazer o erro exato pra reduzir mais.
  const fim = new Date();
  // Decisão 02/07/2026: janela de 1º de janeiro do ano corrente até hoje
  // (~180 dias em julho). Testado em produção: 90 dias devolveu 0 itens pros
  // 3 órgãos de Teresina — ambíguo (sem PCA declarado, ou PCA declarado em
  // jan/fev e nunca mais atualizado, escapando de uma janela de 90 dias).
  // Ampliando pra "desde 1º de janeiro" cobre exatamente esse caso sem
  // reincidir no 422 da janela de 18 meses. Resultado real também deu 0
  // itens pros mesmos 3 órgãos — ver sentinela-pca-harvester (memória):
  // achado é que Teresina genuinamente não tem PCA populado no PNCP pra
  // esses órgãos, não um artefato da janela.
  const inicio = new Date(Date.UTC(fim.getUTCFullYear(), 0, 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
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
      integracao: "pca",
      severidade: "critico",
      titulo: "Falha ao ler harvester_config para escopo do pca-harvester",
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
    resultados.push(await processarMunicipio(supabase, codigoIbge as string));
  }

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function processarMunicipio(supabase: any, codigoIbge: string) {
  const { data: run } = await supabase
    .from("harvester_runs")
    .insert({ fonte: "pca", integracao: "pca", status: "em_execucao" })
    .select()
    .single();

  // orgaos participantes (secretaria/fundação) não guardam codigo_ibge — só a
  // linha canônica do ente guarda (ver siconfi-harvester). Usamos o nome do
  // ente canônico pra achar as licitações reais do município (mesmo truque já
  // usado no filtro de licitações da tela Raio-X) e, a partir delas, os
  // órgãos municipais que de fato participam desse recorte.
  const { data: ente } = await supabase
    .from("orgaos")
    .select("nome, uf")
    .eq("codigo_ibge", codigoIbge)
    .maybeSingle();

  if (!ente) {
    await registrarIncidente(supabase, {
      integracao: "pca",
      runId: run.id,
      severidade: "atencao",
      titulo: `Nenhum ente canônico encontrado pra código IBGE ${codigoIbge} — pca-harvester não sabe qual município buscar`,
      detalhe: "O ente canônico é criado pelo siconfi-harvester. Rode-o primeiro pra esse código IBGE.",
      acaoSugerida: "Confirmar que siconfi-harvester já rodou com sucesso pra esse município antes do pca-harvester.",
      contextoTecnico: { codigoIbge },
    });
    await supabase.from("harvester_runs").update({ status: "erro", finalizado_em: new Date().toISOString() }).eq("id", run.id);
    return { codigoIbge, status: "sem_ente" };
  }

  // extrai o nome do município a partir do nome do ente (ex.: "Prefeitura
  // Municipal de Teresina - PI" -> "Teresina"). Frágil por natureza (nome
  // livre), documentado — funciona pro padrão real observado no SICONFI.
  const matchNome = ente.nome.match(/Municipal de (.+?)( - [A-Z]{2})?$/i);
  const nomeMunicipio = matchNome?.[1] ?? ente.nome;

  const { data: licitacoesDoMunicipio } = await supabase
    .from("licitacoes")
    .select("orgao_id")
    .ilike("municipio", `%${nomeMunicipio}%`);

  const idsOrgaosDoMunicipio = Array.from(
    new Set((licitacoesDoMunicipio ?? []).map((l: any) => l.orgao_id).filter(Boolean))
  );

  const orgaosMunicipais = idsOrgaosDoMunicipio.length
    ? (
        await supabase
          .from("orgaos")
          .select("id, cnpj, nome")
          .eq("esfera", "M")
          .not("cnpj", "is", null)
          .in("id", idsOrgaosDoMunicipio)
      ).data
    : [];

  let itensLidos = 0;
  let itensGravados = 0;
  const erros: Array<{ etapa: string; mensagem: string }> = [];
  const { dataInicio, dataFim } = janelaAtualizacao();

  for (const orgao of orgaosMunicipais ?? []) {
    let pagina = 1;
    const MAX_PAGINAS = 10;
    while (pagina <= MAX_PAGINAS) {
      try {
        const url = `${PNCP_BASE}/v1/pca/atualizacao?dataInicio=${dataInicio}&dataFim=${dataFim}&cnpj=${orgao.cnpj}&pagina=${pagina}&tamanhoPagina=500`;
        const resposta = await getComRetry(url);
        const grupos: any[] = resposta?.data ?? [];
        if (grupos.length === 0) break;

        for (const grupo of grupos) {
          for (const item of grupo.itens ?? []) {
            itensLidos += 1;
            const linha = {
              orgao_id: orgao.id,
              id_pca_pncp: grupo.idPcaPncp ?? null,
              numero_item: item.numeroItem ?? null,
              codigo_item: item.codigoItem ?? null,
              categoria: item.categoriaItemPcaNome ?? item.nomeClassificacaoCatalogo ?? null,
              esfera: "M",
              descricao: item.descricaoItem ?? null,
              valor_estimado: item.valorTotal ?? null,
              quantidade: item.quantidadeEstimada ?? null,
              data_desejada: item.dataDesejada ?? null,
              ano: grupo.anoPca ?? null,
              url_pncp: null, // formato de URL pública do PCA não confirmado — nunca inventado
              atualizado_em: item.dataAtualizacao ?? new Date().toISOString(),
            };

            if (!linha.id_pca_pncp || linha.numero_item === null) {
              erros.push({ etapa: `item sem chave (orgao ${orgao.cnpj})`, mensagem: amostra(item, 300) });
              continue;
            }

            const { error: upsertErr } = await supabase
              .from("pca_itens")
              .upsert(linha, { onConflict: "id_pca_pncp,numero_item" });

            if (upsertErr) {
              erros.push({ etapa: `upsert pca_item ${linha.id_pca_pncp}/${linha.numero_item}`, mensagem: upsertErr.message });
            } else {
              itensGravados += 1;
            }
          }
        }
        pagina += 1;
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        erros.push({ etapa: `pca cnpj=${orgao.cnpj} pagina=${pagina}`, mensagem: String(e) });
        break;
      }
    }
  }

  await supabase
    .from("harvester_runs")
    .update({
      status: erros.length > 0 ? "parcial" : "sucesso",
      itens_lidos: itensLidos,
      itens_atualizados: itensGravados,
      erros,
      finalizado_em: new Date().toISOString(),
    })
    .eq("id", run.id);

  return { codigoIbge, orgaosConsultados: (orgaosMunicipais ?? []).length, itensLidos, itensGravados };
}
