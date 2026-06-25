import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2, ExternalLink, Sparkles, Trash2, FileText, Plus, Eye,
  FileSearch, Scale, MessagesSquare, DollarSign, Landmark, Lock, Gauge,
  ChevronRight, Clock, Wallet, Flag, ArrowLeft, FileDown, CalendarClock, History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, Badge, Button, Input, Progress } from "@/components/ui";
import { dataBR, pncpEditalUrl, diasAte } from "@/lib/utils";
import { buildResumo, type ResumoEdital } from "@/lib/resumo-edital";
import { temIA } from "@/lib/ai-server";
import { SECOES, NAO_INFO, type ResumoProfundo } from "@/lib/resumo-profundo";
import { itensAplicaveis, statusItem, calcProntidao, ITEM_STATUS_META } from "@/lib/habilitacao";
import { tokensDosSegmentos } from "@/lib/nichos";
import { SEG_LABEL } from "@/lib/segmentos";
import { inteligenciaMercado, gastoOrgaoNoNicho } from "@/lib/inteligencia";
import { orcamentoMunicipio, despesaPorFuncao, funcaoDoSegmento } from "@/lib/siconfi";
import { SEMAFORO_LABEL } from "@/lib/preco";
import { consultarLicitacao } from "@/lib/consultor";
import { montarSecoes, DECLARACOES_TIPICAS } from "@/lib/proposta";
import { classificarExigencias, CLASSE_META } from "@/lib/exigencias";
import { PropostaGerador } from "./proposta-gerador";
import { addDocLicitacao, deleteDocLicitacao, excluirLicitacao, analisarComIA, gerarResumoProfundo, gerarResumoProfundoUpload } from "./actions";
import { monitorar } from "../../radar/actions";
import { PastaActions } from "./pasta-actions";

type Parecer = {
  resumo?: string; riscos?: { nivel?: string; texto?: string }[];
  veredito?: { recomendacao?: string; probabilidade?: string; justificativa?: string; prontidao_pct?: number };
  empresa_edital?: { status?: string; faltam?: string[] }; erro?: string;
};
const brl = (n: number | null) => !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const dtBR = (s: string | null) => s ? dataBR(s.slice(0, 10)) : "—";

type Lic = { id: string; numero_controle_pncp: string; titulo: string | null; resumo_json: ResumoEdital | null;
  raw_editais: { objeto: string | null; valor_estimado: number | null; situacao_nome: string | null; data_publicacao: string | null; data_encerramento: string | null; modalidade_nome: string | null; cidade: string | null; link_origem: string | null; cnpj_orgao: string | null; uf_sigla: string | null; payload: unknown; orgao: { razao_social: string | null } | null } | null; };

function EmBreve({ icon: Icon, titulo, motivo }: { icon: React.ElementType; titulo: string; motivo: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Icon className="size-6 text-muted-foreground/60" /><p className="font-medium">{titulo}</p>
      <Badge variant="muted">em ingestão</Badge><p className="max-w-md text-sm text-muted-foreground">{motivo}</p>
    </div>
  );
}
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div className="flex items-start justify-between gap-4 py-2.5"><span className="text-sm text-muted-foreground">{label}</span><span className="text-right text-sm font-medium">{value || "—"}</span></div>);
}
function CardKV({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (<Card><CardContent className="p-4 md:p-5"><p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" /> {titulo}</p><div className="divide-y">{children}</div></CardContent></Card>);
}
// Cabeçalho de seção do Raio-X — número + título + a pergunta que a seção responde.
function SecHead({ n, icon: Icon, title, q }: { n?: number; icon: React.ElementType; title: string; q: string }) {
  return (
    <div className="flex items-start gap-2.5 border-l-4 border-primary pl-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div><h2 className="text-lg font-bold leading-tight">{n ? `${n}. ` : ""}{title}</h2><p className="text-sm text-muted-foreground">{q}</p></div>
    </div>
  );
}

export default async function LicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("licitacao")
    .select("id, numero_controle_pncp, titulo, resumo_json, raw_editais:numero_controle_pncp(objeto, valor_estimado, situacao_nome, data_publicacao, data_encerramento, modalidade_nome, cidade, link_origem, cnpj_orgao, uf_sigla, payload, orgao:cnpj_orgao(razao_social))")
    .eq("id", id).maybeSingle();
  const lic = data as unknown as Lic | null;
  if (!lic) notFound();
  const ed = lic.raw_editais;

  const admin = createAdminClient();
  // Resumo Executivo determinístico (cacheado em resumo_json — gera 1x)
  let resumo = lic.resumo_json;
  if (!resumo && ed?.payload) {
    resumo = buildResumo(ed.payload);
    await admin.from("licitacao").update({ resumo_json: resumo }).eq("id", id);
  }

  // Empresa × Edital (determinístico: checklist Lei 14.133 × documentos da empresa)
  const { data: company } = await supabase.from("company").select("segmentos, razao_social, cnpj, municipio, uf").maybeSingle();
  const { data: cdocs } = await supabase.from("documento").select("tipo, vencimento").eq("escopo", "company");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of cdocs ?? []) if (d.vencimento) docByTipo[d.tipo] = { vencimento: d.vencimento };
  const aplicaveis = itensAplicaveis(company?.segmentos?.length ? company.segmentos : ["generico"]);
  const itensStatus = aplicaveis.map((it) => ({ ...it, st: statusItem(docByTipo[it.key]) }));
  const faltam = itensStatus.filter((i) => i.st === "ausente" || i.st === "vencida");
  const { pct } = calcProntidao(aplicaveis, docByTipo);
  const statusEmp = faltam.length === 0 ? "apto" : pct >= 50 ? "ressalvas" : "nao_apto";
  const statusEmpLabel = { apto: "Apto", ressalvas: "Com ressalvas", nao_apto: "Não apto" }[statusEmp];
  const prob = pct >= 80 ? "alta" : pct >= 50 ? "média" : "baixa";
  const recomendacao = statusEmp === "apto" ? "Forte candidato — você atende a habilitação típica deste tipo de certame." : statusEmp === "ressalvas" ? "Avaliável — você atende parte da habilitação típica; resolva os documentos faltantes." : "Atenção — habilitação típica incompleta; prepare os documentos antes de disputar.";

  // IA INCLUSA (chave NOSSA no env, server-side) — não é BYOK. "Só funciona" quando a chave existe.
  const hasAI = temIA();
  const { data: analiseRow } = await supabase.from("analise").select("conteudo, modelo").eq("licitacao_id", id).eq("tipo", "completa").maybeSingle();
  const p = (analiseRow?.conteudo ?? null) as Parecer | null;
  // Resumo Profundo (18 seções) cacheado por edital. temExtracao = houve extração REAL (não só determinístico).
  const { data: rpRow } = await supabase.from("analise").select("conteudo").eq("licitacao_id", id).eq("tipo", "resumo_profundo").maybeSingle();
  const profundo = (rpRow?.conteudo ?? null) as ResumoProfundo | null;
  const temExtracao = !!profundo && profundo.fonte !== "deterministico";

  const { data: docs } = await supabase.from("documento").select("id, tipo, tipo_label").eq("licitacao_id", id).order("criado_em", { ascending: false });

  // Inteligência Comercial & de Mercado (Bloco 2) — quem ganha o nicho, faixa praticada, fornecedor atual do órgão.
  const intelTokens = tokensDosSegmentos(company?.segmentos?.length ? company.segmentos : []);
  const intel = await inteligenciaMercado(supabase, { tokens: intelTokens, uf: ed?.uf_sigla ?? null, cnpjOrgao: ed?.cnpj_orgao ?? null });

  // §1 "O órgão paga?" — orçamento REAL do município (Siconfi/Tesouro), por código IBGE do payload. Cacheado.
  const codigoIbge = ((ed?.payload as Record<string, unknown> | null)?.unidadeOrgao as { codigoIbge?: string } | undefined)?.codigoIbge ?? null;
  const orcamento = await orcamentoMunicipio(codigoIbge);

  // Quanto ESTE órgão gasta no SEU nicho: (1) gasto real PNCP (gold), (2) PCA planejado, (3) função orçamentária (aprox).
  const gasto = await gastoOrgaoNoNicho(supabase, ed?.cnpj_orgao ?? null, intelTokens, 12);
  const funcaoNicho = funcaoDoSegmento(company?.segmentos ?? []);
  const despFuncao = await despesaPorFuncao(codigoIbge, funcaoNicho);
  // PCA planejado do órgão no nicho (condicional — não inventa se não houver)
  let pcaTotal = 0, pcaN = 0;
  if (ed?.cnpj_orgao && intelTokens.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pr } = await (supabase.from("raw_pca").select("valor_total").eq("cnpj_orgao", ed.cnpj_orgao).or(intelTokens.map((t) => `descricao_item.ilike.*${t}*`).join(",")) as any).limit(100);
    for (const x of (pr ?? []) as { valor_total: number | null }[]) { if (x.valor_total) { pcaTotal += Number(x.valor_total) || 0; pcaN++; } }
  }
  const nichoLabel = (company?.segmentos ?? []).filter((s: string) => s !== "generico").map((s: string) => SEG_LABEL[s] ?? s).join(", ") || "seu nicho";

  // Consultor (Bloco 5) — determinístico, citando a Lei 14.133.
  const respostasConsultor = consultarLicitacao({
    itens: itensStatus, faltam, pct, statusEmp,
    valorEstimado: ed?.valor_estimado ?? null, modalidade: ed?.modalidade_nome ?? null, srp: resumo?.modalidade.srp ?? null,
  });

  // Gerador de Proposta (Bloco 6) — seções pré-preenchidas + matriz de atendimento.
  const secoesProposta = montarSecoes(
    { razao: company?.razao_social ?? null, cnpj: company?.cnpj ?? null, municipio: company?.municipio ?? null, uf: company?.uf ?? null },
    { numero: lic.numero_controle_pncp, objeto: ed?.objeto ?? null, orgao: ed?.orgao?.razao_social ?? null, modalidade: ed?.modalidade_nome ?? null, numeroCompra: resumo?.identificacao.numero_compra ?? null },
    intel.faixa,
  );
  // Checklist Inteligente: classifica as exigências ESPECÍFICAS extraídas do edital em estados acionáveis.
  const exigClassificadas = classificarExigencias(profundo?.exigencias_especificas);
  // Kit de Habilitação — índice na ORDEM do edital: específicas extraídas primeiro, depois habilitação típica.
  const kitProposta = [
    ...exigClassificadas.map((e, i) => ({ ordem: i + 1, nome: e.texto, status: CLASSE_META[e.classe].label })),
    ...itensStatus.map((it, i) => ({ ordem: exigClassificadas.length + i + 1, nome: it.label, status: ITEM_STATUS_META[it.st].label })),
  ];
  const matrizProposta = [
    ...itensStatus.map((it) => {
      const atendido = it.st !== "ausente" && it.st !== "vencida";
      return { id: `cert-${it.key}`, tipo: "certidao" as const, label: it.label, exigencia: it.orgao, atendido, evidencia: atendido ? "documento na ficha" : "—" };
    }),
    ...DECLARACOES_TIPICAS.map((d) => ({ id: `decl-${d.id}`, tipo: "declaracao" as const, label: d.titulo, exigencia: "declaração (Lei 14.133 / LC 123)", atendido: true, evidencia: "gerada no documento", declId: d.id })),
  ];

  // ---- Cabeçalho do Space (determinístico, visual do protótipo) ----
  const pncpUrl = pncpEditalUrl(lic.numero_controle_pncp);          // link OFICIAL do PNCP (corrige o bug do link_origem)
  const portalUrl = ed?.link_origem ?? resumo?.links.sistema_origem ?? null; // portal de ORIGEM (BLL/Compras.gov etc.)
  const portalLabel = (() => { try { return portalUrl ? new URL(portalUrl).hostname.replace(/^www\./, "") : null; } catch { return null; } })();
  const encerramentoISO = ed?.data_encerramento ?? resumo?.datas.encerramento ?? null;
  const sessaoISO = resumo?.datas.abertura ?? null;
  const diasPrazo = diasAte(encerramentoISO);
  const encerrada = diasPrazo != null && diasPrazo < 0;
  const diasSessao = diasAte(sessaoISO);
  const recompraDias = intel.contratoAtual[0]?.dias ?? null;        // sinal de recompra (contrato do órgão vencendo)
  const cidadeUf = ed?.cidade ? `${ed.cidade}${ed.uf_sigla ? ` — ${ed.uf_sigla}` : ""}` : (resumo?.orgao.municipio ? `${resumo.orgao.municipio}${resumo.orgao.uf ? ` — ${resumo.orgao.uf}` : ""}` : null);
  const totalExig = aplicaveis.length;
  const atendeExig = totalExig - faltam.length;
  const temN = itensStatus.filter((i) => i.st === "valida").length;
  const venceN = itensStatus.filter((i) => i.st === "a_renovar").length;
  const faltaN = itensStatus.filter((i) => i.st === "ausente" || i.st === "vencida").length;
  const objetoCurto = (ed?.objeto ?? lic.titulo ?? "").slice(0, 48);

  // Navegação do relatório (âncoras das seções)
  const NAV: [string, string][] = [
    ["resumo-profundo", "Resumo Profundo"], ["orgao", "O órgão"], ["intencao", "A intenção"],
    ["mercado", "Mercado"], ["voce", "Você"], ["veredito", "Veredito"], ["proposta", "Proposta"],
  ];

  return (
    <div className="space-y-4">
      {/* ===== Cabeçalho — Espaço Inteligente da Licitação (visual do protótipo) ===== */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-sidebar to-primary text-sidebar-foreground" data-testid="space-cabecalho">
        <div className="space-y-4 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground">
              <Link href="/radar"><ArrowLeft className="size-4" /> Voltar ao Radar</Link>
            </Button>
            <Badge variant={encerrada ? "destructive" : "secondary"} data-testid="space-situacao">{encerrada ? "Encerrada" : (ed?.situacao_nome ?? "Aberta")}</Badge>
            {recompraDias != null && <Badge variant="warning">Sinal de recompra · contrato vence em {recompraDias}d</Badge>}
            <Badge variant="secondary" className="bg-white/10 text-sidebar-foreground">Nº PNCP {lic.numero_controle_pncp}</Badge>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {pncpUrl && (
                <Button asChild size="sm" variant="secondary" className="bg-white/10 text-sidebar-foreground hover:bg-white/20" data-testid="link-pncp">
                  <a href={pncpUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Ver no PNCP</a>
                </Button>
              )}
              {portalUrl && (
                <Button asChild size="sm" variant="secondary" className="bg-white/10 text-sidebar-foreground hover:bg-white/20" data-testid="link-portal-origem">
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer"><FileDown className="size-4" /> Portal de origem{portalLabel ? ` (${portalLabel})` : ""}</a>
                </Button>
              )}
            </div>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-sidebar-foreground/70" data-testid="space-selo">
              ⬢ Raio-X da Contratação
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-sidebar-foreground/65">
              <Link href="/radar" className="hover:text-sidebar-foreground hover:underline">Radar</Link>
              {cidadeUf && <><ChevronRight className="size-3.5" /> <span>{cidadeUf}</span></>}
              {objetoCurto && <><ChevronRight className="size-3.5" /> <span className="truncate">{objetoCurto}{(ed?.objeto?.length ?? 0) > 48 ? "…" : ""}</span></>}
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{ed?.orgao?.razao_social ?? resumo?.orgao.razao_social ?? "Órgão responsável"}</h1>
            <p className="mt-2 max-w-4xl text-base leading-relaxed text-sidebar-foreground/85">{ed?.objeto ?? lic.titulo ?? "Objeto não informado"}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/10 pt-3 text-sm text-sidebar-foreground/85">
            {cidadeUf && <span><span className="text-sidebar-foreground/55">Cidade:</span> {cidadeUf}</span>}
            {resumo?.identificacao.numero_compra && <span><span className="text-sidebar-foreground/55">Edital nº:</span> {resumo.identificacao.numero_compra}</span>}
            {ed?.modalidade_nome && <span><span className="text-sidebar-foreground/55">Modalidade:</span> {ed.modalidade_nome}</span>}
            {sessaoISO && <span><span className="text-sidebar-foreground/55">Sessão:</span> {dtBR(sessaoISO)}{diasSessao != null && diasSessao >= 0 ? ` (em ${diasSessao} dias)` : ""}</span>}
            {portalLabel && <span><span className="text-sidebar-foreground/55">Portal:</span> {portalLabel}</span>}
          </div>
        </div>
      </div>

      {/* Toolbar operacional (monitorar / IA / pasta / excluir) */}
      <div className="flex flex-wrap items-center gap-2">
        <form action={monitorar}><input type="hidden" name="numero" value={lic.numero_controle_pncp} /><Button type="submit" size="sm" variant="outline"><Eye className="size-4" /> Monitorar</Button></form>
        {hasAI ? (
          <form action={analisarComIA}><input type="hidden" name="licitacao_id" value={lic.id} /><Button type="submit" size="sm" variant="outline"><Sparkles className="size-4" /> {p ? "Reanalisar com IA" : "Analisar com IA"}</Button></form>
        ) : (
          <Badge variant="muted" data-testid="ia-indisponivel">IA temporariamente indisponível</Badge>
        )}
        <PastaActions />
        <form action={excluirLicitacao} className="ml-auto"><input type="hidden" name="id" value={lic.id} /><Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /> Excluir</Button></form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="space-kpis">
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Wallet className="size-3.5" /> Valor estimado</p>
          <p className="mt-1 text-2xl font-bold leading-none">{brl(ed?.valor_estimado ?? null) ?? "—"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">teto do órgão (PNCP)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Flag className="size-3.5" /> Estágio</p>
          <p className="mt-1 text-2xl font-bold leading-none">{encerrada ? "Encerrado" : "Edital aberto"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{ed?.situacao_nome ?? "situação no PNCP"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Clock className="size-3.5" /> Prazo p/ proposta</p>
          <p className="mt-1 text-2xl font-bold leading-none">{diasPrazo == null ? "—" : encerrada ? "Encerrado" : `${diasPrazo} dias`}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{encerramentoISO ? `encerra ${dtBR(encerramentoISO)}` : "prazo no edital"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Gauge className="size-3.5" /> Sua prontidão</p>
          <p className="mt-1 text-2xl font-bold leading-none">{pct}%</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{atendeExig} de {totalExig} exigências · {statusEmpLabel}</p>
        </CardContent></Card>
      </div>

      {/* ===== RAIO-X: um relatório rolável (vale a pena? eu ganho? o órgão paga?) ===== */}
      <nav className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:rounded-lg md:border" data-testid="raiox-nav">
        {NAV.map(([anchor, label]) => (
          <a key={anchor} href={`#${anchor}`} className="whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground">{label}</a>
        ))}
      </nav>

      <div className="space-y-8" data-testid="raiox-relatorio">
        {/* ===== RESUMO PROFUNDO (topo) ===== */}
        <section id="resumo-profundo" className="scroll-mt-16 space-y-4" data-testid="profundo-tab">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight">Resumo Profundo do edital</h2>
              <p className="text-sm text-muted-foreground">As 18 seções extraídas do PDF real do edital. Cada campo é o que está no texto — ou “{NAO_INFO}”. Não inventamos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{brl(ed?.valor_estimado ?? null) ?? "—"}</span>
              {ed?.modalidade_nome && <Badge variant="outline">{ed.modalidade_nome}{ed?.situacao_nome ? ` · ${ed.situacao_nome}` : ""}</Badge>}
              {sessaoISO && <span>sessão {dtBR(sessaoISO)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasAI ? (
              <form action={gerarResumoProfundo}><input type="hidden" name="licitacao_id" value={lic.id} />
                <Button type="submit" size="sm" data-testid="gerar-profundo"><Sparkles className="size-4" /> {temExtracao ? "Regerar resumo profundo" : "Gerar resumo profundo (PNCP)"}</Button>
              </form>
            ) : (
              <Badge variant="muted" data-testid="profundo-ia-off">IA temporariamente indisponível — mostrando o determinístico</Badge>
            )}
            {profundo && <Badge variant="muted" data-testid="profundo-fonte">{profundo.fonte === "ia" ? `extraído por IA (${profundo.modelo})` : profundo.fonte === "cache" ? "reaproveitado do cache (sem novo custo)" : "documento ainda não extraído"}</Badge>}
            <Badge variant="muted">Exportar (.docx / e-mail / imprimir) — em breve</Badge>
          </div>

          {!temExtracao ? (
            <div className="space-y-4" data-testid="profundo-indisponivel">
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4" /> Documento do edital ainda não extraído</p>
                <p className="mt-1 text-sm text-muted-foreground">{profundo?.aviso ?? (hasAI ? "Clique em “Gerar resumo profundo (PNCP)” para tentar o documento no PNCP. Se o edital estiver só no portal de origem, baixe lá e envie o PDF." : "A IA está temporariamente indisponível. O resumo determinístico do PNCP segue abaixo.")}</p>
              </div>
              {hasAI && (
                <Card><CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold">Como obter o documento</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {portalUrl && (
                      <Button asChild size="sm" data-testid="baixar-portal-origem">
                        <a href={portalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Baixar no portal de origem{portalLabel ? ` (${portalLabel})` : ""}</a>
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">o edital costuma ficar no portal de origem (BLL/Compras) — baixe e envie aqui</span>
                  </div>
                  <form action={gerarResumoProfundoUpload} className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3" data-testid="form-upload-edital">
                    <input type="hidden" name="licitacao_id" value={lic.id} />
                    <input type="file" name="pdf" accept="application/pdf,.pdf" required data-testid="input-pdf"
                      className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground" />
                    <Button type="submit" size="sm" variant="outline" data-testid="enviar-pdf"><FileDown className="size-4" /> Extrair do PDF enviado</Button>
                  </form>
                  <p className="text-xs text-muted-foreground">A captura automática do portal de origem (BLL/Compras) é roadmap — cada portal é uma integração própria. Por ora, o upload manual já desbloqueia a extração completa.</p>
                </CardContent></Card>
              )}
              {resumo && (
                <CardKV icon={FileSearch} titulo="Resumo determinístico (PNCP)">
                  <KV label="Objeto" value={resumo.identificacao.objeto} />
                  <KV label="Órgão" value={resumo.orgao.razao_social} />
                  <KV label="Modalidade" value={resumo.modalidade.modalidade} />
                  <KV label="Data da sessão" value={dtBR(resumo.datas.abertura)} />
                  <KV label="Encerramento de propostas" value={dtBR(resumo.datas.encerramento)} />
                  <KV label="Valor estimado" value={brl(resumo.valores.estimado)} />
                  <KV label="Amparo legal" value={resumo.amparo_legal.nome} />
                </CardKV>
              )}
              <p className="text-xs text-muted-foreground">As 18 seções (habilitação, atestado, prazos, penalidades, análise crítica…) aparecem aqui após a extração real do PDF.</p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="profundo-conteudo">
              {profundo.aviso && <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">{profundo.aviso}</p>}
              <div className="space-y-2">
                {SECOES.map((sec) => {
                  const val = profundo.secoes[sec.key] || NAO_INFO;
                  const vazio = val === NAO_INFO;
                  const borda = sec.tom === "vermelho" ? "border-destructive/40" : sec.tom === "ambar" ? "border-warning/40" : "";
                  return (
                    <details key={sec.key} className={`rounded-lg border ${borda} bg-card`} data-testid="profundo-secao">
                      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium">
                        {sec.tom === "vermelho" && <span className="text-destructive">●</span>}
                        {sec.tom === "ambar" && <span className="text-warning">●</span>}
                        <span className="flex-1">{sec.titulo}</span>
                        {vazio && <Badge variant="muted">{NAO_INFO}</Badge>}
                      </summary>
                      <div className={`border-t px-4 py-3 text-sm ${sec.tom === "vermelho" ? "bg-destructive/5" : sec.tom === "ambar" ? "bg-warning/5" : ""}`}>
                        <p className="whitespace-pre-line text-muted-foreground">{val}</p>
                        {sec.key === "analise_critica" && <p className="mt-2 text-xs text-muted-foreground">⚠️ É uma <strong>análise</strong> (apoio à decisão), <strong>não um parecer jurídico</strong>.</p>}
                        {sec.key === "atestado" && profundo.exigencias_especificas.length > 0 && (
                          <ul className="mt-2 list-disc space-y-0.5 pl-5">{profundo.exigencias_especificas.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ===== RESUMO determinístico do edital ===== */}
        <section id="resumo" className="scroll-mt-16 space-y-4">
          {resumo ? (
            <div className="space-y-4" data-testid="resumo-edital">
              <div>
                <h2 className="text-lg font-bold leading-tight">Resumo do edital</h2>
                <p className="text-sm text-muted-foreground">Montado direto do PNCP (determinístico). O interpretativo com IA é opcional.</p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <CardKV icon={FileSearch} titulo="Identificação da licitação">
                  <KV label="Objeto" value={resumo.identificacao.objeto} />
                  <KV label="Número da licitação" value={resumo.identificacao.numero_compra ?? resumo.identificacao.numero_controle} />
                  <KV label="Modalidade" value={resumo.modalidade.modalidade ? `${resumo.modalidade.modalidade}${resumo.situacao ? ` — ${resumo.situacao}` : ""}` : null} />
                  <KV label="UASG / unidade" value={resumo.identificacao.uasg ? `${resumo.identificacao.uasg}${resumo.identificacao.unidade ? ` — ${resumo.identificacao.unidade}` : ""}` : resumo.identificacao.unidade} />
                  <KV label="Portal de realização" value={portalLabel ?? resumo.identificacao.portal} />
                  <KV label="Modo de disputa" value={resumo.modalidade.modo_disputa} />
                  <KV label="Registro de preços (SRP)" value={resumo.modalidade.srp == null ? "—" : resumo.modalidade.srp ? "Sim" : "Não"} />
                  <KV label="Valor estimado" value={brl(resumo.valores.estimado)} />
                </CardKV>
                <CardKV icon={Clock} titulo="Sessão pública">
                  <KV label="Data da sessão" value={dtBR(resumo.datas.abertura)} />
                  <KV label="Encerramento de propostas" value={dtBR(resumo.datas.encerramento)} />
                  <KV label="Publicação no PNCP" value={dtBR(resumo.datas.publicacao)} />
                  <KV label="Órgão" value={resumo.orgao.razao_social} />
                  <KV label="Município/UF" value={resumo.orgao.municipio ? `${resumo.orgao.municipio}/${resumo.orgao.uf}` : null} />
                  <KV label="Esclarecimentos / impugnação / cota ME-EPP" value={<Badge variant="muted">no texto do edital</Badge>} />
                </CardKV>
              </div>
              {p?.resumo && <Card><CardContent className="p-4"><div className="mb-1 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><p className="text-sm font-semibold">Resumo interpretativo (IA)</p></div><p className="whitespace-pre-line text-sm text-muted-foreground">{p.resumo}</p></CardContent></Card>}
            </div>
          ) : (
            <div className="space-y-4" data-testid="resumo-edital">
              <div><h2 className="text-lg font-bold leading-tight">Resumo do edital</h2><p className="text-sm text-muted-foreground">Montado direto do PNCP (determinístico).</p></div>
              <EmBreve icon={FileSearch} titulo="Baixar documento para detalhar" motivo="Ainda não há payload do PNCP desta licitação para montar o resumo." />
            </div>
          )}
        </section>

        {/* ===== §1 O ÓRGÃO — ele paga? (CAPAG + orçamento) ===== */}
        <section id="orgao" className="scroll-mt-16 space-y-3">
          <SecHead n={1} icon={Landmark} title="O órgão — ele paga?" q="Orçamento e execução do ente (Siconfi/Tesouro) + capacidade fiscal." />
          <Card data-testid="raiox-orgao"><CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{ed?.orgao?.razao_social ?? resumo?.orgao.razao_social ?? "Órgão"}</span>
              {cidadeUf && <Badge variant="muted">{cidadeUf}</Badge>}
              {orcamento?.porte && <Badge variant="secondary" data-testid="orgao-porte">porte {orcamento.porte}</Badge>}
            </div>
            {orcamento ? (
              <>
                <div className="divide-y" data-testid="orgao-orcamento">
                  <KV label="Orçamento previsto (ano)" value={brl(orcamento.receitaPrevista)} />
                  <KV label="Receita realizada (até o período)" value={orcamento.receitaRealizada != null ? `${brl(orcamento.receitaRealizada)}${orcamento.execucaoReceitaPct != null ? ` · ${orcamento.execucaoReceitaPct}% da previsão` : ""}` : "—"} />
                  <KV label="Despesa liquidada (até o período)" value={brl(orcamento.despesaLiquidada)} />
                  <KV label="População" value={orcamento.populacao != null ? new Intl.NumberFormat("pt-BR").format(orcamento.populacao) : "—"} />
                  <KV label="Nota CAPAG (capacidade de pagamento)" value={<Badge variant="muted">em ingestão</Badge>} />
                </div>
                <p className="text-xs text-muted-foreground" data-testid="siconfi-fonte">Fonte: {orcamento.fonte} · consultado <span data-testid="siconfi-consultado">{orcamento.consultadoEm.slice(0, 19).replace("T", " ")} UTC</span></p>
              </>
            ) : (
              <div className="divide-y">
                <KV label="Orçamento / execução (Siconfi)" value={<Badge variant="muted">sem registro no Siconfi</Badge>} />
                <KV label="Nota CAPAG (Tesouro)" value={<Badge variant="muted">em ingestão</Badge>} />
              </div>
            )}
            {temExtracao && profundo?.secoes.orgao_capag && profundo.secoes.orgao_capag !== NAO_INFO && <p className="text-sm text-muted-foreground">{profundo.secoes.orgao_capag}</p>}
            <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">⚠️ Orçamento robusto indica <strong>saúde fiscal</strong> — <strong>não é garantia de pontualidade</strong> de pagamento ao fornecedor. A nota CAPAG (dataset próprio do Tesouro) entra na sequência.</p>
          </CardContent></Card>

          {/* Quanto este órgão gasta NO SEU NICHO — 3 fontes (real → planejado → aproximação) */}
          <Card data-testid="gasto-nicho"><CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><DollarSign className="size-4 text-primary" /> Quanto este órgão gasta em {nichoLabel}</p>
            {/* #1 GOLD — gasto histórico real (PNCP) */}
            {gasto.temDado ? (
              <div data-testid="gasto-real">
                <p className="text-2xl font-bold leading-none text-primary">{brl(gasto.total)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ed?.orgao?.razao_social ?? "Este órgão"} comprou em <strong>{nichoLabel}</strong> nos últimos {gasto.meses} meses · {gasto.n} {gasto.fonte === "contratos" ? "contrato(s)" : "edital(is) homologado(s)"} · ticket médio {brl(gasto.ticketMedio)}</p>
                <Badge variant="muted" className="mt-1">fonte: {gasto.fonte === "contratos" ? "contratos firmados (PNCP)" : "homologados (PNCP)"}</Badge>
              </div>
            ) : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground" data-testid="gasto-sem-registro">Sem registro de compra desse nicho neste órgão (PNCP, últimos 12 meses). <strong>Não inventamos um valor.</strong></p>
            )}
            <div className="divide-y border-t pt-1">
              <KV label="Planejado (PCA do órgão no nicho)" value={pcaN > 0 ? `${brl(pcaTotal)} · ${pcaN} item(ns)` : <Badge variant="muted">não declarado</Badge>} />
              <KV label="Dotação reservada no edital" value={temExtracao ? "ver Resumo Profundo (texto do edital)" : <Badge variant="muted">não informado no edital</Badge>} />
              <KV label={despFuncao ? `Função “${despFuncao.funcao}” (aproximação)` : "Função orçamentária"} value={despFuncao ? `${brl(despFuncao.liquidada)} liquidado/ano · exercício ${despFuncao.exercicio}` : <Badge variant="muted">{funcaoNicho ? "sem dado no Siconfi" : "em ingestão"}</Badge>} />
            </div>
            <p className="text-xs text-muted-foreground">“Orçamento de {nichoLabel}” <strong>não existe como número público fechado</strong>. Mostramos a melhor proxy real (gasto histórico do órgão), o planejado (PCA) e a função orçamentária — esta <strong>engloba muito além do nicho</strong> (aproximação).</p>
          </CardContent></Card>
        </section>

        {/* ===== §2 A INTENÇÃO — vai nascer (de novo)? (PCA + IRP + contrato vencendo) ===== */}
        <section id="intencao" className="scroll-mt-16 space-y-3">
          <SecHead n={2} icon={CalendarClock} title="A intenção — vai nascer?" q="PCA, IRP e contrato vigente vencendo — a janela de entrada. Probabilidade, não promessa." />
          <Card data-testid="raiox-intencao"><CardContent className="space-y-2 p-4">
            {intel.contratoAtual.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="warning">{intel.contratoAtual[0].dias != null ? `contrato vence em ${intel.contratoAtual[0].dias}d` : "contrato vigente"}</Badge>
                <span>O órgão tem contrato no seu nicho — <strong>janela de relicitação</strong> quando vencer.</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem contrato vigente do órgão no seu nicho na base atual.</p>
            )}
            <div className="divide-y">
              <KV label="Plano de Contratações Anual (PCA)" value={<Badge variant="muted">em ingestão</Badge>} />
              <KV label="IRP — Intenção de Registro de Preços" value={<Badge variant="muted">roadmap · fonte não pública</Badge>} />
            </div>
            <p className="text-xs text-muted-foreground">O <strong>PCA</strong> (plano de contratações) acende com a coleta do plano. O <strong>IRP</strong> é o sinal pré-edital mais forte, mas <strong>não há API pública de consulta</strong> (vive no sistema transacional do Compras.gov) — roadmap, não inventamos.</p>
          </CardContent></Card>
        </section>

        {/* ===== §3–5 MERCADO — o passado, a concorrência e o preço ===== */}
        <section id="mercado" className="scroll-mt-16 space-y-3">
          <SecHead n={3} icon={History} title="O mercado — passado, concorrência e preço" q="Já rolou esse objeto? Quem costuma aparecer? Qual faixa ganha?" />
          {(intel.contratoAtual.length > 0 || intel.concorrentes.length > 0 || intel.faixa) ? (
            <div className="space-y-4" data-testid="sala-inteligencia">
              <Card><CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2"><DollarSign className="size-4 text-primary" /><p className="text-sm font-semibold">Quem fornece hoje (contrato vigente)</p></div>
                {intel.contratoAtual.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Sem contrato vigente desse órgão no seu nicho na base atual (em ingestão).</p>
                ) : (
                  <ul className="divide-y rounded-md border" data-testid="contrato-atual">
                    {intel.contratoAtual.map((c, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                        <Badge variant="warning">{c.dias != null ? `vence em ${c.dias}d` : "vigente"}</Badge>
                        <span className="font-medium">{c.nome ?? "Fornecedor"}</span>
                        <span className="text-xs text-muted-foreground">{c.objeto?.slice(0, 60)}</span>
                        <span className="ml-auto font-semibold">{brl(c.valor) ?? "—"}</span>
                      </li>))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">O contrato atual vencendo é a <strong>janela de entrada</strong>: o órgão tende a relicitar o objeto.</p>
              </CardContent></Card>

              <Card><CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2"><Building2 className="size-4 text-primary" /><p className="text-sm font-semibold">Seus concorrentes no nicho ({ed?.uf_sigla ?? "UF"})</p></div>
                {intel.concorrentes.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Sem contratos do nicho nesta UF na base atual.</p>
                ) : (
                  <ul className="divide-y rounded-md border" data-testid="concorrentes">
                    {intel.concorrentes.map((c) => (
                      <li key={c.ni} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                        <span className="font-medium">{c.nome ?? c.ni}</span>
                        <Badge variant="secondary">{c.n} contrato{c.n > 1 ? "s" : ""}</Badge>
                        <span className="ml-auto text-xs text-muted-foreground">total {brl(c.valorTotal)}</span>
                      </li>))}
                  </ul>
                )}
                {intel.faixa && (
                  <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3" data-testid="faixa-valor">
                    <div className="flex flex-wrap items-center gap-2">
                      <DollarSign className="size-4 text-primary" />
                      <p className="text-sm font-semibold">Motor de preço — quanto cobrar</p>
                      <Badge variant={intel.faixa.semaforo === "verde" ? "success" : intel.faixa.semaforo === "amarelo" ? "warning" : "destructive"} data-testid="cv-semaforo">CV {(intel.faixa.cv * 100).toFixed(0)}% · {SEMAFORO_LABEL[intel.faixa.semaforo]}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">{intel.faixa.n} contratos</span>
                    </div>
                    {intel.faixa.confiavel ? (
                      <div className="grid grid-cols-3 gap-2 text-center text-sm" data-testid="faixas-preco">
                        <div className="rounded-md border bg-card p-2"><p className="text-xs uppercase text-muted-foreground">Vencedora</p><p className="font-semibold">{brl(intel.faixa.vencedora)}</p></div>
                        <div className="rounded-md border bg-card p-2"><p className="text-xs uppercase text-muted-foreground">Segura</p><p className="font-semibold">{brl(intel.faixa.segura)}</p></div>
                        <div className="rounded-md border bg-card p-2"><p className="text-xs uppercase text-muted-foreground">Agressiva</p><p className="font-semibold">{brl(intel.faixa.agressiva)}</p></div>
                      </div>
                    ) : (
                      <p className="rounded border border-warning/40 bg-warning/10 px-2 py-1 text-xs" data-testid="recusa-honesta">⚠️ {intel.faixa.motivoRecusa}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Piso de inexequibilidade (ref.): abaixo de <strong>{brl(intel.faixa.pisoInexequivel)}</strong> há risco de desclassificação (Lei 14.133, art. 59). Faixa observada {brl(intel.faixa.min)}–{brl(intel.faixa.max)} · mediana {brl(intel.faixa.mediana)}.</p>
                  </div>
                )}
                <p className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Referência de <strong>contratos firmados</strong> (PNCP), <strong>não recomendação de preço — a empresa decide</strong>. Resultado por item/lances (deserta, nº participantes) entra com a coleta de resultados (em ingestão).</p>
              </CardContent></Card>
            </div>
          ) : <EmBreve icon={DollarSign} titulo="Mercado (passado, concorrência, preço)" motivo="Sem contratos do seu nicho nesta UF na base atual. Acende conforme a coleta de contratos avança (em ingestão)." />}
        </section>

        {/* ===== §6 VOCÊ — prontidão (cofre × exigências) ===== */}
        <section id="voce" className="scroll-mt-16 space-y-3">
          <SecHead n={6} icon={Gauge} title="Você — está habilitado?" q="Suas certidões e documentos cruzados com a habilitação exigida (Checklist Vivo)." />
          <div className="space-y-4" data-testid="exigencias-tab">
            <div className="flex flex-wrap items-center gap-2" data-testid="exigencias-contagem">
              <Badge variant="default">✓ {temN} você tem</Badge>
              <Badge variant="warning">⚠ {venceN} vencendo</Badge>
              <Badge variant="destructive">✕ {faltaN} falta</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{pct}% pronto · {atendeExig} de {totalExig} exigências</span>
            </div>
            <Card><CardContent className="p-0">
              <ul className="divide-y">
                {itensStatus.map((it) => {
                  const venc = docByTipo[it.key]?.vencimento ?? null;
                  const d = diasAte(venc);
                  const tag = it.st === "valida" ? { v: "default" as const, t: "✓ você tem" }
                    : it.st === "a_renovar" ? { v: "warning" as const, t: d != null ? `⚠ vence em ${d}d` : "⚠ vencendo" }
                    : it.st === "vencida" ? { v: "destructive" as const, t: "✕ vencida" }
                    : { v: "destructive" as const, t: "✕ falta" };
                  const acao = it.st === "valida" ? "Ver no cofre" : it.st === "ausente" ? "Anexar" : "Renovar";
                  return (
                    <li key={it.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3" data-testid="exigencia-item">
                      <Badge variant={tag.v} data-testid={`tag-${it.st}`}>{tag.t}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{it.label}</p>
                        <p className="text-xs text-muted-foreground">Fonte: habilitação típica · Lei 14.133 · emissor: {it.orgao}{venc ? ` · vence ${dtBR(venc)}` : ""}</p>
                      </div>
                      {it.st !== "valida" && sessaoISO && <span className="text-xs text-muted-foreground">resolver até a sessão {dtBR(sessaoISO)}</span>}
                      <Button asChild size="sm" variant={it.st === "valida" ? "ghost" : "outline"}><Link href="/empresa">{acao}</Link></Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              {exigClassificadas.length > 0 ? (
                <div data-testid="exig-especificas">
                  <div className="flex flex-wrap items-center gap-2"><FileSearch className="size-4 text-primary" /><p className="text-sm font-semibold">Exigências específicas deste edital</p><Badge variant="muted">{exigClassificadas.length} lidas do edital</Badge></div>
                  <ul className="mt-2 divide-y rounded-md border">
                    {exigClassificadas.map((e, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-sm" data-testid="exig-item" data-classe={e.classe}>
                        <Badge variant={e.geravel ? "default" : "outline"} data-testid={`exig-classe-${e.classe}`}>{CLASSE_META[e.classe].label}</Badge>
                        <span className="min-w-0 flex-1">{e.texto}</span>
                        {e.geravel
                          ? <Button asChild size="sm" variant="outline" data-testid="exig-gerar"><Link href="#proposta">{e.acao}</Link></Button>
                          : e.classe === "certidao"
                            ? <Button asChild size="sm" variant="ghost"><Link href="/empresa">{e.acao}</Link></Button>
                            : <span className="text-xs text-muted-foreground">{e.acao}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Lidas do texto do edital (Resumo Profundo) e classificadas: <strong>declaração</strong> a gerar aqui, <strong>certidão</strong> no cofre, <strong>atestado/índice/vistoria</strong> a providenciar. Nada some sem você ver — o que não dá pra classificar fica como “verificar”, não inventamos estado.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2"><FileSearch className="size-4 text-primary" /><p className="text-sm font-semibold">Exigências específicas deste edital</p><Badge variant="muted" data-testid="exig-em-extracao">em extração</Badge></div>
                  <p className="mt-1 text-xs text-muted-foreground">As exigências do <strong>texto do edital</strong> (ex.: <em>atestado ≥ 100.000 m²</em>, índices contábeis, vistoria, amostra) entram ao gerar o <strong>Resumo Profundo</strong>. <strong>Não inventamos exigência que não lemos.</strong></p>
                </>
              )}
            </CardContent></Card>
            {/* Empresa × Edital — checklist completo Lei 14.133 */}
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{company?.razao_social ?? "Sua empresa"} × Edital</p>
                <Badge variant={statusEmp === "apto" ? "success" : statusEmp === "nao_apto" ? "destructive" : "warning"}>{statusEmpLabel}</Badge>
                <Badge variant="muted">{pct}% pronto</Badge>
              </div>
              <ul className="mt-3 divide-y rounded-md border">
                {itensStatus.map((it) => { const m = ITEM_STATUS_META[it.st]; return (
                  <li key={it.key} className="flex items-center gap-3 p-2.5"><Badge variant={m.badge}>{m.label}</Badge><span className="flex-1 text-sm">{it.label}</span><span className="text-xs text-muted-foreground">{it.orgao}</span></li>);
                })}
              </ul>
              {faltam.length > 0 && <p className="mt-2 text-sm text-destructive">Faltam {faltam.length} documento(s): {faltam.map((f) => f.label).join(", ")}.</p>}
            </CardContent></Card>
            <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Prontidão é <strong>fato</strong> (cofre × habilitação típica da Lei 14.133), <strong>não “chance de ganhar”</strong>. O checklist se ajusta quando as exigências específicas forem extraídas.</p>
          </div>
        </section>

        {/* ===== §7 VEREDITO — vale entrar? ===== */}
        <section id="veredito" className="scroll-mt-16 space-y-3">
          <SecHead n={7} icon={Scale} title="Veredito — vale entrar?" q="Recomendação calibrada pela sua prontidão. Estimativa, não promessa." />
          <Card><CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-2"><Gauge className="size-4 text-primary" /><p className="text-sm font-semibold">Veredito calibrado</p>
              <Badge variant="secondary">probabilidade {prob}</Badge><Badge variant="muted">{pct}% pronto</Badge></div>
            <p className="mt-2 text-sm font-medium">{recomendacao}</p>
            <Progress value={pct} className="mt-2" />
            <p className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">⚠️ Recomendação calibrada (probabilística) com base na sua prontidão documental — <strong>não é garantia de resultado</strong>. Decisão e responsabilidade são suas.</p>
          </CardContent></Card>
          {p?.veredito && <Card><CardContent className="p-4"><div className="mb-1 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><p className="text-sm font-semibold">Veredito interpretativo (IA)</p></div>
            <p className="text-sm font-medium">{p.veredito.recomendacao}</p><p className="text-sm text-muted-foreground">{p.veredito.justificativa}</p></CardContent></Card>}
        </section>

        {/* ===== PREPARAR PROPOSTA ===== */}
        <section id="proposta" className="scroll-mt-16 space-y-3">
          <SecHead icon={FileText} title="Preparar proposta" q="Monte a proposta seção a seção + matriz de atendimento (item → evidência)." />
          <PropostaGerador secoes={secoesProposta} declaracoes={DECLARACOES_TIPICAS} matriz={matrizProposta} proponente={company?.razao_social ?? "Proponente"} objeto={ed?.objeto ?? null} orgao={ed?.orgao?.razao_social ?? null} timbre={{ razao: company?.razao_social ?? null, cnpj: company?.cnpj ?? null, municipio: company?.municipio ?? null, uf: company?.uf ?? null }} kit={kitProposta} />
        </section>

        {/* ===== APOIO — plano, documentos, consultor, riscos ===== */}
        <section id="apoio" className="scroll-mt-16 space-y-4">
          <SecHead icon={MessagesSquare} title="Apoio à execução" q="Plano de ação, documentos do processo, consultor (Lei 14.133) e riscos." />

          <Card><CardContent className="p-4">
            <p className="mb-2 text-sm font-semibold">Plano de ação</p>
            {faltam.length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Habilitação típica completa. Acompanhe os prazos do edital.</p> : (
              <ul className="space-y-2">{faltam.map((f) => (
                <li key={f.key} className="flex items-center gap-2 rounded-md border p-2.5 text-sm"><span className="size-2 rounded-full bg-destructive" /><span className="flex-1">Providenciar <strong>{f.label}</strong> ({f.orgao})</span><Button asChild size="sm" variant="ghost"><Link href="/empresa">Resolver</Link></Button></li>))}
              </ul>)}
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-sm font-semibold">Documentos do processo</p></div>
            {(docs ?? []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum documento ainda.</p> : (
              <ul className="mb-3 divide-y rounded-md border">{(docs ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-3 p-3"><FileText className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{d.tipo_label}</span><Badge variant="muted">{d.tipo}</Badge>
                  <form action={deleteDocLicitacao}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="licitacao_id" value={lic.id} /><button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button></form>
                </li>))}
              </ul>)}
            <form action={addDocLicitacao} className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row"><input type="hidden" name="licitacao_id" value={lic.id} /><Input name="nome" placeholder="Nome do documento (ex.: Edital, TR, ETP)" required className="flex-1" /><Button type="submit"><Plus className="size-4" /> Adicionar</Button></form>
          </CardContent></Card>

          <div className="space-y-3" data-testid="consultor">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2"><MessagesSquare className="size-4 text-primary" /><p className="text-sm font-semibold">Consultor — habilitação & participação</p></div>
              <p className="mt-1 text-xs text-muted-foreground">Respostas <strong>determinísticas</strong> com base na sua ficha × habilitação típica, <strong>citando a Lei 14.133</strong>.</p>
            </CardContent></Card>
            {respostasConsultor.map((r, i) => (
              <Card key={i} data-testid="consultor-qa"><CardContent className="p-4">
                <p className="text-sm font-semibold">{r.pergunta}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.resposta}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={r.tom === "ok" ? "success" : r.tom === "alerta" ? "destructive" : "muted"}>{r.tom === "ok" ? "ok" : r.tom === "alerta" ? "atenção" : "info"}</Badge>
                  <span className="text-xs text-muted-foreground" data-testid="consultor-fonte">Fonte: {r.fonte}</span>
                </div>
              </CardContent></Card>
            ))}
            <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Orientação informativa baseada na habilitação típica — <strong>não é parecer jurídico</strong>. Peça processual (impugnação/recurso) fica <strong>travada</strong> (exige validação jurídica).</p>
          </div>

          {(p?.riscos?.length ?? 0) > 0 ? <Card><CardContent className="space-y-2 p-4"><p className="text-sm font-semibold">Riscos & pegadinhas (IA)</p>{p!.riscos!.map((r, i) => (<div key={i} className="flex items-start gap-2 text-sm"><Badge variant={r.nivel === "vermelho" ? "destructive" : "warning"}>{r.nivel}</Badge><span>{r.texto}</span></div>))}</CardContent></Card>
            : <EmBreve icon={Scale} titulo="Riscos & Pegadinhas" motivo="A análise de riscos do texto do edital entra via Analisar com IA / Resumo Profundo." />}
        </section>
      </div>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"><Lock className="size-3" /> Peça processual (impugnação/recurso) fica travada — exige validação jurídica. Veredito/chance é estimativa, não promessa.</p>
    </div>
  );
}
