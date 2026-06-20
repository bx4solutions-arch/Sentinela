"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Search, Building2, CheckCircle2, Loader2, MapPin, BadgeCheck } from "lucide-react";
import { Button, Input, Label, Badge, Card } from "@/components/ui";
import { SEGMENTOS, SEG_LABEL, formatCnae } from "@/lib/segmentos";
import { consultarCnpj, salvarEmpresa, type ConsultaState } from "./actions";

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

function SalvarBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      {pending ? "Salvando…" : "Salvar empresa e continuar"}
    </Button>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default function OnboardingPage() {
  const [cnpj, setCnpj] = useState("");
  const [state, formAction] = useActionState<ConsultaState, FormData>(consultarCnpj, { ok: false });
  const data = state.ok ? state.data : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-lg font-bold">Configurar sua empresa</h2>
        <p className="text-sm text-muted-foreground">
          Digite o CNPJ. Buscamos o Raio-X na Receita (via BrasilAPI) e sugerimos seus nichos.
        </p>
      </div>

      {/* Passo 1 — CNPJ */}
      <Card className="p-5">
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              required
            />
          </div>
          <ConsultarBtn />
        </form>
        {state.error && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
      </Card>

      {/* Passo 2 — Raio-X + nichos */}
      {data && (
        <Card className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{data.razaoSocial || "Empresa"}</h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {data.municipio}/{data.uf}
                {data.situacaoCadastral && (
                  <Badge variant={data.situacaoCadastral === "ATIVA" ? "success" : "warning"} className="ml-1">
                    {data.situacaoCadastral}
                  </Badge>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Nome fantasia" value={data.nomeFantasia} />
            <Field label="Porte" value={data.porte} />
            <Field label="Natureza jurídica" value={data.naturezaJuridica} />
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CNAE principal</p>
              <p className="text-sm font-medium">
                {data.cnaePrincipal ? formatCnae(data.cnaePrincipal) : "—"}{" "}
                <span className="font-normal text-muted-foreground">{data.cnaePrincipalDesc}</span>
              </p>
            </div>
          </div>

          {data.cnaesSecundarios.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                CNAEs secundários ({data.cnaesSecundarios.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.cnaesSecundarios.slice(0, 12).map((c) => (
                  <span key={c.codigo} className="rounded border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground" title={c.descricao}>
                    {formatCnae(c.codigo)}
                  </span>
                ))}
                {data.cnaesSecundarios.length > 12 && (
                  <span className="px-2 py-0.5 text-xs text-muted-foreground">+{data.cnaesSecundarios.length - 12}</span>
                )}
              </div>
            </div>
          )}

          {/* Nichos */}
          <form action={salvarEmpresa} className="mt-5 border-t pt-5">
            <div className="mb-2 flex items-center gap-2">
              <BadgeCheck className="size-4 text-primary" />
              <p className="text-sm font-semibold">Seus nichos</p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Sugeridos a partir do CNAE. Ajuste se quiser — você pode marcar mais de um.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SEGMENTOS.map((s) => {
                const sugerido = data.segmentosSugeridos.includes(s.key);
                return (
                  <label key={s.key} className="flex cursor-pointer items-center gap-2.5 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="checkbox" name="segmentos" value={s.key} defaultChecked={sugerido} className="size-4" />
                    <span className="flex-1">{SEG_LABEL[s.key]}</span>
                    {sugerido && <Badge variant="muted">sugerido</Badge>}
                  </label>
                );
              })}
            </div>

            <input type="hidden" name="raiox" value={JSON.stringify(data)} />
            <div className="mt-5">
              <SalvarBtn />
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
