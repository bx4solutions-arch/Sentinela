import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2, ExternalLink, Sparkles, Trash2, FileText, Plus, Eye,
  FileSearch, Scale, MessagesSquare, DollarSign, Landmark, Lock, Gauge,
  ChevronRight, Clock, Wallet, Flag, ArrowLeft, FileDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, Badge, Button, Input, Progress, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { dataBR, pncpEditalUrl, diasAte } from "@/lib/utils";
import { buildResumo, type ResumoEdital } from "@/lib/resumo-edital";
import { itensAplicaveis, statusItem, calcProntidao, ITEM_STATUS_META } from "@/lib/habilitacao";
import { tokensDosSegmentos } from "@/lib/nichos";
import { inteligenciaMercado } from "@/lib/inteligencia";
import { SEMAFORO_LABEL } from "@/lib/preco";
import { consultarLicitacao } from "@/lib/consultor";
import { montarSecoes, DECLARACOES_TIPICAS } from "@/lib/proposta";
import { PropostaGerador } from "./proposta-gerador";
import { addDocLicitacao, deleteDocLicitacao, excluirLicitacao, analisarComIA } from "./actions";
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
// Linha chave→valor (kv) e card de kv — layout do protótipo (grande e legível).
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div className="flex items-start justify-between gap-4 py-2.5"><span className="text-sm text-muted-foreground">{label}</span><span className="text-right text-sm font-medium">{value || "—"}</span></div>);
}
function CardKV({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (<Card><CardContent className="p-4 md:p-5"><p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" /> {titulo}</p><div className="divide-y">{children}</div></CardContent></Card>);
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

  // IA (BYOK) + parecer existente (enriquece, não substitui o determinístico)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: cfg } = await admin.from("tenant_ai_config").select("provider, api_key_encrypted").eq("tenant_id", user?.id ?? "").maybeSingle();
  const hasAI = !!cfg && (cfg.provider === "mock" || !!cfg.api_key_encrypted);
  const { data: analiseRow } = await supabase.from("analise").select("conteudo, modelo").eq("licitacao_id", id).eq("tipo", "completa").maybeSingle();
  const p = (analiseRow?.conteudo ?? null) as Parecer | null;

  const { data: docs } = await supabase.from("documento").select("id, tipo, tipo_label").eq("licitacao_id", id).order("criado_em", { ascending: false });

  // Inteligência Comercial & de Mercado (Bloco 2) — quem ganha o nicho, faixa praticada, fornecedor atual do órgão.
  const intelTokens = tokensDosSegmentos(company?.segmentos?.length ? company.segmentos : []);
  const intel = await inteligenciaMercado(supabase, { tokens: intelTokens, uf: ed?.uf_sigla ?? null, cnpjOrgao: ed?.cnpj_orgao ?? null });

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
  const matrizProposta = itensStatus.map((it) => {
    const atendido = it.st !== "ausente" && it.st !== "vencida";
    return { label: it.label, exigencia: it.orgao, atendido, evidencia: atendido ? "documento na ficha" : "—" };
  });

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
  const objetoCurto = (ed?.objeto ?? lic.titulo ?? "").slice(0, 48);

  return (
    <div className="space-y-4">
      {/* ===== Cabeçalho — Espaço Inteligente da Licitação (visual do protótipo) ===== */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-sidebar to-primary text-sidebar-foreground" data-testid="space-cabecalho">
        <div className="space-y-4 p-5 md:p-6">
          {/* Linha de topo: voltar + status + nº PNCP + links externos */}
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

          {/* Selo + breadcrumb + título (órgão) + objeto */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/70" data-testid="space-selo">
              ⬢ Espaço Inteligente da Licitação
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-sidebar-foreground/60">
              <Link href="/radar" className="hover:text-sidebar-foreground hover:underline">Radar</Link>
              {cidadeUf && <><ChevronRight className="size-3" /> <span>{cidadeUf}</span></>}
              {objetoCurto && <><ChevronRight className="size-3" /> <span className="truncate">{objetoCurto}{(ed?.objeto?.length ?? 0) > 48 ? "…" : ""}</span></>}
            </p>
            <h1 className="mt-1.5 text-xl font-bold leading-tight md:text-2xl">{ed?.orgao?.razao_social ?? resumo?.orgao.razao_social ?? "Órgão responsável"}</h1>
            <p className="mt-1.5 max-w-4xl text-sm leading-relaxed text-sidebar-foreground/80 md:text-base">{ed?.objeto ?? lic.titulo ?? "Objeto não informado"}</p>
          </div>

          {/* Faixa de metadados */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/10 pt-3 text-xs text-sidebar-foreground/80 md:text-sm">
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
          <form action={analisarComIA}><input type="hidden" name="licitacao_id" value={lic.id} /><Button type="submit" size="sm"><Sparkles className="size-4" /> {p ? "Reanalisar com IA" : "Analisar com IA"}</Button></form>
        ) : (
          <Button asChild size="sm" variant="outline"><Link href="/configuracoes"><Sparkles className="size-4" /> Ligar IA (Configurações)</Link></Button>
        )}
        <PastaActions />
        <form action={excluirLicitacao} className="ml-auto"><input type="hidden" name="id" value={lic.id} /><Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /> Excluir</Button></form>
      </div>

      {/* KPIs (visual do protótipo) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="space-kpis">
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Wallet className="size-3.5" /> Valor estimado</p>
          <p className="mt-1 text-2xl font-bold leading-none">{brl(ed?.valor_estimado ?? null) ?? "—"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">teto do órgão (PNCP)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Flag className="size-3.5" /> Estágio</p>
          <p className="mt-1 text-2xl font-bold leading-none">{encerrada ? "Encerrado" : "Edital aberto"}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{ed?.situacao_nome ?? "situação no PNCP"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Clock className="size-3.5" /> Prazo p/ proposta</p>
          <p className="mt-1 text-2xl font-bold leading-none">{diasPrazo == null ? "—" : encerrada ? "Encerrado" : `${diasPrazo} dias`}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{encerramentoISO ? `encerra ${dtBR(encerramentoISO)}` : "prazo no edital"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><Gauge className="size-3.5" /> Sua prontidão</p>
          <p className="mt-1 text-2xl font-bold leading-none">{pct}%</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{atendeExig} de {totalExig} exigências · {statusEmpLabel}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="empresa">Empresa × Edital</TabsTrigger>
            <TabsTrigger value="veredito">Veredito</TabsTrigger>
            <TabsTrigger value="plano">Plano de Ação</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="proposta">Proposta</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="consultor">Consultor IA</TabsTrigger>
            <TabsTrigger value="precos">Inteligência</TabsTrigger>
            <TabsTrigger value="orgao">Órgão</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          {/* RESUMO — determinístico do payload (sempre disponível, sem IA) */}
          <TabsContent value="resumo">
            {resumo ? (
              <div className="space-y-4" data-testid="resumo-edital">
                <div>
                  <h2 className="text-lg font-bold leading-tight">Resumo do edital</h2>
                  <p className="text-sm text-muted-foreground">Montado direto do PNCP (determinístico). O interpretativo com IA é opcional, sob a sua chave.</p>
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
                <Card><CardContent className="p-4">
                  <p className="text-sm font-semibold">Seções que dependem do texto do edital</p>
                  <p className="mt-1 text-xs text-muted-foreground">Habilitação específica, garantias, penalidades, prazos de recurso e análise crítica entram ao <strong>baixar o documento</strong> (PNCP <code>/arquivos</code>) e/ou via <strong>Analisar com IA</strong>. Não inventamos esse conteúdo.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{resumo.em_ingestao.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>
                </CardContent></Card>
                {p?.resumo && <Card><CardContent className="p-4"><div className="mb-1 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><p className="text-sm font-semibold">Resumo interpretativo (IA)</p></div><p className="whitespace-pre-line text-sm text-muted-foreground">{p.resumo}</p></CardContent></Card>}
              </div>
            ) : (
              <div className="space-y-4" data-testid="resumo-edital">
                <div>
                  <h2 className="text-lg font-bold leading-tight">Resumo do edital</h2>
                  <p className="text-sm text-muted-foreground">Montado direto do PNCP (determinístico).</p>
                </div>
                <EmBreve icon={FileSearch} titulo="Baixar documento para detalhar" motivo="Ainda não há payload do PNCP desta licitação para montar o resumo. Baixe o documento do edital para detalhar identificação e sessão." />
              </div>
            )}
          </TabsContent>

          {/* EMPRESA × EDITAL — determinístico */}
          <TabsContent value="empresa">
            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{company?.razao_social ?? "Sua empresa"} × Edital</p>
                <Badge variant={statusEmp === "apto" ? "success" : statusEmp === "nao_apto" ? "destructive" : "warning"}>{statusEmpLabel}</Badge>
                <Badge variant="muted">{pct}% pronto</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Cruzamento com a <strong>habilitação típica da Lei 14.133</strong> aplicável aos seus nichos. A exigência específica deste edital entra com o documento.</p>
              <ul className="mt-3 divide-y rounded-md border">
                {itensStatus.map((it) => { const m = ITEM_STATUS_META[it.st]; return (
                  <li key={it.key} className="flex items-center gap-3 p-2.5"><Badge variant={m.badge}>{m.label}</Badge><span className="flex-1 text-sm">{it.label}</span><span className="text-xs text-muted-foreground">{it.orgao}</span></li>);
                })}
              </ul>
              {faltam.length > 0 && <p className="mt-2 text-sm text-destructive">Faltam {faltam.length} documento(s): {faltam.map((f) => f.label).join(", ")}.</p>}
            </CardContent></Card>
          </TabsContent>

          {/* VEREDITO — calibrado determinístico (+ IA se houver) */}
          <TabsContent value="veredito">
            <div className="space-y-4">
              <Card><CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2"><Gauge className="size-4 text-primary" /><p className="text-sm font-semibold">Veredito calibrado</p>
                  <Badge variant="secondary">probabilidade {prob}</Badge><Badge variant="muted">{pct}% pronto</Badge></div>
                <p className="mt-2 text-sm font-medium">{recomendacao}</p>
                <Progress value={pct} className="mt-2" />
                <p className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">⚠️ Recomendação calibrada (probabilística) com base na sua prontidão documental — <strong>não é garantia de resultado</strong>. Decisão e responsabilidade são suas.</p>
              </CardContent></Card>
              {p?.veredito && <Card><CardContent className="p-4"><div className="mb-1 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><p className="text-sm font-semibold">Veredito interpretativo (IA)</p></div>
                <p className="text-sm font-medium">{p.veredito.recomendacao}</p><p className="text-sm text-muted-foreground">{p.veredito.justificativa}</p></CardContent></Card>}
            </div>
          </TabsContent>

          {/* PLANO DE AÇÃO — derivado dos gaps */}
          <TabsContent value="plano">
            <Card><CardContent className="p-4">
              <p className="mb-2 text-sm font-semibold">Plano de ação</p>
              {faltam.length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Habilitação típica completa. Acompanhe os prazos do edital.</p> : (
                <ul className="space-y-2">{faltam.map((f) => (
                  <li key={f.key} className="flex items-center gap-2 rounded-md border p-2.5 text-sm"><span className="size-2 rounded-full bg-destructive" /><span className="flex-1">Providenciar <strong>{f.label}</strong> ({f.orgao})</span><Button asChild size="sm" variant="ghost"><Link href="/empresa">Resolver</Link></Button></li>))}
                </ul>)}
            </CardContent></Card>
          </TabsContent>

          {/* DOCUMENTOS */}
          <TabsContent value="documentos">
            <Card><CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-sm font-semibold">Documentos do processo</p></div>
              <p className="mb-3 text-xs text-muted-foreground">Adicione edital, DFD/ETP, TR e anexos. Download automático do PNCP (<code>/arquivos</code>) chega num próximo incremento.</p>
              {(docs ?? []).length === 0 ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum documento ainda.</p> : (
                <ul className="mb-3 divide-y rounded-md border">{(docs ?? []).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 p-3"><FileText className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{d.tipo_label}</span><Badge variant="muted">{d.tipo}</Badge>
                    <form action={deleteDocLicitacao}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="licitacao_id" value={lic.id} /><button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button></form>
                  </li>))}
                </ul>)}
              <form action={addDocLicitacao} className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row"><input type="hidden" name="licitacao_id" value={lic.id} /><Input name="nome" placeholder="Nome do documento (ex.: Edital, TR, ETP)" required className="flex-1" /><Button type="submit"><Plus className="size-4" /> Adicionar</Button></form>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="proposta">
            <PropostaGerador secoes={secoesProposta} declaracoes={DECLARACOES_TIPICAS} matriz={matrizProposta} proponente={company?.razao_social ?? "Proponente"} />
          </TabsContent>

          <TabsContent value="riscos">
            {(p?.riscos?.length ?? 0) > 0 ? <Card><CardContent className="space-y-2 p-4">{p!.riscos!.map((r, i) => (<div key={i} className="flex items-start gap-2 text-sm"><Badge variant={r.nivel === "vermelho" ? "destructive" : "warning"}>{r.nivel}</Badge><span>{r.texto}</span></div>))}</CardContent></Card>
              : <EmBreve icon={Scale} titulo="Riscos & Pegadinhas" motivo="A análise de riscos do texto do edital entra via Analisar com IA (BYOK)." />}
          </TabsContent>
          <TabsContent value="consultor">
            <div className="space-y-3" data-testid="consultor">
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2"><MessagesSquare className="size-4 text-primary" /><p className="text-sm font-semibold">Consultor — habilitação & participação</p></div>
                <p className="mt-1 text-xs text-muted-foreground">Respostas <strong>determinísticas</strong> com base na sua ficha × habilitação típica, <strong>citando a Lei 14.133</strong>. Interpretação do texto do edital: use “Analisar com IA” (BYOK). Corpus completo + jurisprudência entram na sequência.</p>
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
              <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Orientação informativa baseada na habilitação típica — <strong>não é parecer jurídico</strong>. Peça processual (impugnação/recurso) fica travada (exige validação jurídica).</p>
            </div>
          </TabsContent>
          <TabsContent value="precos">
            {(intel.contratoAtual.length > 0 || intel.concorrentes.length > 0 || intel.faixa) ? (
              <div className="space-y-4" data-testid="sala-inteligencia">
                {/* Inteligência Comercial — fornecedor/contrato ATUAL do órgão */}
                <Card><CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2"><DollarSign className="size-4 text-primary" /><p className="text-sm font-semibold">Inteligência Comercial — quem fornece hoje</p></div>
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

                {/* Inteligência de Mercado — concorrentes + faixa praticada */}
                <Card><CardContent className="p-4">
                  <div className="mb-2 flex items-center gap-2"><Building2 className="size-4 text-primary" /><p className="text-sm font-semibold">Inteligência de Mercado — seus concorrentes no nicho ({ed?.uf_sigla ?? "UF"})</p></div>
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
                          <div className="rounded-md border bg-card p-2"><p className="text-[11px] uppercase text-muted-foreground">Vencedora</p><p className="font-semibold">{brl(intel.faixa.vencedora)}</p></div>
                          <div className="rounded-md border bg-card p-2"><p className="text-[11px] uppercase text-muted-foreground">Segura</p><p className="font-semibold">{brl(intel.faixa.segura)}</p></div>
                          <div className="rounded-md border bg-card p-2"><p className="text-[11px] uppercase text-muted-foreground">Agressiva</p><p className="font-semibold">{brl(intel.faixa.agressiva)}</p></div>
                        </div>
                      ) : (
                        <p className="rounded border border-warning/40 bg-warning/10 px-2 py-1 text-xs" data-testid="recusa-honesta">⚠️ {intel.faixa.motivoRecusa}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Piso de inexequibilidade (ref.): abaixo de <strong>{brl(intel.faixa.pisoInexequivel)}</strong> há risco de desclassificação (Lei 14.133, art. 59). Faixa observada {brl(intel.faixa.min)}–{brl(intel.faixa.max)} · mediana {brl(intel.faixa.mediana)}.</p>
                    </div>
                  )}
                  <p className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Referência de <strong>contratos firmados</strong> (PNCP), <strong>não recomendação de preço — a empresa decide</strong>. Nº de participantes/lances entra com o resultado por item (em ingestão).</p>
                </CardContent></Card>
              </div>
            ) : <EmBreve icon={DollarSign} titulo="Inteligência Comercial & de Mercado" motivo="Sem contratos do seu nicho nesta UF na base atual. Acende conforme a coleta de contratos avança (em ingestão)." />}
          </TabsContent>
          <TabsContent value="orgao"><EmBreve icon={Landmark} titulo="Histórico do Órgão / Decisores" motivo="Exige atas/contratos + 2ª fonte (diário/transparência). Em ingestão." /></TabsContent>
        </div>
      </Tabs>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"><Lock className="size-3" /> Peça processual (impugnação/recurso) fica travada — exige validação jurídica.</p>
    </div>
  );
}
