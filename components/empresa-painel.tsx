// Painel "Minha Empresa" — extraído de /empresa para ser reusado tanto em /empresa
// quanto na aba "Perfil da Empresa" do hub /configuracoes (comportamento idêntico).
// As server actions (addDocumento/deleteDocumento/atualizarEmpresa) revalidam ambas as rotas.
import Link from "next/link";
import {
  Building2, ShieldCheck, MapPin, Trash2, ArrowRight, Gauge, RefreshCw,
  Phone, Mail, Landmark, Users, FileText, Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Progress } from "@/components/ui";
import { SEG_LABEL, formatCnae } from "@/lib/segmentos";
import { CERTIDAO_TIPOS, CERTIDAO_LABEL, diasAteVencer } from "@/lib/certidoes";
import { itensAplicaveis, statusItem, calcProntidao, ITEM_STATUS_META } from "@/lib/habilitacao";
import { dataBR } from "@/lib/utils";
import { addDocumento, deleteDocumento, atualizarEmpresa } from "@/app/(shell)/empresa/actions";
import { AddDocForm, TrocarEmpresaButton } from "@/app/(shell)/empresa/client";

const brl = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

type Doc = { id: string; tipo: string; tipo_label: string | null; vencimento: string };

export async function EmpresaPainel() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("*").maybeSingle();

  if (!company) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Building2 className="size-6" /></div>
          <h2 className="text-lg font-bold">Configure sua empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">Faça o Raio-X por CNPJ para liberar o radar, as certidões e a prontidão.</p>
          <Button asChild className="mt-4"><Link href="/onboarding">Começar <ArrowRight className="size-4" /></Link></Button>
        </Card>
      </div>
    );
  }

  const { data: docs } = await supabase.from("documento").select("*").order("vencimento", { ascending: true });
  const documentos: Doc[] = docs ?? [];
  const docByTipo: Record<string, Doc> = {};
  for (const d of documentos) docByTipo[d.tipo] = d;

  const segmentos: string[] = company.segmentos ?? [];
  const secundarios: { codigo: string; descricao: string }[] = company.cnaes_secundarios ?? [];
  const qsa: { nome: string; qualificacao: string | null }[] = company.qsa ?? [];

  const aplicaveis = itensAplicaveis(segmentos);
  const { pct, validos, total } = calcProntidao(aplicaveis, docByTipo);
  const prontTone = pct >= 80 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive";

  const endereco = [
    company.logradouro, company.numero && `nº ${company.numero}`, company.complemento,
    company.bairro, company.municipio && `${company.municipio}/${company.uf}`, company.cep && `CEP ${company.cep}`,
  ].filter(Boolean).join(", ");

  const extras = documentos.filter((d) => !aplicaveis.some((a) => a.key === d.tipo));
  const tiposExtras = CERTIDAO_TIPOS.filter((t) => !aplicaveis.some((a) => a.key === t.key));
  const docLabel = (d: Doc) => d.tipo_label || CERTIDAO_LABEL[d.tipo] || d.tipo;

  return (
    <div className="space-y-5" data-testid="empresa-painel">
      {/* Cabeçalho */}
      <Card>
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="size-6" /></div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{company.razao_social}</CardTitle>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {company.municipio}/{company.uf} · {company.cnpj}
              {company.matriz_filial && <Badge variant="muted">{company.matriz_filial}</Badge>}
              {company.situacao_cadastral && (
                <Badge variant={company.situacao_cadastral === "ATIVA" ? "success" : "warning"}>{company.situacao_cadastral}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <form action={atualizarEmpresa}>
              <Button type="submit" variant="outline" size="sm"><RefreshCw className="size-4" /> Atualizar</Button>
            </form>
            <TrocarEmpresaButton />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Identificação */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4 text-primary" /> Identificação</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Razão social" value={company.razao_social} />
              <Field label="Nome fantasia" value={company.nome_fantasia} />
              <Field label="Natureza jurídica" value={company.natureza_juridica} />
              <Field label="Porte" value={company.porte} />
              <Field label="Capital social" value={brl(company.capital_social)} />
              <Field label="Optante Simples/MEI" value={company.opcao_simples ? "Simples Nacional" : company.opcao_mei ? "MEI" : "Não optante"} />
              <Field label="Abertura" value={company.data_inicio_atividade ? dataBR(company.data_inicio_atividade) : "—"} />
              <Field label="Situação desde" value={company.situacao_data ? dataBR(company.situacao_data) : "—"} />
            </CardContent>
          </Card>

          {/* Endereço & contato */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="size-4 text-primary" /> Endereço &amp; contato</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Endereço" value={endereco} />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm"><Phone className="size-4 text-muted-foreground" /> {company.telefone || "—"}</div>
                <div className="flex items-center gap-2 text-sm"><Mail className="size-4 text-muted-foreground" /> {company.email || "—"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Atividades */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="size-4 text-primary" /> Atividades (CNAEs)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Principal</p>
                <p className="text-sm font-medium">{company.cnae_principal ? formatCnae(company.cnae_principal) : "—"}{" "}
                  <span className="font-normal text-muted-foreground">{company.cnae_principal_desc}</span></p>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Nichos</p>
                <div className="flex flex-wrap gap-1.5">
                  {segmentos.length ? segmentos.map((s) => <Badge key={s} variant="secondary">{SEG_LABEL[s] ?? s}</Badge>) : <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              {secundarios.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Secundários ({secundarios.length})</p>
                  <ul className="space-y-1">
                    {secundarios.map((c) => (
                      <li key={c.codigo} className="flex gap-2 text-sm">
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatCnae(c.codigo)}</span>
                        <span className="text-muted-foreground">{c.descricao}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quadro societário */}
          {qsa.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4 text-primary" /> Quadro societário ({qsa.length})</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {qsa.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-sm font-medium">{s.nome}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.qualificacao}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Card lateral — Prontidão */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gauge className="size-4 text-primary" /> Prontidão</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-4xl font-extrabold ${prontTone}`}>{pct}%</p>
              <p className="mt-1 text-sm text-muted-foreground">{validos} de {total} obrigatórias válidas</p>
              <Progress value={pct} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">Sobre a checklist da Lei 14.133 aplicável aos seus nichos.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Habilitação — checklist obrigatória */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" /> Vigia de documentos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre suas certidões e licenças. Não emitimos automaticamente ainda — emissão assistida em breve.
            O que faltar aparece como <span className="font-medium text-destructive">Ausente</span> e conta como gap na prontidão.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border">
            {aplicaveis.map((it) => {
              const doc = docByTipo[it.key];
              const st = statusItem(doc);
              const meta = ITEM_STATUS_META[st];
              return (
                <li key={it.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-[120px] items-center"><Badge variant={meta.badge}>{meta.label}</Badge></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{it.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc ? `Vence ${dataBR(doc.vencimento)} · ${diasAteVencer(doc.vencimento) < 0 ? `há ${-diasAteVencer(doc.vencimento)}d` : `em ${diasAteVencer(doc.vencimento)}d`}` : it.orgao}
                    </p>
                  </div>
                  {doc ? (
                    <form action={deleteDocumento}>
                      <input type="hidden" name="id" value={doc.id} />
                      <button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button>
                    </form>
                  ) : (
                    <form action={addDocumento} className="flex items-center gap-2">
                      <input type="hidden" name="tipo" value={it.key} />
                      <Input type="date" name="vencimento" required className="w-40" />
                      <Button type="submit" size="sm" variant="outline"><Plus className="size-4" /> Cadastrar</Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Outros documentos (extensível) */}
          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">Outros documentos</p>
            {extras.length > 0 && (
              <ul className="mb-3 divide-y rounded-md border">
                {extras.map((d) => {
                  const st = statusItem(d);
                  const meta = ITEM_STATUS_META[st];
                  return (
                    <li key={d.id} className="flex items-center gap-3 p-3">
                      <Badge variant={meta.badge}>{meta.label}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{docLabel(d)}</p>
                        <p className="text-xs text-muted-foreground">Vence {dataBR(d.vencimento)}</p>
                      </div>
                      <form action={deleteDocumento}>
                        <input type="hidden" name="id" value={d.id} />
                        <button type="submit" aria-label="Remover" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
            <AddDocForm tipos={tiposExtras} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
