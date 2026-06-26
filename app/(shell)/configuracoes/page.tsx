import Link from "next/link";
import { Sparkles, Lock, Building2, Palette, BookOpen, Activity, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge, Input, Button } from "@/components/ui";
import { temIA } from "@/lib/ai-server";
import { createClient } from "@/lib/supabase/server";
import { EmpresaPainel } from "@/components/empresa-painel";
import { IdentidadeForm } from "@/components/identidade/identidade-form";
import { statsConhecimento, listarFontes, buscarConhecimento } from "@/lib/conhecimento";
import { Search, Scale, Wifi } from "lucide-react";

// Hub de Configurações (portado do MeuJurídico, adaptado ao licitante) — server-rendered por ?tab=.
// Abas: Perfil da Empresa (reusa EmpresaPainel) · Identidade Visual · Base de Conhecimento · IA · Monitoramento.
const TABS = [
  { id: "perfil-empresa", label: "Perfil da Empresa", icon: Building2 },
  { id: "identidade", label: "Identidade Visual", icon: Palette },
  { id: "conhecimento", label: "Base de Conhecimento", icon: BookOpen },
  { id: "ia", label: "Inteligência Artificial", icon: Sparkles },
  { id: "monitoramento", label: "Monitoramento", icon: Activity },
] as const;
type TabId = (typeof TABS)[number]["id"];
const IDS = TABS.map((t) => t.id) as readonly string[];

function EmConstrucao({ titulo, etapa }: { titulo: string; etapa: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><Settings className="size-5" /></div>
        <p className="text-sm font-semibold">{titulo}</p>
        <Badge variant="muted">em construção · {etapa}</Badge>
        <p className="max-w-md text-xs text-muted-foreground">Esta aba entra com dado real na {etapa}. Por ora, as abas Perfil da Empresa e Inteligência Artificial já estão funcionais.</p>
      </CardContent>
    </Card>
  );
}

function AbaIA() {
  const ligada = temIA();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> Inteligência Artificial</CardTitle>
          <p className="text-sm text-muted-foreground">
            A IA é <strong>inclusa</strong> no Sentinela — você <strong>não cadastra chave</strong>. O “Resumo Profundo” do edital e a análise já funcionam, sem configuração.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm" data-testid="config-ia">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {ligada
              ? <Badge variant="secondary" data-testid="ia-status-on">IA inclusa · ligada</Badge>
              : <Badge variant="warning" data-testid="ia-status-off">temporariamente indisponível</Badge>}
          </div>
          <p className="text-muted-foreground">
            Determinístico primeiro (resumo do PNCP, checklist de habilitação, motor de preço) — a IA entra só onde agrega:
            a <strong>leitura profunda do edital</strong>. A extração é sob demanda e fica em <strong>cache</strong> (sem refazer custo).
          </p>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground" data-testid="config-seguranca">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            A chave de IA é <strong>gerenciada pela Sentinela no servidor</strong> — nunca trafega pelo seu navegador, nunca é exposta
            e nunca é commitada. Todas as chamadas à IA são <strong>server-side</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

async function AbaIdentidade() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("*").maybeSingle();
  if (!company) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm font-semibold">Configure sua empresa primeiro</p>
        <p className="mt-1 text-xs text-muted-foreground">A Identidade Visual usa os dados da empresa (CNPJ, razão social). Faça o Raio-X em <Link href="/onboarding" className="text-primary hover:underline">Onboarding</Link>.</p>
      </Card>
    );
  }
  return <IdentidadeForm company={company} />;
}

async function AbaConhecimento({ kq }: { kq?: string }) {
  const [stats, fontes] = await Promise.all([statsConhecimento(), listarFontes()]);
  const busca = kq && kq.trim() ? await buscarConhecimento(kq) : null;
  const semanticaOn = stats.comEmbedding > 0;
  return (
    <div className="space-y-4" data-testid="conhecimento-aba">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Itens na base</p><p className="mt-1 text-2xl font-semibold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fonte</p><p className="mt-1 text-sm font-medium">Lei 14.133/2021</p></CardContent></Card>
        <Card className="sm:col-span-2"><CardContent className="flex items-center gap-2 p-3" data-testid="kb-modo">
          <Badge variant={semanticaOn ? "secondary" : "muted"}>{semanticaOn ? "busca semântica ativa" : "busca textual ativa"}</Badge>
          {!semanticaOn && <span className="text-[11px] text-muted-foreground">semântica liga após o backfill de embeddings</span>}
        </CardContent></Card>
      </div>

      {/* Como usar */}
      <Card><CardContent className="p-4">
        <p className="text-sm font-semibold">Como usar</p>
        <p className="mt-1 text-xs text-muted-foreground">Pesquise a legislação de licitação (Lei 14.133) — o Consultor IA e o Checklist usam esta base para fundamentar habilitação, recurso e impugnação.</p>
      </CardContent></Card>

      {/* Fontes Federais — busca + lista */}
      <Card><CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Scale className="size-4 text-primary" /> Fontes federais</p>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="tab" value="conhecimento" />
          <Input name="kq" defaultValue={kq ?? ""} data-testid="kb-busca" placeholder="ex.: termo de referência, habilitação, sanções…" className="min-w-[220px] flex-1" />
          <Button type="submit" size="sm" data-testid="kb-buscar"><Search className="size-4" /> Buscar</Button>
        </form>
        {busca && (
          <div data-testid="kb-resultado" className="space-y-2">
            <p className="text-xs text-muted-foreground">{busca.hits.length} resultado(s) · modo {busca.modo}</p>
            {busca.hits.map((h, i) => (
              <div key={i} className="rounded-md border p-2.5">
                <p className="text-sm font-medium">{h.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{h.content}</p>
              </div>
            ))}
            {busca.hits.length === 0 && <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">Nada encontrado para “{kq}”.</p>}
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">Ver as {fontes.length} normas indexadas</summary>
          <ul className="mt-2 space-y-1" data-testid="kb-fontes">
            {fontes.map((f, i) => <li key={i} className="text-xs"><Badge variant="muted" className="mr-1 text-[9px]">{f.type}</Badge>{f.title}</li>)}
          </ul>
        </details>
      </CardContent></Card>

      {/* Base própria + Integrações (estado honesto) */}
      <div className="grid gap-3 md:grid-cols-2">
        <EmConstrucao titulo="Base própria (suas normas)" etapa="próxima leva" />
        <Card><CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Wifi className="mt-0.5 size-4 shrink-0 text-primary" />
          <p><strong className="text-foreground">Integrações:</strong> a legislação federal já está indexada. TCU, AGU/CGU e INs SEGES entram por ingestão da fonte oficial (em breve).</p>
        </CardContent></Card>
      </div>
    </div>
  );
}

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ tab?: string; kq?: string }> }) {
  const sp = await searchParams;
  const tab: TabId = (IDS.includes(sp.tab ?? "") ? sp.tab : "perfil-empresa") as TabId;

  return (
    <div className="space-y-5">
      {/* Nav de abas (server-rendered por ?tab=) */}
      <div className="flex flex-wrap items-center gap-1 border-b" data-testid="config-tabs">
        {TABS.map((t) => {
          const ativo = tab === t.id;
          return (
            <Link
              key={t.id}
              href={`/configuracoes?tab=${t.id}`}
              data-testid={`tab-${t.id}`}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                ativo ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-3.5" /> {t.label}
            </Link>
          );
        })}
      </div>

      {/* Conteúdo da aba ativa */}
      <div data-testid={`tabpanel-${tab}`}>
        {tab === "perfil-empresa" && <EmpresaPainel />}
        {tab === "ia" && <AbaIA />}
        {tab === "identidade" && <AbaIdentidade />}
        {tab === "conhecimento" && <AbaConhecimento kq={sp.kq} />}
        {tab === "monitoramento" && <EmConstrucao titulo="Monitoramento" etapa="próxima leva" />}
      </div>
    </div>
  );
}
