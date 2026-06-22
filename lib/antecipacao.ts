// Antecipação (Etapa 2) — ver a licitação se FORMANDO antes do edital.
// Combina dois sinais que JÁ existem no banco:
//   • PCA (raw_pca, planejado/pré-edital) — raro em município pequeno (lição F0).
//   • Recorrência (raw_editais homologados) — órgão que já comprou o objeto tende a repetir.
// Linguagem é PROBABILIDADE, nunca promessa (régua #1). Sem número de chance ainda.
import type { createClient } from "@/lib/supabase/server";
import { expandirBusca } from "@/lib/nichos";

type SB = Awaited<ReturnType<typeof createClient>>;

export type PcaItem = {
  id: string; descricao_item: string | null; valor_total: number | null;
  data_desejada: string | null; ano_pca: number | null; classe: string | null;
  cidade: string | null; cnpj_orgao: string | null;
  orgao: { razao_social: string | null } | null;
};
export type RecorrenciaItem = {
  numero_controle_pncp: string; objeto: string | null; valor_homologado: number | null;
  data_publicacao: string | null; cidade: string | null; cnpj_orgao: string | null;
  link_origem: string | null; orgao: { razao_social: string | null } | null;
};

export type Filtro = {
  busca: string; segmentos: string[]; uf: string;
  prontas: string[]; usandoFallbackUf: boolean; ufBusca: string | null;
};

const PCA_SELECT = "id, descricao_item, valor_total, data_desejada, ano_pca, classe, cidade, cnpj_orgao, uf_sigla, orgao:cnpj_orgao(razao_social)";
const REC_SELECT = "numero_controle_pncp, objeto, valor_homologado, data_publicacao, cidade, cnpj_orgao, uf_sigla, link_origem, orgao:cnpj_orgao(razao_social)";

/** Aplica o filtro de nicho (busca livre por sinônimos) OU o escopo do recorte (segmentos + cidade/UF). */
function aplicarFiltro<T>(q: T, campo: string, f: Filtro): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qq = q as any;
  if (f.busca) {
    const termos = expandirBusca(f.busca);
    if (termos.length) qq = qq.or(termos.map((t: string) => `${campo}.ilike.*${t}*`).join(","));
    // uf_sigla denormalizado na própria tabela (índice) + trigram no objeto = BitmapAnd rápido em qualquer UF.
    qq = qq.eq("uf_sigla", f.ufBusca);
  } else {
    qq = qq.overlaps("segmentos", f.segmentos);
    qq = f.usandoFallbackUf ? qq.eq("uf_sigla", f.uf) : qq.in("cidade", f.prontas);
  }
  return qq as T;
}

/** Itens de PCA (planejado, pré-edital) que casam o nicho/cidade ou a busca. */
export async function buscarPCA(sb: SB, f: Filtro): Promise<PcaItem[]> {
  let q = sb.from("raw_pca").select(PCA_SELECT);
  q = aplicarFiltro(q, "descricao_item", f);
  const { data } = await q.order("ano_pca", { ascending: false }).limit(40);
  return (data ?? []) as unknown as PcaItem[];
}

/** Recorrência: homologados (já comprados) que casam o nicho/cidade ou a busca → tende a repetir.
 *  Sem ORDER BY no banco (caro sobre o conjunto homologado nacional — causa timeout em UF grande);
 *  ordena em memória após o limit. */
export async function buscarRecorrencia(sb: SB, f: Filtro): Promise<RecorrenciaItem[]> {
  let q = sb.from("raw_editais").select(REC_SELECT).not("valor_homologado", "is", null);
  q = aplicarFiltro(q, "objeto", f);
  const { data } = await q.limit(60);
  const rows = (data ?? []) as unknown as RecorrenciaItem[];
  return rows.sort((a, b) => (b.data_publicacao ?? "").localeCompare(a.data_publicacao ?? "")).slice(0, 40);
}

// ---- Linha do Tempo de Sinais (Dashboard) ----
export type SinalLinha = {
  tipo: "pca" | "recorrencia" | "republicacao";
  selo: string; titulo: string; orgao: string; data: string | null; detalhe: string;
  tone: "navy" | "amber" | "slate"; link?: string | null;
};

const anoOuData = (ano: number | null, data: string | null) =>
  data ? data.slice(0, 10) : (ano ? String(ano) : null);

/** Converte PCA + recorrência em itens de timeline (calibrado: planejado/pode repetir, nunca "vai ter"). */
export function montarLinhaDoTempo(pca: PcaItem[], rec: RecorrenciaItem[], republicadas: RecorrenciaItem[] = []): SinalLinha[] {
  const linhas: SinalLinha[] = [];
  for (const p of pca.slice(0, 12)) {
    linhas.push({
      tipo: "pca", selo: `PCA ${p.ano_pca ?? ""}`.trim(),
      titulo: p.descricao_item ?? "Item planejado",
      orgao: p.orgao?.razao_social ?? "Órgão", data: anoOuData(p.ano_pca, p.data_desejada),
      detalhe: "Planejado no PCA — pode virar edital", tone: "navy", link: null,
    });
  }
  for (const r of rec.slice(0, 12)) {
    linhas.push({
      tipo: "recorrencia", selo: "recorrência",
      titulo: r.objeto ?? "Compra anterior",
      orgao: r.orgao?.razao_social ?? "Órgão", data: r.data_publicacao?.slice(0, 10) ?? null,
      detalhe: "Órgão já contratou esse objeto — tende a repetir no próximo ciclo", tone: "amber", link: r.link_origem,
    });
  }
  for (const r of republicadas.slice(0, 8)) {
    linhas.push({
      tipo: "republicacao", selo: "republicação",
      titulo: r.objeto ?? "Edital", orgao: r.orgao?.razao_social ?? "Órgão",
      data: r.data_publicacao?.slice(0, 10) ?? null,
      detalhe: "Fracassada/deserta — pode ser republicada", tone: "slate", link: r.link_origem,
    });
  }
  return linhas.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}
