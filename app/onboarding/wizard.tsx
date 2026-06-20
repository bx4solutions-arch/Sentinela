"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ShieldCheck, Search, Loader2, Building2, MapPin, CheckCircle2, ArrowRight, ArrowLeft, BadgeCheck,
} from "lucide-react";
import { Button, Input, Label, Badge, Card } from "@/components/ui";
import { SEGMENTOS, SEG_LABEL, formatCnae } from "@/lib/segmentos";
import { itensAplicaveis } from "@/lib/habilitacao";
import { consultarCnpjAction, concluirOnboarding, type ConsultaState } from "./actions";
import type { RaioX } from "@/lib/brasilapi";

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function ConsultarBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      {pending ? "Consultando…" : "Consultar"}
    </Button>
  );
}

function ConcluirBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      {pending ? "Salvando…" : "Concluir e salvar"}
    </Button>
  );
}

const STEPS = ["Empresa", "Nichos", "Certidões"];

export function Wizard({ userEmail, trocar = false }: { userEmail: string; trocar?: boolean }) {
  const [step, setStep] = useState(0);
  const [raiox, setRaiox] = useState<RaioX | null>(null);
  const [nichos, setNichos] = useState<string[]>([]);
  const [certs, setCerts] = useState<Record<string, { vencimento: string; emissao: string }>>({});
  const [cnpj, setCnpj] = useState("");

  const [state, formAction] = useActionState<ConsultaState, FormData>(consultarCnpjAction, { ok: false });

  useEffect(() => {
    if (state.ok && state.data) {
      setRaiox(state.data);
      setNichos(state.data.segmentosSugeridos);
    }
  }, [state]);

  const toggleNicho = (k: string) =>
    setNichos((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const setCert = (tipo: string, field: "vencimento" | "emissao", value: string) =>
    setCerts((cur) => {
      const prev = cur[tipo] ?? { vencimento: "", emissao: "" };
      return { ...cur, [tipo]: { ...prev, [field]: value } };
    });

  const aplicaveis = itensAplicaveis(nichos);
  const certidoesJson = JSON.stringify(
    Object.entries(certs)
      .map(([tipo, v]) => ({ tipo, vencimento: v.vencimento, emissao: v.emissao || null }))
      .filter((c) => c.vencimento)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Topo navy */}
      <header className="bg-sidebar px-6 py-4 text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Configurar sua empresa</p>
            <p className="text-[10px] text-sidebar-foreground/60">{userEmail}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${i < step ? "bg-success text-success-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={i === step ? "font-medium" : "text-muted-foreground"}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        {trocar && (
          <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
            Você está <strong>trocando a empresa monitorada</strong>. Ao concluir, a empresa atual e tudo que
            conhecemos dela serão substituídos pelo novo CNPJ.
          </div>
        )}

        {/* Passo 1 — CNPJ */}
        {step === 0 && (
          <Card className="p-5">
            <h2 className="font-semibold">Qual o CNPJ da sua empresa?</h2>
            <p className="mb-4 text-sm text-muted-foreground">Buscamos a ficha na Receita (via BrasilAPI).</p>
            <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00"
                  value={cnpj} onChange={(e) => setCnpj(maskCnpj(e.target.value))} required />
              </div>
              <ConsultarBtn />
            </form>
            {!state.ok && state.error && (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
            )}

            {raiox && (
              <div className="mt-5 rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-semibold">É essa a sua empresa?</p>
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="size-5" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{raiox.razaoSocial}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {raiox.municipio}/{raiox.uf} · {raiox.cnpj}
                      {raiox.situacaoCadastral && (
                        <Badge variant={raiox.situacaoCadastral === "ATIVA" ? "success" : "warning"} className="ml-1">{raiox.situacaoCadastral}</Badge>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {raiox.cnaePrincipal ? formatCnae(raiox.cnaePrincipal) : ""} {raiox.cnaePrincipalDesc}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setRaiox(null); setCnpj(""); }}>Não, corrigir</Button>
                  <Button size="sm" onClick={() => setStep(1)}>Sim, continuar <ArrowRight className="size-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Passo 2 — Nichos */}
        {step === 1 && raiox && (
          <Card className="p-5">
            <h2 className="font-semibold">Seus nichos</h2>
            <p className="mb-4 text-sm text-muted-foreground">Detectados pelo CNAE. Marque/desmarque conforme atua.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEGMENTOS.map((s) => {
                const on = nichos.includes(s.key);
                const sug = raiox.segmentosSugeridos.includes(s.key);
                return (
                  <label key={s.key} className={`flex cursor-pointer items-center gap-2.5 rounded-md border p-3 text-sm ${on ? "border-primary bg-primary/5" : ""}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleNicho(s.key)} className="size-4" />
                    <span className="flex-1">{SEG_LABEL[s.key]}</span>
                    {sug && <Badge variant="muted">detectado</Badge>}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="size-4" /> Voltar</Button>
              <Button onClick={() => setStep(2)} disabled={nichos.length === 0}>Continuar <ArrowRight className="size-4" /></Button>
            </div>
          </Card>
        )}

        {/* Passo 3 — Certidões (checklist) */}
        {step === 2 && raiox && (
          <Card className="p-5">
            <h2 className="font-semibold">Certidões de habilitação</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Cadastre os vencimentos que já tem. O que faltar fica como “Ausente” — você completa depois.
            </p>
            <div className="space-y-2">
              {aplicaveis.map((it) => (
                <div key={it.key} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.label}</p>
                    <p className="text-xs text-muted-foreground">{it.orgao}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Vence</span>
                    <Input type="date" className="w-40" value={certs[it.key]?.vencimento ?? ""}
                      onChange={(e) => setCert(it.key, "vencimento", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <form action={concluirOnboarding} className="mt-5 flex items-center justify-between">
              <input type="hidden" name="raiox" value={JSON.stringify(raiox)} />
              <input type="hidden" name="certidoes" value={certidoesJson} />
              {trocar && <input type="hidden" name="trocar" value="1" />}
              {nichos.map((n) => <input key={n} type="hidden" name="segmentos" value={n} />)}
              <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="size-4" /> Voltar</Button>
              <ConcluirBtn />
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
