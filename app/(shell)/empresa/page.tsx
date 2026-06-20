import Link from "next/link";
import {
  Building2, ShieldCheck, MapPin, Trash2, BadgeCheck, ArrowRight, Gauge,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Label, Select, Progress } from "@/components/ui";
import { SEG_LABEL, formatCnae } from "@/lib/segmentos";
import { CERTIDAO_TIPOS, CERTIDAO_LABEL, statusCertidao, diasAteVencer, STATUS_META } from "@/lib/certidoes";
import { dataBR } from "@/lib/utils";
import { addCertidao, deleteCertidao } from "./actions";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default async function EmpresaPage() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("*").maybeSingle();

  // Sem empresa → onboarding
  if (!company) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-6" />
          </div>
          <h2 className="text-lg font-bold">Configure sua empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça o Raio-X por CNPJ para liberar o radar, as certidões e a prontidão.
          </p>
          <Button asChild className="mt-4">
            <Link href="/onboarding">Começar <ArrowRight className="size-4" /></Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: certs } = await supabase
    .from("certidao")
    .select("*")
    .order("vencimento", { ascending: true });
  const certidoes = certs ?? [];

  const total = certidoes.length;
  const validas = certidoes.filter((c) => statusCertidao(c.vencimento) !== "VENCIDO").length;
  const prontidao = total ? Math.round((validas / total) * 100) : 0;
  const prontTone = prontidao >= 80 ? "text-success" : prontidao >= 50 ? "text-warning" : "text-destructive";
  const segmentos: string[] = company.segmentos ?? [];
  const secundarios: { codigo: string; descricao: string }[] = company.cnaes_secundarios ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Raio-X */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{company.razao_social}</CardTitle>
              <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {company.municipio}/{company.uf} · {company.cnpj}
                {company.situacao_cadastral && (
                  <Badge variant={company.situacao_cadastral === "ATIVA" ? "success" : "warning"} className="ml-1">
                    {company.situacao_cadastral}
                  </Badge>
                )}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/onboarding">Atualizar</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Nome fantasia" value={company.nome_fantasia} />
              <Field label="Porte" value={company.porte} />
              <Field label="Natureza jurídica" value={company.natureza_juridica} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">CNAE principal</p>
              <p className="text-sm font-medium">
                {company.cnae_principal ? formatCnae(company.cnae_principal) : "—"}{" "}
                <span className="font-normal text-muted-foreground">{company.cnae_principal_desc}</span>
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Nichos</p>
              <div className="flex flex-wrap gap-1.5">
                {segmentos.length ? (
                  segmentos.map((s) => <Badge key={s} variant="secondary">{SEG_LABEL[s] ?? s}</Badge>)
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
            {secundarios.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  CNAEs secundários ({secundarios.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {secundarios.slice(0, 10).map((c) => (
                    <span key={c.codigo} className="rounded border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground" title={c.descricao}>
                      {formatCnae(c.codigo)}
                    </span>
                  ))}
                  {secundarios.length > 10 && (
                    <span className="px-2 py-0.5 text-xs text-muted-foreground">+{secundarios.length - 10}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prontidão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="size-4 text-primary" /> Prontidão da empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-4xl font-extrabold ${prontTone}`}>{prontidao}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {total === 0
                ? "Cadastre suas certidões para medir a prontidão."
                : `${validas} de ${total} certidões válidas.`}
            </p>
            <Progress value={prontidao} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Vigia de certidões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" /> Vigia de certidões
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre o vencimento de cada documento — o semáforo alerta 30 dias antes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista */}
          {certidoes.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhuma certidão cadastrada ainda.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {certidoes.map((c) => {
                const st = statusCertidao(c.vencimento);
                const meta = STATUS_META[st];
                const dias = diasAteVencer(c.vencimento);
                return (
                  <li key={c.id} className="flex items-center gap-3 p-3">
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{CERTIDAO_LABEL[c.tipo] ?? c.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence {dataBR(c.vencimento)}{" "}
                        {dias < 0 ? `· há ${-dias}d` : `· em ${dias}d`}
                        {c.numero ? ` · nº ${c.numero}` : ""}
                      </p>
                    </div>
                    <form action={deleteCertidao}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Adicionar */}
          <form action={addCertidao} className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select id="tipo" name="tipo" required defaultValue="">
                <option value="" disabled>Selecione…</option>
                {CERTIDAO_TIPOS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emissao">Emissão</Label>
              <Input id="emissao" name="emissao" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vencimento">Vencimento</Label>
              <Input id="vencimento" name="vencimento" type="date" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <BadgeCheck className="size-4" /> Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
