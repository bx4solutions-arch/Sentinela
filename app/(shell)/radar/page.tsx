import Link from "next/link";
import { Radar as RadarIcon, MapPin, Building2, ExternalLink, Eye, X, Undo2, ArrowRight, Sparkles, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button } from "@/components/ui";
import { SEG_LABEL } from "@/lib/segmentos";
import { municipiosDaUf } from "@/lib/ibge";
import { dataBR } from "@/lib/utils";
import { monitorar, descartar, reverter, analisar, monitorarCidade, removerCidade } from "./actions";
import { CityPicker } from "./city-picker";

const brl = (n: number | null) =>
  !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

type Edital = {
  numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null;
  situacao_nome: string | null; modalidade_nome: string | null; data_publicacao: string | null;
  link_origem: string | null; cidade: string | null; orgao: { razao_social: string | null } | null;
};

export default async function RadarPage() {
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("segmentos, municipio, uf").maybeSingle();
  const segmentos: string[] = (company?.segmentos ?? []).filter((s: string) => s !== "generico");
  const uf: string | null = company?.uf ?? null;

  if (segmentos.length === 0 || !uf) {
    return <EmptyState titulo="Defina um nicho para o Radar" texto="Seu CNAE foi classificado como genérico (ou faltou UF). Ajuste em Minha Empresa." />;
  }

  // Células do tenant + status de coleta
  const { data: celulas } = await supabase.from("celula").select("codigo_ibge, municipio");
  const codigos = (celulas ?? []).map((c) => c.codigo_ibge);
  let coletas: { codigo_ibge: string; status: string }[] = [];
  if (codigos.length) {
    const { data } = await supabase.from("cidade_coletada").select("codigo_ibge, status").in("codigo_ibge", codigos);
    coletas = data ?? [];
  }
  const statusBy: Record<string, string> = Object.fromEntries(coletas.map((c) => [c.codigo_ibge, c.status]));
  const cidadesMonitoradas = (celulas ?? []).map((c) => ({ ...c, status: statusBy[c.codigo_ibge] ?? "pendente" }));
  const prontas = cidadesMonitoradas.filter((c) => c.status === "pronta").map((c) => c.municipio);
  const coletando = cidadesMonitoradas.filter((c) => c.status !== "pronta").map((c) => c.municipio);

  const cidadeEmpresaMonitorada = cidadesMonitoradas.some((c) => (c.municipio ?? "").toLowerCase() === (company?.municipio ?? "").toLowerCase());

  // Escopo: cidades prontas (preciso) OU fallback por UF (honesto, enquanto coleta)
  const usandoFallbackUf = prontas.length === 0;
  let q = supabase.from("raw_editais")
    .select("numero_controle_pncp, objeto, valor_estimado, situacao_nome, modalidade_nome, data_publicacao, link_origem, cidade, orgao:cnpj_orgao!inner(razao_social, uf_sigla)")
    .overlaps("segmentos", segmentos).is("valor_homologado", null);
  q = usandoFallbackUf ? q.eq("orgao.uf_sigla", uf) : q.in("cidade", prontas);
  const { data: rows } = await q.order("data_publicacao", { ascending: false }).limit(60);
  const editais = (rows ?? []) as unknown as Edital[];

  const { data: oports } = await supabase.from("oportunidade").select("numero_controle_pncp, stage");
  const stageBy: Record<string, string> = {};
  for (const o of oports ?? []) stageBy[o.numero_controle_pncp] = o.stage;
  const visiveis = editais.filter((e) => stageBy[e.numero_controle_pncp] !== "descartado");

  const municipios = await municipiosDaUf(uf);

  return (
    <div className="space-y-4">
      {/* Escopo de cidades */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <RadarIcon className="size-4 text-primary" />
            <span className="font-medium">Sinais do seu recorte</span>
            {segmentos.map((s) => <Badge key={s} variant="secondary">{SEG_LABEL[s] ?? s}</Badge>)}
            <span className="ml-auto text-muted-foreground">{visiveis.length} em andamento</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Cidades:</span>
            {cidadesMonitoradas.length === 0 && <span className="text-xs text-muted-foreground">nenhuma — mostrando o estado {uf}</span>}
            {cidadesMonitoradas.map((c) => (
              <span key={c.codigo_ibge} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                <MapPin className="size-3" /> {c.municipio}
                {c.status === "pronta"
                  ? <Badge variant="success">pronta</Badge>
                  : <Badge variant="warning"><Loader2 className="mr-1 size-3 animate-spin" />coletando</Badge>}
                <form action={removerCidade}><input type="hidden" name="codigo_ibge" value={c.codigo_ibge} />
                  <button type="submit" aria-label="Remover cidade" className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
                </form>
              </span>
            ))}
            {!cidadeEmpresaMonitorada && company?.municipio && (
              <form action={monitorarCidade}>
                <input type="hidden" name="municipio" value={company.municipio} />
                <input type="hidden" name="uf" value={uf} />
                <Button type="submit" size="sm" variant="outline"><Plus className="size-4" /> Monitorar {company.municipio}</Button>
              </form>
            )}
            <CityPicker uf={uf} municipios={municipios} />
          </div>
          {coletando.length > 0 && (
            <p className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
              <Loader2 className="size-3 animate-spin" /> Carregando histórico de {coletando.join(", ")}… os editais aparecem aqui assim que a coleta terminar.
            </p>
          )}
          {usandoFallbackUf && (
            <p className="text-xs text-muted-foreground">
              Mostrando o <strong>estado {uf}</strong> enquanto suas cidades são coletadas. Ao concluir, o Radar foca nas suas cidades.
            </p>
          )}
        </CardContent>
      </Card>

      {visiveis.length === 0 ? (
        <EmptyState titulo="Nenhum edital em andamento agora" texto={`Sem editais abertos do seu nicho ${usandoFallbackUf ? `em ${uf}` : "nas suas cidades"} no momento.`} />
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
                    {e.link_origem && <a href={e.link_origem} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Origem</a>}
                    <span className="text-muted-foreground">{e.numero_controle_pncp}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {mon ? (
                      <form action={reverter}><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                        <Button type="submit" size="sm" variant="outline"><Undo2 className="size-4" /> Deixar de monitorar</Button></form>
                    ) : (
                      <form action={monitorar}><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                        <Button type="submit" size="sm" variant="outline"><Eye className="size-4" /> Monitorar</Button></form>
                    )}
                    <form action={descartar}><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground"><X className="size-4" /> Descartar</Button></form>
                    <form action={analisar} className="ml-auto"><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Button type="submit" size="sm"><Sparkles className="size-4" /> Adicionar à análise</Button></form>
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
