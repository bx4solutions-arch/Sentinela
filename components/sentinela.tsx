"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell, FileText, ExternalLink, ArrowRight, Clock, Building2, TrendingUp,
  AlertTriangle, CheckCircle2, Circle, ShieldCheck, Repeat,
} from "lucide-react";
import {
  STAGES, stageIndex, type Demand, type Iminencia, type StageKey,
  type NotificationItem, SOURCES, MOCK_DISCLAIMER,
} from "@/lib/mock";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { brl, dataBR, cn } from "@/lib/utils";

/* ---------- Banner mock ---------- */
export function MockBanner() {
  return (
    <div className="flex items-center gap-2 bg-warning/15 px-4 py-1.5 text-xs text-warning-foreground/90">
      <AlertTriangle className="size-3.5 text-warning" />
      <span className="text-foreground/70">{MOCK_DISCLAIMER}</span>
    </div>
  );
}

/* ---------- Iminência ---------- */
const imVariant: Record<Iminencia, "warning" | "secondary" | "muted"> = {
  ALTA: "warning", MÉDIA: "secondary", BAIXA: "muted",
};
export function ImminenceBadge({ im }: { im: Iminencia }) {
  return <Badge variant={imVariant[im]}>Iminência {im}</Badge>;
}

/* ---------- Chance ---------- */
export function ChanceScore({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const tone = value >= 66 ? "text-success" : value >= 45 ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-1.5">
      <TrendingUp className={cn("size-4", tone)} />
      <span className={cn("font-semibold tabular-nums", tone, size === "md" && "text-lg")}>{value}</span>
      <span className="text-xs text-muted-foreground">/100 chance</span>
    </div>
  );
}

/* ---------- Mini-rail da esteira (Dossiê/Radar) ---------- */
export function StageMiniRail({ demand }: { demand: Demand }) {
  const iAtual = stageIndex(demand.estagioAtual);
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
      {STAGES.map((s, i) => (
        <React.Fragment key={s.key}>
          <span className={cn("inline-flex items-center gap-1", i <= iAtual ? "font-medium text-primary" : "text-muted-foreground")}>
            {i <= iAtual ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
            {s.label}
          </span>
          {i < STAGES.length - 1 && <span className="text-muted-foreground/40">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---------- Stepper horizontal (UM processo, docs por estágio) ---------- */
export function StageStepper({ demand }: { demand: Demand }) {
  const iAtual = stageIndex(demand.estagioAtual);
  const [sel, setSel] = React.useState<StageKey>(demand.estagioAtual);
  const selDef = STAGES.find((s) => s.key === sel)!;
  const selEvent = demand.esteira.find((e) => e.stage === sel);
  const selDocs = demand.docs.filter((d) => d.stage === sel);
  const isContrato = sel === "CONTRATO" || sel === "VIGENCIA";

  return (
    <div className="space-y-4">
      <div className="flex items-stretch overflow-x-auto pb-2">
        {STAGES.map((s, i) => {
          const done = i <= iAtual;
          const active = s.key === sel;
          return (
            <button
              key={s.key}
              onClick={() => setSel(s.key)}
              className={cn(
                "flex min-w-[92px] flex-1 flex-col items-center gap-1 px-1 text-center",
                "focus:outline-none"
              )}
            >
              <div className="flex w-full items-center">
                <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done ? "bg-primary" : "bg-border")} />
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border text-[11px] font-semibold transition",
                    done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
                    active && "ring-2 ring-ring ring-offset-2"
                  )}
                >
                  {done ? <CheckCircle2 className="size-4" /> : i + 1}
                </span>
                <span className={cn("h-0.5 flex-1", i === STAGES.length - 1 ? "opacity-0" : i < iAtual ? "bg-primary" : "bg-border")} />
              </div>
              <span className={cn("text-xs font-medium", active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{s.sub}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{selDef.label} · {selDef.sub}</p>
              <p className="text-xs text-muted-foreground">{selDef.papel}</p>
            </div>
            {selEvent?.status === "COMPLETO" ? (
              <Badge variant="success">Concluído {selEvent.date ? `· ${dataBR(selEvent.date)}` : ""}</Badge>
            ) : (
              <Badge variant="muted">Pendente</Badge>
            )}
          </div>

          {selDocs.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {selDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <FileText className="size-4 text-primary" />
                  <span className="flex-1">{d.tipo}</span>
                  <span className="text-xs text-muted-foreground">{d.fonte} · {dataBR(d.publicado)}</span>
                  <Button size="sm" variant="ghost" className="text-primary">Acessar</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Sem documentos neste estágio (carregados sob demanda — lazy).
            </p>
          )}

          {/* Fecho do ciclo antecipação ↔ recompra (CTA mock) */}
          {isContrato && (
            <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Repeat className="size-4 text-primary" />
                <span>
                  {demand.ganho ? "Contrato ganho — " : "Contrato do concorrente — "}
                  Quer monitorar este contrato até o vencimento?
                </span>
              </div>
              <Button size="sm">Monitorar recompra</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Kanban board (TODOS os processos, colunas = estágios) ---------- */
export function StageKanban({ demands }: { demands: Demand[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STAGES.map((s) => {
        const items = demands.filter((d) => d.estagioAtual === s.key);
        return (
          <div key={s.key} className="flex w-60 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5">
              <span className="text-xs font-semibold">{s.label} <span className="font-normal text-muted-foreground">· {s.sub}</span></span>
              <Badge variant="muted">{items.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((d) => (
                <Link key={d.id} href={`/esteira/${d.id}`}>
                  <Card className="transition hover:border-primary hover:shadow">
                    <CardContent className="space-y-1.5 p-3">
                      <p className="line-clamp-2 text-sm font-medium">{d.titulo}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" />{d.org.unidade}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-medium text-primary">{brl(d.financeiro.valorPrevisto)}</span>
                        <ImminenceBadge im={d.indices.iminencia} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {items.length === 0 && <p className="px-1 text-xs text-muted-foreground/60">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Card do Radar ---------- */
export function RadarCard({ demand }: { demand: Demand }) {
  return (
    <Link href={`/dossie/${demand.id}`} className="block">
      <Card className="transition hover:border-primary hover:shadow-md">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold leading-tight">{demand.titulo}</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="size-3.5" />{demand.org.nome} · {demand.org.unidade}</p>
            </div>
            <ImminenceBadge im={demand.indices.iminencia} />
          </div>

          {demand.alerta && (
            <div className="flex items-center gap-1.5 rounded-md bg-warning/15 px-2.5 py-1 text-xs font-medium text-foreground/80">
              <AlertTriangle className="size-3.5 text-warning" />{demand.alerta}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <ChanceScore value={demand.indices.chance} />
            <span className="text-sm font-semibold text-primary">{brl(demand.financeiro.valorPrevisto)}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3.5" />Janela {dataBR(demand.financeiro.janelaInicio)}–{dataBR(demand.financeiro.janelaFim)}</span>
            {demand.diasParaVencer != null && <span className="text-xs text-muted-foreground">vence em {demand.diasParaVencer}d</span>}
          </div>

          <StageMiniRail demand={demand} />

          <div className="flex items-center justify-between border-t pt-2">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Por que apareceu:</span> {demand.porqueApareceu}</p>
            <ArrowRight className="size-4 shrink-0 text-primary" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ---------- Fontes ---------- */
export function SourceLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {SOURCES.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">
          {s.label} <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  );
}

/* ---------- Sino de notificações (produto vivo) ---------- */
export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = React.useState(false);
  const naoLidas = items.filter((i) => !i.lida).length;
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Notificações" className="text-sidebar-foreground hover:bg-sidebar-accent">
        <Bell className="size-5" />
        {naoLidas > 0 && (
          <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">{naoLidas}</span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold">
              <Bell className="size-4 text-primary" /> Agente diário
            </div>
            <ul className="max-h-80 divide-y overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className={cn("block px-3 py-2.5 text-sm hover:bg-accent", !n.lida && "bg-primary/5")}>
                    <p className="leading-snug">{n.mensagem}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{dataBR(n.quando)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export { ShieldCheck };
