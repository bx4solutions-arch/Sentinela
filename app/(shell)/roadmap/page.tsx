import Link from "next/link";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { Target, KanbanSquare, Clock, RefreshCw, Swords, FileText, BarChart3, Settings, ArrowLeft } from "lucide-react";

const LENTES = [
  { icon: Target, nome: "Oportunidades", desc: "Lista completa filtrável da base monitorada." },
  { icon: KanbanSquare, nome: "Kanban Comercial", desc: "Board por estágio comercial (mesma engine da Esteira)." },
  { icon: Clock, nome: "Contratos Vencendo", desc: "Lente da recompra: contratos perto do vencimento." },
  { icon: RefreshCw, nome: "Segunda Chance", desc: "Republicações de licitações fracassadas/desertas.", regua: true },
  { icon: Swords, nome: "Concorrentes", desc: "Incumbentes, vitórias, sanções (CEIS/CNEP)." },
  { icon: FileText, nome: "Documentos", desc: "Acervo por estágio (lazy, sob demanda)." },
  { icon: BarChart3, nome: "Relatórios", desc: "Exportações e visões executivas." },
  { icon: Settings, nome: "Configurações", desc: "Recorte, alertas, integrações." },
];

export default function RoadmapPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />Voltar ao Dashboard</Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight">Em breve — visão Sala de Guerra</h1>
        <p className="text-sm text-muted-foreground">
          Estas são <strong>lentes leves</strong> sobre a mesma base (não 11 produtos). O núcleo é Dashboard + as telas do PRD; o resto reusa os mesmos componentes.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {LENTES.map((l) => (
          <Card key={l.nome} className="border-border/60 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10"><l.icon className="size-4 text-primary" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{l.nome}</p>
                  <Badge variant={l.regua ? "warning" : "muted"} className="text-[10px]">{l.regua ? "roadmap (régua)" : "em breve"}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{l.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button asChild variant="outline" size="sm"><Link href="/dashboard">Ir para o Dashboard</Link></Button>
    </div>
  );
}
