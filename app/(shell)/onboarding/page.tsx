"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from "@/components/ui";
import { Building2, Search, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

const ORGAOS = [
  { nome: "Prefeitura de São Luís — SEMED", nivel: "MUNICIPAL", on: true },
  { nome: "Prefeitura de São Luís — SEMUS", nivel: "MUNICIPAL", on: true },
  { nome: "Câmara Municipal de São Luís", nivel: "MUNICIPAL", on: false },
  { nome: "Governo do Estado do MA", nivel: "ESTADUAL", on: false },
];

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0);
  const [prog, setProg] = React.useState(0);

  React.useEffect(() => {
    if (step !== 3) return;
    setProg(0);
    const t = setInterval(() => setProg((p) => (p >= 100 ? 100 : p + 8)), 180);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Defina seu recorte (objeto × ente) para o Sentinela montar seu radar.</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {["Empresa", "Objeto", "Órgãos", "Backfill"].map((s, i) => (
          <span key={s} className={`flex items-center gap-1 ${i <= step ? "text-primary" : ""}`}>
            <span className={`grid size-5 place-items-center rounded-full text-[10px] ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>{s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <Card><CardHeader><CardTitle className="text-base">1. Sua empresa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="text-sm font-medium">CNPJ</label>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input defaultValue="11.999.888/0001-77" className="w-full bg-transparent text-sm outline-none" />
            </div>
            <p className="text-xs text-muted-foreground">Razão social, endereço e CNAE são puxados automaticamente (mock).</p>
            <div className="rounded-md bg-muted/50 p-3 text-sm"><strong>Dedetizadora Maranhense Ltda</strong><br /><span className="text-muted-foreground">São Luís/MA · CNAE 8122-2/00 Imunização e controle de pragas</span></div>
            <Button onClick={() => setStep(1)} className="w-full">Continuar <ArrowRight className="size-4" /></Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card><CardHeader><CardTitle className="text-base">2. Objeto monitorado</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border p-3 text-sm"><Badge variant="secondary">CNAE 8122-2/00</Badge> <span className="ml-1">Imunização e controle de pragas urbanas</span></div>
            <p className="text-xs text-muted-foreground">Grão da célula = <strong>objeto × ente</strong> (não a cidade inteira).</p>
            <Button onClick={() => setStep(2)} className="w-full">Continuar <ArrowRight className="size-4" /></Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card><CardHeader><CardTitle className="text-base">3. Órgãos-alvo (sugeridos)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ORGAOS.map((o) => (
              <div key={o.nome} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" />{o.nome}</span>
                <Badge variant={o.on ? "success" : "outline"}>{o.on ? "Monitorar" : "Adicionar"}</Badge>
              </div>
            ))}
            <Button onClick={() => setStep(3)} className="mt-2 w-full">Iniciar monitoramento <ArrowRight className="size-4" /></Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card><CardContent className="space-y-4 pt-6 text-center">
          {prog < 100 ? <Loader2 className="mx-auto size-8 animate-spin text-primary" /> : <CheckCircle2 className="mx-auto size-8 text-success" />}
          <p className="font-medium">{prog < 100 ? "Carregando histórico de controle de pragas em São Luís…" : "Pronto! Seu radar foi montado."}</p>
          <Progress value={prog} />
          {prog >= 100 && <Button asChild className="w-full"><Link href="/radar">Ir para o Radar <ArrowRight className="size-4" /></Link></Button>}
        </CardContent></Card>
      )}
    </div>
  );
}
