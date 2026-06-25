import Link from "next/link";
import { KanbanSquare, ChevronLeft, ChevronRight, X, Building2, ArrowRight, ShieldAlert, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { diasAteVencer, statusCertidao, CERTIDAO_LABEL } from "@/lib/certidoes";
import { diasAte } from "@/lib/utils";
import { moverStage, descartarCard } from "./actions";

// Colunas da jornada (v2). As CHAVES (nova/monitorando/preparacao/edital/resultado) são
// contrato do banco/moverStage — NÃO mudam. Só o rótulo/cor seguem o blueprint v2.
const STAGES = [
  { key: "nova", label: "Em análise", cor: "yellow" },
  { key: "monitorando", label: "Monitorando", cor: "blue" },
  { key: "preparacao", label: "Preparação", cor: "purple" },
  { key: "edital", label: "Em disputa", cor: "red" },
  { key: "resultado", label: "Resultado / Contrato", cor: "green" },
];

type Oport = {
  numero_controle_pncp: string;
  stage: string;
  raw_editais: {
    objeto: string | null;
    valor_estimado: number | null;
    data_encerramento: string | null;
    orgao: { razao_social: string | null } | null;
  } | null;
};

const brl = (v: number | null | undefined) =>
  v == null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function KanbanPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("oportunidade")
    .select(
      "numero_controle_pncp, stage, raw_editais:numero_controle_pncp(objeto, valor_estimado, data_encerramento, orgao:cnpj_orgao(razao_social))"
    )
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
    <div className="v2 space-y-4">
      {/* ===== Hero v2 ===== */}
      <div className="hero">
        <div>
          <h1>Kanban de Execução</h1>
          <p>Só as licitações que você decidiu trabalhar entram aqui. É o CRM operacional da venda ao governo.</p>
        </div>
        <Link className="primaryBtn" href="/radar" data-testid="kanban-novo">
          <Plus className="size-4" /> Novo processo
        </Link>
      </div>

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
        <div className="kanban" data-testid="kanban-board">
          {STAGES.map((s, si) => (
            <div key={s.key} className="column" data-testid={`coluna-${s.key}`}>
              <div className={`colHead ${s.cor}`}>
                <span>{s.label}</span>
                <span className="count" data-testid={`coluna-${s.key}-count`}>{byStage[s.key].length}</span>
              </div>
              <div>
                {byStage[s.key].map((o) => {
                  const prev = STAGES[si - 1]?.key;
                  const next = STAGES[si + 1]?.key;
                  const ed = o.raw_editais;
                  const valor = brl(ed?.valor_estimado);
                  const dias = ed?.data_encerramento ? diasAte(ed.data_encerramento) : null;
                  return (
                    <div key={o.numero_controle_pncp} className="kCard" data-testid="kanban-card">
                      <h3 className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{ed?.orgao?.razao_social ?? "Órgão"}</span>
                      </h3>
                      <p className="line-clamp-3">{ed?.objeto ?? o.numero_controle_pncp}</p>
                      {(valor || dias != null) && (
                        <div className="meta">
                          {valor && (<><span>Valor</span><span>{valor}</span></>)}
                          {dias != null && (<><span>Prazo</span><span>{dias < 0 ? "encerrado" : dias === 0 ? "hoje" : `${dias} dias`}</span></>)}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-1 border-t pt-2">
                        {prev && (
                          <form action={moverStage}>
                            <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                            <input type="hidden" name="stage" value={prev} />
                            <button type="submit" aria-label="Voltar etapa" className="grid size-7 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"><ChevronLeft className="size-4" /></button>
                          </form>
                        )}
                        {next && (
                          <form action={moverStage}>
                            <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                            <input type="hidden" name="stage" value={next} />
                            <button type="submit" aria-label="Avançar etapa" className="grid size-7 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"><ChevronRight className="size-4" /></button>
                          </form>
                        )}
                        <form action={descartarCard} className="ml-auto">
                          <input type="hidden" name="numero" value={o.numero_controle_pncp} />
                          <button type="submit" aria-label="Descartar" className="grid size-7 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-destructive"><X className="size-4" /></button>
                        </form>
                      </div>
                    </div>
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
