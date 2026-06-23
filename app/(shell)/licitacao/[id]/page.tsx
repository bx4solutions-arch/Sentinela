import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2, MapPin, ExternalLink, Sparkles, Trash2, FileText, Plus, Eye,
  FileSearch, Scale, MessagesSquare, DollarSign, Landmark, Lock, Gauge,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, Badge, Button, Input, Progress, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { dataBR } from "@/lib/utils";
import { buildResumo, type ResumoEdital } from "@/lib/resumo-edital";
import { itensAplicaveis, statusItem, calcProntidao, ITEM_STATUS_META } from "@/lib/habilitacao";
import { tokensDosSegmentos } from "@/lib/nichos";
import { inteligenciaMercado } from "@/lib/inteligencia";
import { SEMAFORO_LABEL } from "@/lib/preco";
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
  raw_editais: { objeto: string | null; valor_estimado: number | null; situacao_nome: string | null; data_publicacao: string | null; modalidade_nome: string | null; cidade: string | null; link_origem: string | null; cnpj_orgao: string | null; uf_sigla: string | null; payload: unknown; orgao: { razao_social: string | null } | null } | null; };

function EmBreve({ icon: Icon, titulo, motivo }: { icon: React.ElementType; titulo: string; motivo: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Icon className="size-6 text-muted-foreground/60" /><p className="font-medium">{titulo}</p>
      <Badge variant="muted">em ingestão</Badge><p className="max-w-md text-sm text-muted-foreground">{motivo}</p>
    </div>
  );
}
function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  return (<div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><div className="text-sm font-medium">{value || "—"}</div></div>);
}
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (<Card><CardContent className="p-4"><p className="mb-3 text-sm font-semibold">{titulo}</p><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</div></CardContent></Card>);
}

export default async function LicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("licitacao")
    .select("id, numero_controle_pncp, titulo, resumo_json, raw_editais:numero_controle_pncp(objeto, valor_estimado, situacao_nome, data_publicacao, modalidade_nome, cidade, link_origem, cnpj_orgao, uf_sigla, payload, orgao:cnpj_orgao(razao_social))")
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
  const { data: company } = await supabase.from("company").select("segmentos, razao_social").maybeSingle();
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

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/radar">← Voltar ao Radar</Link></Button>

      {/* Cabeçalho */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSearch className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" /><span className="font-medium text-foreground">{ed?.orgao?.razao_social ?? "Órgão"}</span>
                {ed?.modalidade_nome && <Badge variant="outline">{ed.modalidade_nome}</Badge>}
                {ed?.situacao_nome && <Badge variant="muted">{ed.situacao_nome}</Badge>}
                <Badge variant={statusEmp === "apto" ? "success" : statusEmp === "nao_apto" ? "destructive" : "warning"}>{pct}% pronto · {statusEmpLabel}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{lic.titulo || ed?.objeto}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {ed?.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {ed.cidade}</span>}
                <span className="font-semibold text-foreground">{brl(ed?.valor_estimado ?? null) ?? "Valor não informado"}</span>
                {resumo?.datas.encerramento && <span>encerra {dtBR(resumo.datas.encerramento)}</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            <form action={monitorar}><input type="hidden" name="numero" value={lic.numero_controle_pncp} /><Button type="submit" size="sm" variant="outline"><Eye className="size-4" /> Monitorar</Button></form>
            {hasAI ? (
              <form action={analisarComIA}><input type="hidden" name="licitacao_id" value={lic.id} /><Button type="submit" size="sm"><Sparkles className="size-4" /> {p ? "Reanalisar com IA" : "Analisar com IA"}</Button></form>
            ) : (
              <Button asChild size="sm" variant="outline"><Link href="/configuracoes"><Sparkles className="size-4" /> Ligar IA (Configurações)</Link></Button>
            )}
            <PastaActions />
            {ed?.link_origem && <Button asChild size="sm" variant="ghost"><a href={ed.link_origem} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Edital no PNCP</a></Button>}
            <form action={excluirLicitacao} className="ml-auto"><input type="hidden" name="id" value={lic.id} /><Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /> Excluir</Button></form>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="empresa">Empresa × Edital</TabsTrigger>
            <TabsTrigger value="veredito">Veredito</TabsTrigger>
            <TabsTrigger value="plano">Plano de Ação</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
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
              <div className="space-y-4">
                <Secao titulo="Identificação">
                  <div className="col-span-2 sm:col-span-3"><Campo label="Objeto" value={resumo.identificacao.objeto} /></div>
                  <Campo label="Nº controle PNCP" value={resumo.identificacao.numero_controle} />
                  <Campo label="Nº da compra" value={resumo.identificacao.numero_compra} />
                  <Campo label="Processo" value={resumo.identificacao.processo} />
                  <Campo label="UASG / unidade" value={resumo.identificacao.uasg} />
                  <Campo label="Instrumento" value={resumo.identificacao.tipo_instrumento} />
                </Secao>
                <Secao titulo="Órgão responsável">
                  <Campo label="Órgão" value={resumo.orgao.razao_social} />
                  <Campo label="Poder" value={resumo.orgao.poder} />
                  <Campo label="Esfera" value={resumo.orgao.esfera} />
                  <Campo label="Município/UF" value={resumo.orgao.municipio ? `${resumo.orgao.municipio}/${resumo.orgao.uf}` : null} />
                  <Campo label="CAPAG" value={<Badge variant="muted">em ingestão</Badge>} />
                </Secao>
                <Secao titulo="Datas e prazos">
                  <Campo label="Publicação" value={dtBR(resumo.datas.publicacao)} />
                  <Campo label="Abertura de propostas" value={dtBR(resumo.datas.abertura)} />
                  <Campo label="Encerramento" value={dtBR(resumo.datas.encerramento)} />
                </Secao>
                <Secao titulo="Modalidade, valores e amparo">
                  <Campo label="Modalidade" value={resumo.modalidade.modalidade} />
                  <Campo label="Modo de disputa" value={resumo.modalidade.modo_disputa} />
                  <Campo label="Registro de preços (SRP)" value={resumo.modalidade.srp == null ? "—" : resumo.modalidade.srp ? "Sim" : "Não"} />
                  <Campo label="Valor estimado" value={brl(resumo.valores.estimado)} />
                  <Campo label="Valor homologado" value={brl(resumo.valores.homologado)} />
                  <Campo label="Situação" value={resumo.situacao} />
                  <div className="col-span-2 sm:col-span-3"><Campo label="Amparo legal" value={resumo.amparo_legal.nome} /></div>
                  {resumo.info_complementar && <div className="col-span-2 sm:col-span-3"><Campo label="Informação complementar" value={resumo.info_complementar} /></div>}
                </Secao>
                <Card><CardContent className="p-4">
                  <p className="text-sm font-semibold">Seções que dependem do texto do edital</p>
                  <p className="mt-1 text-xs text-muted-foreground">Habilitação específica, garantias, penalidades, prazos de recurso e análise crítica entram ao <strong>baixar o documento</strong> (PNCP <code>/arquivos</code>) e/ou via <strong>Analisar com IA</strong>. Não inventamos esse conteúdo.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{resumo.em_ingestao.map((s) => <Badge key={s} variant="muted">{s}</Badge>)}</div>
                </CardContent></Card>
                {p?.resumo && <Card><CardContent className="p-4"><div className="mb-1 flex items-center gap-2"><Sparkles className="size-4 text-primary" /><p className="text-sm font-semibold">Resumo interpretativo (IA)</p></div><p className="whitespace-pre-line text-sm text-muted-foreground">{p.resumo}</p></CardContent></Card>}
              </div>
            ) : <EmBreve icon={FileSearch} titulo="Resumo Executivo" motivo="Sem payload do edital para montar o resumo." />}
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

          <TabsContent value="riscos">
            {(p?.riscos?.length ?? 0) > 0 ? <Card><CardContent className="space-y-2 p-4">{p!.riscos!.map((r, i) => (<div key={i} className="flex items-start gap-2 text-sm"><Badge variant={r.nivel === "vermelho" ? "destructive" : "warning"}>{r.nivel}</Badge><span>{r.texto}</span></div>))}</CardContent></Card>
              : <EmBreve icon={Scale} titulo="Riscos & Pegadinhas" motivo="A análise de riscos do texto do edital entra via Analisar com IA (BYOK)." />}
          </TabsContent>
          <TabsContent value="consultor"><EmBreve icon={MessagesSquare} titulo="Consultor IA da Licitação" motivo="Chat com contexto da pasta — próximo incremento." /></TabsContent>
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
