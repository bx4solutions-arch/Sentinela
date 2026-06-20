import Link from "next/link";
import { KanbanSquare, ChevronLeft, ChevronRight, X, Building2, ArrowRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { diasAteVencer, statusCertidao, CERTIDAO_LABEL } from "@/lib/certidoes";
import { moverStage, descartarCard } from "./actions";

const STAGES = [
  { key: "nova", label: "Nova" },
  { key: "monitorando", label: "Monitorando" },
  { key: "preparacao", label: "Preparação" },
  { key: "edital", label: "Edital" },
  { key: "resultado", label: "Resultado" },
];

type Oport = {
  numero_controle_pncp: string;
  stage: string;
  raw_editais: { objeto: string | null; orgao: { razao_social: string | null } | null } | null;
};

export default async function KanbanPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("oportunidade")
    .select("numero_controle_pncp, stage, raw_editais:numero_controle_pncp(objeto, orgao:cnpj_orgao(razao_social))")
    .neq("stage", "descartado")
    .order("atualizado_em", { ascending: false });
  const oports = (rows ?? []) as unknown as Oport[];

  const byStage: Record<string, Oport[]> = {};
  for (const s of STAGES) byStage[s.key] = [];
  for (const o of oports) (byStage[o.stage] ??= []).push(o);

  // Alerta: documentos vencendo (≤30d ou vencidos)
  const { data: docs } = await supabase.from("documento").select("tipo, tipo_label, vencimento");
  const alertas = (docs ?? [])
    .map((d) => ({ ...d, dias: diasAteVencer(d.vencimento), st: statusCertidao(d.vencimento) }))
    .filter((d) => d.st !== "ATIVO")
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="space-y-4">
      {alertas.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <ShieldAlert className="size-4 text-warning" />
            <span className="font-medium">Atenção:</span>
            {alertas.slice(0, 3).map((d) => (
              <Badge key={d.tipo} variant={d.st === "VENCIDO" ? "destructive" : "warning"}>
                {(d.tipo_label || CERTIDAO_LABEL[d.tipo] || d.tipo)} {d.dias < 0 ? `vencido há ${-d.dias}d` : `vence em ${d.dias}d`}
              </Badge>
            ))}
            <Link href="/empresa" className="ml-auto text-xs font-medium text-primary hover:underline">Renovar →</Link>
          </CardContent>
        </Card>
      )}

      {oports.length === 0 ? (
        <div className="mx-auto max-w-md">
          <Card className="p-6 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><KanbanSquare className="size-6" /></div>
            <h2 className="text-lg font-bold">Seu funil está vazio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Monitore editais no Radar — eles entram aqui na coluna “Monitorando”.</p>
            <Button asChild className="mt-4" variant="outline"><Link href="/radar">Ir para o Radar <ArrowRight className="size-4" /></Link></Button>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {STAGES.map((s, si) => (
            <div key={s.key} className="flex flex-col rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">{s.label}</span>
                <Badge variant="muted">{byStage[s.key].length}</Badge>
              </div>
              <div className="flex-1 space-y-2 p-2">
                {byStage[s.key].map((o) => {
                  const prev = STAGES[si - 1]?.key;
                  const next = STAGES[si + 1]?.key;
                  return (
                    <Card key={o.numero_controle_pncp} className="p-2.5">
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Building2 className="size-3" /> <span className="truncate">{o.raw_editais?.orgao?.razao_social ?? "Órgão"}</span>
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs">{o.raw_editais?.objeto ?? o.numero_controle_pncp}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {prev && (
                          <form action={moverStage}>
                            <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                            <input type="hidden" name="stage" value={prev} />
                            <button type="submit" aria-label="Voltar etapa" className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent"><ChevronLeft className="size-4" /></button>
                          </form>
                        )}
                        {next && (
                          <form action={moverStage}>
                            <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                            <input type="hidden" name="stage" value={next} />
                            <button type="submit" aria-label="Avançar etapa" className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent"><ChevronRight className="size-4" /></button>
                          </form>
                        )}
                        <form action={descartarCard} className="ml-auto">
                          <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                          <button type="submit" aria-label="Descartar" className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-destructive"><X className="size-4" /></button>
                        </form>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
