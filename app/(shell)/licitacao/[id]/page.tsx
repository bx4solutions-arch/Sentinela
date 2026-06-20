import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2, MapPin, ExternalLink, Sparkles, Trash2, FileText, Plus,
  FileSearch, Scale, MessagesSquare, ListChecks, DollarSign, Landmark, Swords, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, Badge, Button, Input, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { dataBR } from "@/lib/utils";
import { addDocLicitacao, deleteDocLicitacao, excluirLicitacao, analisarComIA } from "./actions";

type Parecer = {
  resumo?: string;
  riscos?: { nivel?: string; texto?: string }[];
  veredito?: { recomendacao?: string; probabilidade?: string; justificativa?: string; prontidao_pct?: number };
  empresa_edital?: { status?: string; faltam?: string[] };
  erro?: string;
};

const brl = (n: number | null) =>
  !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

type Lic = {
  id: string;
  numero_controle_pncp: string;
  titulo: string | null;
  raw_editais: {
    objeto: string | null; valor_estimado: number | null; situacao_nome: string | null;
    data_publicacao: string | null; modalidade_nome: string | null; cidade: string | null;
    link_origem: string | null; orgao: { razao_social: string | null } | null;
  } | null;
};

function EmBreve({ icon: Icon, titulo, motivo }: { icon: React.ElementType; titulo: string; motivo: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
      <Icon className="size-6 text-muted-foreground/60" />
      <p className="font-medium">{titulo}</p>
      <Badge variant="muted">em breve</Badge>
      <p className="max-w-md text-sm text-muted-foreground">{motivo}</p>
    </div>
  );
}

export default async function LicitacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("licitacao")
    .select("id, numero_controle_pncp, titulo, raw_editais:numero_controle_pncp(objeto, valor_estimado, situacao_nome, data_publicacao, modalidade_nome, cidade, link_origem, orgao:cnpj_orgao(razao_social))")
    .eq("id", id)
    .maybeSingle();
  const lic = data as unknown as Lic | null;
  if (!lic) notFound();

  const ed = lic.raw_editais;
  const { data: docs } = await supabase
    .from("documento")
    .select("id, tipo, tipo_label, criado_em")
    .eq("licitacao_id", id)
    .order("criado_em", { ascending: false });

  // IA configurada? (admin, server-only) + parecer existente
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: cfg } = await admin.from("tenant_ai_config").select("provider, model, api_key_encrypted").eq("tenant_id", user?.id ?? "").maybeSingle();
  const hasAI = !!cfg && (cfg.provider === "mock" || !!cfg.api_key_encrypted);
  const { data: analiseRow } = await supabase.from("analise").select("conteudo, modelo").eq("licitacao_id", id).eq("tipo", "completa").maybeSingle();
  const p = (analiseRow?.conteudo ?? null) as Parecer | null;

  const aiMsg = hasAI ? "Clique em “Analisar com IA” no topo para gerar." : "Configure o provedor e o modelo de IA em Configurações para ligar a análise.";

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm"><Link href="/radar">← Voltar ao Radar</Link></Button>

      {/* Cabeçalho da pasta */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSearch className="size-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="size-3.5" /><span className="font-medium text-foreground">{ed?.orgao?.razao_social ?? "Órgão"}</span>
                {ed?.modalidade_nome && <Badge variant="outline">{ed.modalidade_nome}</Badge>}
                {ed?.situacao_nome && <Badge variant="muted">{ed.situacao_nome}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-medium">{lic.titulo || ed?.objeto}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {ed?.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {ed.cidade}</span>}
                <span className="font-semibold text-foreground">{brl(ed?.valor_estimado ?? null) ?? "Valor não informado"}</span>
                {ed?.data_publicacao && <span>{dataBR(ed.data_publicacao.slice(0, 10))}</span>}
                {ed?.link_origem && <a href={ed.link_origem} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Origem</a>}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
            {hasAI ? (
              <form action={analisarComIA}>
                <input type="hidden" name="licitacao_id" value={lic.id} />
                <Button type="submit" size="sm"><Sparkles className="size-4" /> {p ? "Reanalisar com IA" : "Analisar com IA"}</Button>
              </form>
            ) : (
              <Button asChild size="sm" variant="outline"><Link href="/configuracoes"><Sparkles className="size-4" /> Ligar IA (Configurações)</Link></Button>
            )}
            {analiseRow?.modelo && <span className="text-xs text-muted-foreground">modelo: {analiseRow.modelo}</span>}
            <form action={excluirLicitacao} className="ml-auto">
              <input type="hidden" name="id" value={lic.id} />
              <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /> Excluir análise</Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Abas do workspace */}
      <Tabs defaultValue="documentos">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="empresa">Empresa × Edital</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="consultor">Consultor IA</TabsTrigger>
            <TabsTrigger value="plano">Plano</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="precos">Preços</TabsTrigger>
            <TabsTrigger value="orgao">Órgão</TabsTrigger>
            <TabsTrigger value="concorrentes">Concorrentes</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="resumo">
            {p?.resumo || p?.veredito ? (
              <div className="space-y-4">
                <Card><CardContent className="p-4">
                  <p className="mb-1 text-sm font-semibold">Resumo Executivo</p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{p.resumo ?? "—"}</p>
                </CardContent></Card>
                {p.veredito && (
                  <Card><CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">Veredito calibrado</p>
                      {p.veredito.probabilidade && <Badge variant="secondary">probabilidade {p.veredito.probabilidade}</Badge>}
                      {typeof p.veredito.prontidao_pct === "number" && <Badge variant="muted">{p.veredito.prontidao_pct}% pronto</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium">{p.veredito.recomendacao}</p>
                    <p className="text-sm text-muted-foreground">{p.veredito.justificativa}</p>
                    <p className="mt-2 rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">⚠️ Recomendação calibrada (probabilística) — não é garantia de resultado. Decisão e responsabilidade são suas.</p>
                  </CardContent></Card>
                )}
                {p.erro && <p className="text-sm text-destructive">Falha na análise: {p.erro}</p>}
              </div>
            ) : <EmBreve icon={FileSearch} titulo="Resumo Executivo" motivo={aiMsg} />}
          </TabsContent>
          <TabsContent value="empresa">
            {p?.empresa_edital ? (
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-2"><p className="text-sm font-semibold">Minha Empresa × Edital</p>
                  <Badge variant={p.empresa_edital.status === "apto" ? "success" : p.empresa_edital.status === "nao_apto" ? "destructive" : "warning"}>{p.empresa_edital.status}</Badge></div>
                {(p.empresa_edital.faltam?.length ?? 0) > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{p.empresa_edital.faltam!.map((f, i) => <li key={i}>{f}</li>)}</ul>}
              </CardContent></Card>
            ) : <EmBreve icon={Building2} titulo="Minha Empresa × Edital" motivo={aiMsg} />}
          </TabsContent>
          <TabsContent value="riscos">
            {(p?.riscos?.length ?? 0) > 0 ? (
              <Card><CardContent className="space-y-2 p-4">
                {p!.riscos!.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant={r.nivel === "vermelho" ? "destructive" : r.nivel === "verde" ? "success" : "warning"}>{r.nivel}</Badge>
                    <span>{r.texto}</span>
                  </div>
                ))}
              </CardContent></Card>
            ) : <EmBreve icon={Scale} titulo="Riscos & Pegadinhas" motivo={aiMsg} />}
          </TabsContent>
          <TabsContent value="consultor"><EmBreve icon={MessagesSquare} titulo="Consultor IA da Licitação" motivo="Chat com contexto da pasta — chega no próximo incremento (Bloco 3b)." /></TabsContent>
          <TabsContent value="plano"><EmBreve icon={ListChecks} titulo="Plano de Ação" motivo={aiMsg} /></TabsContent>

          <TabsContent value="documentos">
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Documentos do processo</p>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Adicione edital, DFD/ETP, TR e anexos. Download automático do PNCP (<code>/arquivos</code>) chega num próximo incremento.
                </p>
                {(docs ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum documento ainda.</p>
                ) : (
                  <ul className="mb-3 divide-y rounded-md border">
                    {(docs ?? []).map((d) => (
                      <li key={d.id} className="flex items-center gap-3 p-3">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.tipo_label}</span>
                        <Badge variant="muted">{d.tipo}</Badge>
                        <form action={deleteDocLicitacao}>
                          <input type="hidden" name="id" value={d.id} />
                          <input type="hidden" name="licitacao_id" value={lic.id} />
                          <button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={addDocLicitacao} className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row">
                  <input type="hidden" name="licitacao_id" value={lic.id} />
                  <Input name="nome" placeholder="Nome do documento (ex.: Edital, TR, ETP)" required className="flex-1" />
                  <Button type="submit"><Plus className="size-4" /> Adicionar</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="precos"><EmBreve icon={DollarSign} titulo="Preços & Inteligência Comercial" motivo="Exige atas/contratos ingeridos (hoje 0) + sanções CEIS/CNEP. Não forjamos dado." /></TabsContent>
          <TabsContent value="orgao"><EmBreve icon={Landmark} titulo="Histórico do Órgão" motivo="Exige atas/contratos + perfil do órgão. Em ingestão." /></TabsContent>
          <TabsContent value="concorrentes"><EmBreve icon={Swords} titulo="Mapa de Concorrentes" motivo="Exige atas/contratos + sanções. Em ingestão." /></TabsContent>
        </div>
      </Tabs>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <Lock className="size-3" /> Peça processual (impugnação/recurso) fica travada — exige validação jurídica.
      </p>
    </div>
  );
}
