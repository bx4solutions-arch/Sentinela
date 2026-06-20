import Link from "next/link";
import { MessagesSquare, FileSearch, ArrowRight, Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { dataBR } from "@/lib/utils";

type Lic = {
  id: string;
  titulo: string | null;
  criado_em: string;
  raw_editais: { objeto: string | null; orgao: { razao_social: string | null } | null } | null;
};

export default async function ConsultorPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("licitacao")
    .select("id, titulo, criado_em, raw_editais:numero_controle_pncp(objeto, orgao:cnpj_orgao(razao_social))")
    .order("criado_em", { ascending: false });
  const lics = (data ?? []) as unknown as Lic[];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <MessagesSquare className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Consultor IA da Licitação</p>
            <p className="text-sm text-muted-foreground">
              O Consultor responde com o contexto de <strong>cada licitação</strong> (documentos + sua empresa).
              Abra uma análise abaixo para conversar sobre ela. Configure o modelo de IA em{" "}
              <Link href="/configuracoes" className="font-medium text-primary hover:underline">Configurações</Link>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Suas análises</h2>
        <Button asChild size="sm" variant="outline"><Link href="/radar"><Plus className="size-4" /> Adicionar do Radar</Link></Button>
      </div>

      {lics.length === 0 ? (
        <div className="mx-auto max-w-md">
          <Card className="p-6 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><FileSearch className="size-6" /></div>
            <h2 className="text-lg font-bold">Nenhuma análise ainda</h2>
            <p className="mt-1 text-sm text-muted-foreground">No Radar, clique em “Adicionar à análise” para criar a Pasta Inteligente de uma licitação.</p>
            <Button asChild className="mt-4"><Link href="/radar">Ir para o Radar <ArrowRight className="size-4" /></Link></Button>
          </Card>
        </div>
      ) : (
        <div className="space-y-2">
          {lics.map((l) => (
            <Link key={l.id} href={`/licitacao/${l.id}`}>
              <Card className="transition hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSearch className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Building2 className="size-3" /> {l.raw_editais?.orgao?.razao_social ?? "Órgão"}</p>
                    <p className="line-clamp-1 text-sm font-medium">{l.titulo || l.raw_editais?.objeto}</p>
                  </div>
                  <Badge variant="muted">{dataBR(l.criado_em.slice(0, 10))}</Badge>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
