// Sentinela — capag-harvester
//
// Busca a nota CAPAG (Capacidade de Pagamento) real do Tesouro Nacional —
// sinal de "esse órgão paga bem?" que o Bione pediu explicitamente (02/07/2026:
// "temos que ter o score dos órgãos com relação a se o órgão paga bem").
// Alimenta o eixo Capacidade do Raio-X.
//
// REESCRITO em 02/07/2026 depois que a v1 (baixar o XLSX de 24MB inteiro e
// parsear com a lib xlsx/SheetJS) travou em produção — muito provável OOM do
// runtime do Edge Function. O Bione pediu explicitamente pra achar outro jeito
// DENTRO do Supabase, sem precisar de script local.
//
// Tentativa 1 (v3): baixar só pedaços do arquivo via HTTP Range (índice ZIP +
// só as abas relevantes), sem nunca baixar os 24MB inteiros. Testado em
// produção — o servidor do Tesouro Transparente NÃO aceita Range requests
// (GET com header Range devolveu HTTP 200 completo, não 206 parcial). Essa
// via está descartada — não é algo que dá pra contornar do nosso lado.
//
// Tentativa 2 (esta versão): o diagnóstico real é que baixar 24MB não é o
// problema — isso cabe tranquilo na memória de um Edge Function. O que
// travou foi a biblioteca xlsx/SheetJS materializando o workbook INTEIRO
// (todas as abas, incluindo a aba "Ano Base" com ~70 colunas × 5.570 linhas)
// como objetos JS antes de eu conseguir escolher só a aba que interessa. A
// correção: baixar o arquivo inteiro (uma vez só, sem Range), mas processar
// o ZIP "na mão" — ler o índice (Central Directory) e descomprimir SÓ os 2-3
// arquivos internos que interessam (xl/workbook.xml, xl/_rels/....rels,
// xl/sharedStrings.xml e a aba "Prévia da Capag", que tem só ~12 colunas).
// A aba grande nunca é descomprimida nem parseada. Descompressão via
// `DecompressionStream("deflate-raw")` — Web API nativa do Deno, sem lib
// externa de zip.
//
// Estrutura da planilha confirmada via PDF de metadados oficial do Tesouro
// (baixado e lido em 02/07/2026): a partir de 2024 existe uma aba "Prévia da
// Capag" — Coluna A = Código Município Completo (IBGE), B = Nome_Município,
// C = UF, D = CAPAG (nota final A/B/C/D/n.d.), E-J = indicadores/notas
// parciais, K = ICF, L = Observação.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { registrarIncidente, amostra } from "../_shared/registrar-incidente.ts";

const CAPAG_XLSX_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/9ff93162-409e-48b5-91d9-cf645a47fdfc/resource/f117161f-44c4-4ada-9cfe-0d5da8c5b10e/download/capag-municipios-posicao-2026-jun.xlsx";

// Ano base declarado pelo Tesouro pra essa publicação específica (dado do
// metadado da publicação, não vem como coluna — "Referência Siconfi:
// 01/06/2026 [...] O ano base dos dados é 2025 para todos os Municípios").
const ANO_BASE = 2025;

// ───────────────────────── utilidades binárias/ZIP ─────────────────────────
//
// Diferente da tentativa anterior (v3, descartada — servidor não aceita
// Range), aqui a gente baixa o arquivo inteiro UMA VEZ e mantém o ArrayBuffer
// inteiro em memória (24MB é tranquilo). O que evita o OOM é nunca
// descomprimir/parsear as abas que não interessam — a extração de cada
// "arquivo interno" do zip é feita por slice direto nesse buffer, sem novas
// requisições de rede.

async function baixarArquivoInteiro(url: string, timeoutMs = 60000): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Sentinela/BX4 (contato via portal do cliente)" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar o XLSX inteiro`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

async function inflateRaw(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const chunks: Uint8Array[] = [];
  const reader = ds.readable.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

interface EntradaZip {
  filename: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

function parseCentralDirectory(buf: ArrayBuffer): EntradaZip[] {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const dec = new TextDecoder("utf-8");
  const entries: EntradaZip[] = [];
  let pos = 0;
  while (pos + 46 <= buf.byteLength) {
    const sig = view.getUint32(pos, true);
    if (sig !== 0x02014b50) break; // fim dos registros de central directory
    const compressionMethod = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const filenameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const filename = dec.decode(bytes.subarray(pos + 46, pos + 46 + filenameLen));
    entries.push({ filename, compressionMethod, compressedSize, localHeaderOffset });
    pos += 46 + filenameLen + extraLen + commentLen;
  }
  return entries;
}

async function extrairEntradaZip(arquivoCompleto: ArrayBuffer, entrada: EntradaZip): Promise<string> {
  // O arquivo já está inteiro em memória — extrair uma entrada é só ler o
  // local file header no offset indicado pela central directory e fatiar os
  // bytes comprimidos dali, sem nenhuma requisição de rede nova.
  const inicio = entrada.localHeaderOffset;
  const view = new DataView(arquivoCompleto, inicio);
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error(`local file header inválido pra ${entrada.filename} (offset ${inicio})`);
  }
  const filenameLen = view.getUint16(26, true);
  const extraLen = view.getUint16(28, true);
  const dataStart = inicio + 30 + filenameLen + extraLen;
  const comprimido = new Uint8Array(arquivoCompleto, dataStart, entrada.compressedSize);
  const bruto = entrada.compressionMethod === 0 ? comprimido : await inflateRaw(comprimido);
  return new TextDecoder("utf-8").decode(bruto);
}

// ───────────────────────── utilidades XML (SpreadsheetML) ─────────────────────────

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&"); // por último, pra não desfazer entidades já decodificadas
}

function extrairSheets(xml: string): Array<{ name: string; rId: string }> {
  const out: Array<{ name: string; rId: string }> = [];
  const re = /<sheet\b([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const nameMatch = attrs.match(/name="([^"]*)"/);
    const ridMatch = attrs.match(/r:id="([^"]*)"/);
    if (nameMatch && ridMatch) out.push({ name: decodeXmlEntities(nameMatch[1]), rId: ridMatch[1] });
  }
  return out;
}

function extrairRels(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<Relationship\b([^>]*)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const idMatch = attrs.match(/Id="([^"]*)"/);
    const targetMatch = attrs.match(/Target="([^"]*)"/);
    if (idMatch && targetMatch) out[idMatch[1]] = targetMatch[1];
  }
  return out;
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const re = /<si>(.*?)<\/si>/gs;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const tRe = /<t[^>]*>(.*?)<\/t>/gs;
    let tm: RegExpExecArray | null;
    let texto = "";
    while ((tm = tRe.exec(m[1]))) texto += tm[1];
    out.push(decodeXmlEntities(texto));
  }
  return out;
}

function colLetterToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheetRows(xml: string, sharedStrings: string[]): Map<number, Map<number, string>> {
  const linhas = new Map<number, Map<number, string>>();
  const rowRe = /<row\b([^>]*)>(.*?)<\/row>/gs;
  let rm: RegExpExecArray | null;
  let contador = 0;
  while ((rm = rowRe.exec(xml))) {
    contador += 1;
    const rowAttrs = rm[1];
    const rowContent = rm[2];
    const rMatch = rowAttrs.match(/\br="(\d+)"/);
    const rowNum = rMatch ? parseInt(rMatch[1], 10) : contador;
    const celulas = new Map<number, string>();
    const cellRe = /<c\b([^>]*?)(?:\/>|>(.*?)<\/c>)/gs;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowContent))) {
      const attrs = cm[1];
      const inner = cm[2];
      const rAttr = attrs.match(/\br="([A-Z]+)\d+"/);
      if (!rAttr) continue;
      const colIdx = colLetterToIndex(rAttr[1]);
      const tAttr = attrs.match(/\bt="([a-zA-Z]+)"/);
      const tipo = tAttr ? tAttr[1] : "n";
      let valor = "";
      if (inner) {
        if (tipo === "s") {
          const vMatch = inner.match(/<v>(\d+)<\/v>/);
          if (vMatch) valor = sharedStrings[parseInt(vMatch[1], 10)] ?? "";
        } else if (tipo === "inlineStr") {
          const tRe = /<t[^>]*>(.*?)<\/t>/gs;
          let tm2: RegExpExecArray | null;
          let texto = "";
          while ((tm2 = tRe.exec(inner))) texto += tm2[1];
          valor = decodeXmlEntities(texto);
        } else {
          const vMatch = inner.match(/<v>(.*?)<\/v>/s);
          valor = vMatch ? decodeXmlEntities(vMatch[1]) : "";
        }
      }
      celulas.set(colIdx, valor);
    }
    linhas.set(rowNum, celulas);
  }
  return linhas;
}

function normalizar(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// ───────────────────────── handler ─────────────────────────

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: run } = await supabase
    .from("harvester_runs")
    .insert({ fonte: "capag", integracao: "capag", status: "em_execucao" })
    .select()
    .single();

  const diagnostico: string[] = [];
  const log = (msg: string) => diagnostico.push(`[${new Date().toISOString()}] ${msg}`);

  const { data: configs, error: cfgErr } = await supabase
    .from("harvester_config")
    .select("codigo_municipio_ibge")
    .eq("ativo", true)
    .not("codigo_municipio_ibge", "is", null);

  if (cfgErr) {
    await registrarIncidente(supabase, {
      integracao: "capag",
      runId: run?.id ?? null,
      severidade: "critico",
      titulo: "Falha ao ler harvester_config para escopo do capag-harvester",
      detalhe: cfgErr.message,
      acaoSugerida: "Verificar permissão de service_role em harvester_config (RLS).",
      contextoTecnico: { erro: amostra(cfgErr) },
    });
    await supabase.from("harvester_runs").update({ status: "erro", finalizado_em: new Date().toISOString() }).eq("id", run.id);
    return new Response(JSON.stringify({ erro: "config" }), { status: 500 });
  }

  const codigosAlvo = new Set((configs ?? []).map((c) => String(c.codigo_municipio_ibge)).filter(Boolean));

  let itensLidos = 0;
  let itensGravados = 0;
  const erros: Array<{ etapa: string; mensagem: string }> = [];

  try {
    log("baixando o XLSX inteiro (servidor não aceita Range — testado e confirmado) — 24MB cabe tranquilo em memória, o que travava era o parse completo, não o download");
    const arquivoCompleto = await baixarArquivoInteiro(CAPAG_XLSX_URL);
    log(`arquivo baixado: ${arquivoCompleto.byteLength} bytes`);

    log("procurando EOCD (índice do ZIP) no final do buffer já em memória");
    const eocdBytes = new Uint8Array(arquivoCompleto, Math.max(0, arquivoCompleto.byteLength - 65557));
    let eocdPos = -1;
    for (let i = eocdBytes.length - 22; i >= 0; i--) {
      if (eocdBytes[i] === 0x50 && eocdBytes[i + 1] === 0x4b && eocdBytes[i + 2] === 0x05 && eocdBytes[i + 3] === 0x06) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos === -1) throw new Error("assinatura EOCD não encontrada — arquivo pode não ser um ZIP válido ou ter zip64");
    const offsetBaseEocd = Math.max(0, arquivoCompleto.byteLength - 65557);
    const eocdView = new DataView(arquivoCompleto, offsetBaseEocd + eocdPos);
    const cdSize = eocdView.getUint32(12, true);
    const cdOffset = eocdView.getUint32(16, true);
    log(`índice ZIP (central directory): offset=${cdOffset} tamanho=${cdSize}`);

    log("parseando o índice ZIP (central directory)");
    const cdBuf = arquivoCompleto.slice(cdOffset, cdOffset + cdSize);
    const entradas = parseCentralDirectory(cdBuf);
    log(`índice ZIP parseado: ${entradas.length} arquivos internos listados`);

    const entradaPorNome = new Map(entradas.map((e) => [e.filename, e]));

    const wbEntry = entradaPorNome.get("xl/workbook.xml");
    const relsEntry = entradaPorNome.get("xl/_rels/workbook.xml.rels");
    if (!wbEntry || !relsEntry) {
      throw new Error(`xl/workbook.xml ou xl/_rels/workbook.xml.rels não encontrados no índice ZIP. Arquivos presentes (amostra): ${entradas.slice(0, 15).map((e) => e.filename).join(", ")}`);
    }

    log("extraindo xl/workbook.xml e xl/_rels/workbook.xml.rels (só esses 2 arquivos pequenos, sem tocar nas abas)");
    const wbXml = await extrairEntradaZip(arquivoCompleto, wbEntry);
    const relsXml = await extrairEntradaZip(arquivoCompleto, relsEntry);
    const sheets = extrairSheets(wbXml);
    const rels = extrairRels(relsXml);
    log(`abas encontradas no workbook: ${sheets.map((s) => s.name).join(" | ")}`);

    // Preferência: aba cujo nome normalizado contenha "previa" e "capag".
    let sheetAlvo = sheets.find((s) => {
      const n = normalizar(s.name);
      return n.includes("previa") && n.includes("capag");
    });

    const resolverEntradaDaAba = (sheet: { name: string; rId: string }): EntradaZip | undefined => {
      const target = rels[sheet.rId];
      if (!target) return undefined;
      const caminho = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      return entradaPorNome.get(caminho);
    };

    const sharedStringsEntry = entradaPorNome.get("xl/sharedStrings.xml");
    log(sharedStringsEntry ? `xl/sharedStrings.xml encontrado (${sharedStringsEntry.compressedSize} bytes comprimidos)` : "xl/sharedStrings.xml não existe nesse arquivo");
    const sharedStringsXml = sharedStringsEntry ? await extrairEntradaZip(arquivoCompleto, sharedStringsEntry) : "";
    const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
    log(`${sharedStrings.length} strings compartilhadas carregadas`);

    let sheetEscolhidaNome: string | null = null;
    let linhas: Map<number, Map<number, string>> | null = null;
    let cabecalhoMap: Map<number, string> = new Map();
    let idxCodigo = -1;
    let idxCapag = -1;

    const tentarAba = async (sheet: { name: string; rId: string }): Promise<boolean> => {
      const entrada = resolverEntradaDaAba(sheet);
      if (!entrada) {
        log(`aba "${sheet.name}" (rId=${sheet.rId}) não resolveu pra um arquivo real no ZIP — pulando`);
        return false;
      }
      log(`extraindo aba "${sheet.name}" (${entrada.filename}, ${entrada.compressedSize} bytes comprimidos)`);
      const sheetXml = await extrairEntradaZip(arquivoCompleto, entrada);
      const linhasAba = parseSheetRows(sheetXml, sharedStrings);
      const header = linhasAba.get(1);
      if (!header) return false;
      const mapaCabecalho = new Map<number, string>();
      for (const [idx, val] of header) mapaCabecalho.set(idx, normalizar(val));
      let iCodigo = -1;
      let iCapag = -1;
      for (const [idx, val] of mapaCabecalho) {
        if (val.includes("codigo") && val.includes("municipio")) iCodigo = idx;
        if (val === "capag") iCapag = idx;
      }
      if (iCodigo === -1 || iCapag === -1) {
        log(`aba "${sheet.name}" não tem cabeçalho com "Código Município"+"CAPAG" — cabeçalho real: ${JSON.stringify(Object.fromEntries(mapaCabecalho))}`);
        return false;
      }
      sheetEscolhidaNome = sheet.name;
      linhas = linhasAba;
      cabecalhoMap = mapaCabecalho;
      idxCodigo = iCodigo;
      idxCapag = iCapag;
      return true;
    };

    if (sheetAlvo) {
      log(`tentando aba pelo nome: "${sheetAlvo.name}"`);
      const ok = await tentarAba(sheetAlvo);
      if (!ok) sheetAlvo = undefined;
    }

    if (!sheetAlvo) {
      log("nome da aba não bateu — tentando todas as abas em ordem, da menor pra maior (evita baixar a aba grande à toa)");
      const candidatas = sheets
        .map((s) => ({ sheet: s, entrada: resolverEntradaDaAba(s) }))
        .filter((c) => c.entrada)
        .sort((a, b) => (a.entrada!.compressedSize - b.entrada!.compressedSize));
      for (const c of candidatas) {
        const ok = await tentarAba(c.sheet);
        if (ok) break;
      }
    }

    if (!linhas || idxCodigo === -1 || idxCapag === -1) {
      throw new Error(`Nenhuma aba com colunas "Código Município"+"CAPAG" foi encontrada. Abas testadas: ${sheets.map((s) => s.name).join(", ")}`);
    }

    log(`aba escolhida: "${sheetEscolhidaNome}" — coluna código=${idxCodigo}, coluna capag=${idxCapag}`);

    // acha os índices dos indicadores (opcionais — se não achar, grava null nesses campos)
    let idxInd1 = -1, idxNota1 = -1, idxInd2 = -1, idxNota2 = -1, idxInd3 = -1, idxNota3 = -1;
    for (const [idx, val] of cabecalhoMap) {
      if (val.includes("indicador 1")) idxInd1 = idx;
      if (val.includes("nota 1")) idxNota1 = idx;
      if (val.includes("indicador 2")) idxInd2 = idx;
      if (val.includes("nota 2")) idxNota2 = idx;
      if (val.includes("indicador 3")) idxInd3 = idx;
      if (val.includes("nota 3")) idxNota3 = idx;
    }

    const linhasAlvoEncontradas: Record<string, unknown> = {};

    for (const [, celulas] of linhas) {
      const codigo = (celulas.get(idxCodigo) ?? "").trim();
      if (!codigo || !codigosAlvo.has(codigo)) continue;

      itensLidos += 1;
      linhasAlvoEncontradas[codigo] = Object.fromEntries(celulas);

      const notaCapag = (celulas.get(idxCapag) ?? "").trim() || null;

      const { data: ente } = await supabase.from("orgaos").select("id").eq("codigo_ibge", codigo).maybeSingle();
      if (!ente) {
        erros.push({ etapa: `ente canônico não encontrado (ibge ${codigo})`, mensagem: "siconfi-harvester precisa rodar primeiro pra esse código IBGE." });
        continue;
      }

      const { data: fiscalExistente } = await supabase
        .from("orgao_fiscal")
        .select("id")
        .eq("orgao_id", ente.id)
        .eq("ano", ANO_BASE)
        .maybeSingle();

      const linhaCapag: Record<string, unknown> = {
        capag: notaCapag,
        capag_indicador_1: idxInd1 >= 0 ? (celulas.get(idxInd1) ?? null) : null,
        capag_nota_1: idxNota1 >= 0 ? (celulas.get(idxNota1) ?? null) : null,
        capag_indicador_2: idxInd2 >= 0 ? (celulas.get(idxInd2) ?? null) : null,
        capag_nota_2: idxNota2 >= 0 ? (celulas.get(idxNota2) ?? null) : null,
        capag_indicador_3: idxInd3 >= 0 ? (celulas.get(idxInd3) ?? null) : null,
        capag_nota_3: idxNota3 >= 0 ? (celulas.get(idxNota3) ?? null) : null,
      };

      if (fiscalExistente) {
        const { error: updErr } = await supabase.from("orgao_fiscal").update(linhaCapag).eq("id", fiscalExistente.id);
        if (updErr) erros.push({ etapa: `update orgao_fiscal.capag (ibge ${codigo})`, mensagem: updErr.message });
        else itensGravados += 1;
      } else {
        erros.push({ etapa: `orgao_fiscal ano=${ANO_BASE} não existe ainda (ibge ${codigo})`, mensagem: "Rode siconfi-harvester pra esse ano antes do capag-harvester." });
      }
    }

    log(`concluído: ${itensLidos} município(s) do recorte encontrados, ${itensGravados} gravado(s)`);

    await registrarIncidente(supabase, {
      integracao: "capag",
      runId: run.id,
      severidade: "info",
      titulo: `capag-harvester rodou — baixou o XLSX inteiro mas só descomprimiu a aba "${sheetEscolhidaNome}", ${itensLidos} município(s) encontrados`,
      detalhe: "Nunca materializou o workbook inteiro em memória (a aba grande 'Ano Base' nunca foi tocada) — só extraiu e descomprimiu os 2-3 arquivos internos do zip que interessam. Evidência bruta abaixo pra conferência manual.",
      acaoSugerida: itensLidos === 0 ? "Nenhum código do recorte foi encontrado — conferir código IBGE." : "Conferir contextoTecnico.linhasEncontradas.",
      contextoTecnico: { sheetEscolhidaNome, linhasEncontradas: amostra(linhasAlvoEncontradas, 3000), diagnostico: amostra(diagnostico, 4000) },
    });
  } catch (e) {
    erros.push({ etapa: "download + extração seletiva do XLSX CAPAG", mensagem: String(e) });
    await registrarIncidente(supabase, {
      integracao: "capag",
      runId: run.id,
      severidade: "critico",
      titulo: "capag-harvester falhou (download + extração seletiva dentro do Supabase)",
      detalhe: String(e),
      acaoSugerida: "Conferir contextoTecnico.diagnostico pra ver exatamente em que etapa parou. Se for erro de memória/timeout mesmo assim, o próximo passo é processar fora do Supabase (script local a cada publicação trimestral do Tesouro).",
      contextoTecnico: { urlArquivo: CAPAG_XLSX_URL, erro: amostra(String(e)), diagnostico: amostra(diagnostico, 4000) },
    });
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

  return new Response(JSON.stringify({ ok: true, itensLidos, itensGravados, erros, diagnostico }), {
    headers: { "Content-Type": "application/json" },
  });
});
