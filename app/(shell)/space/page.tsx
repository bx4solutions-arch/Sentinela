import Link from "next/link";
import { Boxes, FileSearch, ArrowRight, Building2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { dataBR } from "@/lib/utils";

const brl = (n: number | null) =>
  !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

type Lic = {
  id: string;
  titulo: string | null;
  criado_em: string;
  raw_editais: {
    objeto: string | null; valor_estimado: number | null; situacao_nome: string | null;
    modalidade_nome: string | null; cidade: string | null; orgao: { razao_social: string | null } | null;
  } | null;
};

export default async function SpacePage() {
  const supabase = await createClient();
  // Reusa a query do Consultor (licitações em análise do tenant), enriquecida p/ os cards do Space.
  const { data } = await supabase
    .from("licitacao")
    .select("id, titulo, criado_em, raw_editais:numero_controle_pncp(objeto, valor_estimado, situacao_nome, modalidade_nome, cidade, orgao:cnpj_orgao(razao_social))")
    .order("criado_em", { ascending: false });
  const lics = (data ?? []) as unknown as Lic[];

  return (
    <div className="space-y-4">
      {/* Cabeçalho — espírito do protótipo (navy, sem verde) */}
      <div className="rounded-xl bg-gradient-to-r from-sidebar to-primary px-5 py-4 text-sidebar-foreground">
        <div className="flex items-center gap-2">
          <Boxes className="size-4" />
          <p className="text-sm font-semibold" data-testid="space-selo">⬢ Espaço Inteligente da Licitação</p>
          <Badge variant="secondary" className="ml-auto hidden sm:inline-flex">{lics.length} em acompanhamento</Badge>
        </div>
        <p className="mt-1 text-xs text-sidebar-foreground/70">
          Cada licitação que você acompanha tem o seu Space — uma análise ponta a ponta (resumo, exigências, itens, inteligência, veredito e proposta). Abra uma para entrar.
        </p>
      </div>

      {lics.length === 0 ? (
        <div className="mx-auto max-w-md" data-testid="space-empty">
          <Card className="p-6 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Boxes className="size-6" /></div>
            <h2 className="text-lg font-bold">Nenhuma licitação no seu Space ainda</h2>
            <p className="mt-1 text-sm text-muted-foreground">No Radar, clique em “Adicionar à análise” para criar o Space de uma licitação e acompanhá-la ponta a ponta.</p>
            <Button asChild className="mt-4"><Link href="/radar">Ir para o Radar <ArrowRight className="size-4" /></Link></Button>
          </Card>
        </div>
      ) : (
        <div className="space-y-2" data-testid="space-lista">
          {lics.map((l) => {
            const ed = l.raw_editais;
            const valor = brl(ed?.valor_estimado ?? null);
            return (
              <Link key={l.id} href={`/licitacao/${l.id}`} data-testid="space-card">
                <Card className="transition hover:border-primary/40">
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSearch className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="size-3" /> {ed?.orgao?.razao_social ?? "Órgão"}</span>
                        {ed?.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {ed.cidade}</span>}
                        {ed?.modalidade_nome && <Badge variant="outline">{ed.modalidade_nome}</Badge>}
                        {ed?.situacao_nome && <Badge variant="muted">{ed.situacao_nome}</Badge>}
                      </div>
                      <p className="line-clamp-1 text-sm font-medium">{l.titulo || ed?.objeto}</p>
                    </div>
                    {valor && <span className="hidden shrink-0 text-sm font-semibold sm:block">{valor}</span>}
                    <Badge variant="muted">{dataBR(l.criado_em.slice(0, 10))}</Badge>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
