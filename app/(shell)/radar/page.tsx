import { DEMANDS } from "@/lib/mock";
import { RadarCard } from "@/components/sentinela";
import { Badge } from "@/components/ui";
import { SlidersHorizontal } from "lucide-react";

const ORDEM = { ALTA: 0, MÉDIA: 1, BAIXA: 2 } as const;

export default function RadarPage() {
  const curadas = [...DEMANDS].sort(
    (a, b) => ORDEM[a.indices.iminencia] - ORDEM[b.indices.iminencia] || b.indices.chance - a.indices.chance
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Radar</h1>
        <p className="text-sm text-muted-foreground">
          {curadas.length} oportunidades curadas hoje — nunca 300 alertas. Cada card mostra <em>por que apareceu</em> e a <em>ação de hoje</em>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" />Filtros:</span>
        {["Iminência", "Chance", "Valor", "Órgão"].map((f) => (
          <Badge key={f} variant="outline" className="cursor-default">{f}</Badge>
        ))}
      </div>

      <div className="space-y-3">
        {curadas.map((d) => <RadarCard key={d.id} demand={d} />)}
      </div>
    </div>
  );
}
