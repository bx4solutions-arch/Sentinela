import Link from "next/link";
import { Radar as RadarIcon, MapPin, Building2, ExternalLink, Eye, X, Undo2, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { SEG_LABEL } from "@/lib/segmentos";
import { dataBR } from "@/lib/utils";
import { monitorar, descartar, reverter, analisar } from "./actions";

const brl = (n: number | null) =>
  !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

type Edital = {
  numero_controle_pncp: string;
  objeto: string | null;
  valor_estimado: number | null;
  situacao_nome: string | null;
  modalidade_nome: string | null;
  data_publicacao: string | null;
  link_origem: string | null;
  cidade: string | null;
  orgao: { razao_social: string | null } | null;
};

export default async function RadarPage() {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("company")
    .select("segmentos, municipio, uf")
    .maybeSingle();

  const segmentos: string[] = (company?.segmentos ?? []).filter((s: string) => s !== "generico");
  const uf: string | null = company?.uf ?? null;

  if (segmentos.length === 0 || !uf) {
    return (
      <EmptyState
        titulo="Defina um nicho para o Radar"
        texto="Seu CNAE foi classificado como genérico (ou faltou UF). Ajuste os nichos em Minha Empresa para o Radar cruzar editais do seu segmento."
      />
    );
  }

  // Editais reais em andamento do nicho, no MESMO estado (UF) da empresa
  const { data: rows } = await supabase
    .from("raw_editais")
    .select("numero_controle_pncp, objeto, valor_estimado, situacao_nome, modalidade_nome, data_publicacao, link_origem, cidade, orgao:cnpj_orgao!inner(razao_social, uf_sigla)")
    .overlaps("segmentos", segmentos)
    .eq("orgao.uf_sigla", uf)
    .is("valor_homologado", null)
    .order("data_publicacao", { ascending: false })
    .limit(60);
  const editais = (rows ?? []) as unknown as Edital[];

  const { data: oports } = await supabase.from("oportunidade").select("numero_controle_pncp, stage");
  const stageBy: Record<string, string> = {};
  for (const o of oports ?? []) stageBy[o.numero_controle_pncp] = o.stage;

  const visiveis = editais.filter((e) => stageBy[e.numero_controle_pncp] !== "descartado");
  const monitorando = visiveis.filter((e) => stageBy[e.numero_controle_pncp] === "monitorando").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <RadarIcon className="size-4 text-primary" />
          <span className="font-medium">Sinais do seu recorte</span>
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3" /> {uf}</span>
          {segmentos.map((s) => <Badge key={s} variant="secondary">{SEG_LABEL[s] ?? s}</Badge>)}
          <span className="ml-auto text-muted-foreground">{visiveis.length} em andamento{monitorando ? ` · ${monitorando} monitorando` : ""}</span>
        </CardContent>
      </Card>

      {visiveis.length === 0 ? (
        <EmptyState titulo="Nenhum edital em andamento agora" texto={`Não há editais abertos do seu nicho em ${uf} no momento. Eles aparecem aqui assim que forem publicados.`} />
      ) : (
        <div className="space-y-3">
          {visiveis.map((e) => {
            const valor = brl(e.valor_estimado);
            const mon = stageBy[e.numero_controle_pncp] === "monitorando";
            return (
              <Card key={e.numero_controle_pncp} className={mon ? "border-primary/40" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="size-3.5" />
                    <span className="font-medium text-foreground">{e.orgao?.razao_social ?? "Órgão"}</span>
                    {e.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {e.cidade}</span>}
                    {e.modalidade_nome && <Badge variant="outline">{e.modalidade_nome}</Badge>}
                    {e.situacao_nome && <Badge variant="muted">{e.situacao_nome}</Badge>}
                    {mon && <Badge variant="success">Monitorando</Badge>}
                    <span className="ml-auto">{e.data_publicacao ? dataBR(e.data_publicacao.slice(0, 10)) : ""}</span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm">{e.objeto}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-foreground">{valor ?? "Valor não informado"}</span>
                    {e.link_origem && (
                      <a href={e.link_origem} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="size-3" /> Origem
                      </a>
                    )}
                    <span className="text-muted-foreground">{e.numero_controle_pncp}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {mon ? (
                      <form action={reverter}>
                        <input type="hidden" name="numero" value={e.numero_controle_pncp} />
                        <Button type="submit" size="sm" variant="outline"><Undo2 className="size-4" /> Deixar de monitorar</Button>
                      </form>
                    ) : (
                      <form action={monitorar}>
                        <input type="hidden" name="numero" value={e.numero_controle_pncp} />
                        <Button type="submit" size="sm" variant="outline"><Eye className="size-4" /> Monitorar</Button>
                      </form>
                    )}
                    <form action={descartar}>
                      <input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground"><X className="size-4" /> Descartar</Button>
                    </form>
                    <form action={analisar} className="ml-auto">
                      <input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Button type="submit" size="sm"><Sparkles className="size-4" /> Adicionar à análise</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><RadarIcon className="size-6" /></div>
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
        <Button asChild className="mt-4" variant="outline"><Link href="/empresa">Ir para Minha Empresa <ArrowRight className="size-4" /></Link></Button>
      </Card>
    </div>
  );
}
