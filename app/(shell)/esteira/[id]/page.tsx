import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemand } from "@/lib/mock";
import { StageStepper, ImminenceBadge } from "@/components/sentinela";
import { Badge } from "@/components/ui";
import { ArrowLeft, Building2 } from "lucide-react";
import { brl } from "@/lib/utils";

export default async function EsteiraProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDemand(id);
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/esteira" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />Board da esteira</Link>
          <h1 className="mt-1 text-xl font-bold leading-tight">{d.titulo}</h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="size-3.5" />{d.org.nome} · {d.org.unidade}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ImminenceBadge im={d.indices.iminencia} />
          <Badge variant="secondary">{brl(d.financeiro.valorPrevisto)}</Badge>
          <Link href={`/dossie/${d.id}`} className="text-sm text-primary hover:underline">Abrir Dossiê →</Link>
        </div>
      </div>

      <StageStepper demand={d} />
    </div>
  );
}
