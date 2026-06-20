// Tela de DADO REAL — lê o JSON gerado pelo harvester+cruzamento (PNCP Consulta API).
// Sem mock: contagem real por cidade × segmento + lista com as etapas presentes
// (PCA → EDITAL → ATA → CONTRATO) em cada card. "Substitui o mock" para esta visão.
import { Card, CardContent, Badge } from "@/components/ui";
import data from "@/lib/real-data.json";
import { CheckCircle2, Circle, Database } from "lucide-react";

type Etapas = { pca: boolean; pca_antes: boolean; edital: boolean; ata: boolean; contrato: boolean };
type Op = {
  id: string; cidade: string; segmentos: string[]; orgao: string | null; unidade: string | null;
  codigoUnidadeAdministrativa: string | null; objeto: string; valor: number | null;
  modalidade: string | null; data_edital: string | null; pca_data: string | null;
  n_atas: number; n_contratos: number; etapas: Etapas;
};

const BRL = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Kpi({ label, value, hot }: { label: string; value: React.ReactNode; hot?: boolean }) {
  return (
    <Card className={hot ? "border-primary/50 bg-primary/5" : "border-border/60"}>
      <CardContent className="p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${hot ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

const STEPS: { key: keyof Etapas; label: string }[] = [
  { key: "pca", label: "PCA" },
  { key: "edital", label: "Edital" },
  { key: "ata", label: "Ata" },
  { key: "contrato", label: "Contrato" },
];

function Pipeline({ et }: { et: Etapas }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const on = et[s.key];
        return (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/50"}`}>
              {on ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}{s.label}
              {s.key === "pca" && et.pca_antes && <span className="ml-0.5 rounded bg-primary/20 px-1 text-[8px] uppercase text-primary">antes</span>}
            </span>
            {i < STEPS.length - 1 && <span className="text-muted-foreground/30">→</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function DadosReaisPage() {
  const d = data as unknown as {
    gerado_em: string; fonte: string; config: { n_fatias_concluidas?: number; concluido?: boolean };
    totais: Record<string, number>;
    por_cidade_segmento: { cidade: string; segmento: string; n: number; pca: number; pca_antes: number; com_ata: number; com_contrato: number; valor_total: number }[];
    oportunidades: Op[];
  };
  const t = d.totais;
  const cidades = Array.from(new Set(d.por_cidade_segmento.map((r) => r.cidade)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="size-4 text-primary" />
          <span><strong className="text-foreground">Dado REAL</strong> · {d.fonte}</span>
        </div>
        <Badge variant="muted" className="text-[10px]">
          gerado {d.gerado_em} · {d.config?.n_fatias_concluidas ?? "?"} fatias · {d.config?.concluido ? "completo" : "parcial (coleta em curso)"}
        </Badge>
      </div>

      {/* KPIs reais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Editais varridos" value={t.editais} />
        <Kpi label="Oportunidades (c/ segmento)" value={t.oportunidades} />
        <Kpi label="PCA antes do edital" value={t.pca_antes_do_edital} hot />
        <Kpi label="Com PCA" value={t.com_pca} />
        <Kpi label="Com ata" value={t.com_ata} />
        <Kpi label="Com contrato" value={t.com_contrato} />
      </div>

      {/* Tabela cidade × segmento */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Contagem real por cidade × segmento</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Cidade</th><th className="py-2 pr-3">Segmento</th>
                  <th className="py-2 pr-3 text-right">Oport.</th><th className="py-2 pr-3 text-right">PCA</th>
                  <th className="py-2 pr-3 text-right">PCA antes</th><th className="py-2 pr-3 text-right">Ata</th>
                  <th className="py-2 pr-3 text-right">Contrato</th><th className="py-2 text-right">Valor estimado</th>
                </tr>
              </thead>
              <tbody>
                {d.por_cidade_segmento.map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="py-2 pr-3">{r.cidade}</td>
                    <td className="py-2 pr-3">{r.segmento}</td>
                    <td className="py-2 pr-3 text-right font-medium">{r.n}</td>
                    <td className="py-2 pr-3 text-right">{r.pca}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-primary">{r.pca_antes}</td>
                    <td className="py-2 pr-3 text-right">{r.com_ata}</td>
                    <td className="py-2 pr-3 text-right">{r.com_contrato}</td>
                    <td className="py-2 text-right text-muted-foreground">{BRL(r.valor_total)}</td>
                  </tr>
                ))}
                {d.por_cidade_segmento.length === 0 && (
                  <tr><td colSpan={8} className="py-4 text-center text-muted-foreground">Sem oportunidades de segmento ainda (coleta em curso).</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lista de oportunidades com etapas */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Oportunidades ({d.oportunidades.length}) — etapas presentes por card</h2>
        {cidades.map((cid) => {
          const ops = d.oportunidades.filter((o) => o.cidade === cid);
          if (!ops.length) return null;
          return (
            <div key={cid} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cid} · {ops.length}</p>
              <div className="grid gap-2 lg:grid-cols-2">
                {ops.slice(0, 80).map((o) => (
                  <Card key={o.id} className="border-border/60">
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{o.orgao || "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">{o.unidade || ""}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                          {o.segmentos.map((s) => <Badge key={s} variant="muted" className="text-[9px]">{s}</Badge>)}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-xs text-foreground/80">{o.objeto}</p>
                      <Pipeline et={o.etapas} />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{o.modalidade || "—"}</span>
                        <span>edital: {o.data_edital || "—"}</span>
                        {o.etapas.pca_antes && <span className="text-primary">PCA: {o.pca_data}</span>}
                        <span>{BRL(o.valor)}</span>
                        <span className="font-mono text-[10px] opacity-70">und {o.codigoUnidadeAdministrativa || "—"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
