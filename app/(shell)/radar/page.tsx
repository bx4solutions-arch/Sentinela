import Link from "next/link";
import { Radar as RadarIcon, MapPin, Building2, ExternalLink, Eye, X, Undo2, ArrowRight, Sparkles, Loader2, Plus, ShieldAlert, AlarmClock, Search, CalendarClock, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button, Select, Input } from "@/components/ui";
import { SEG_LABEL } from "@/lib/segmentos";
import { municipiosDaUf } from "@/lib/ibge";
import { expandirBusca, ufDoTexto, tokensDosSegmentos } from "@/lib/nichos";
import { gastoOrgaosNoNicho } from "@/lib/inteligencia";
import { buscarPCA, buscarRecorrencia, buscarContratosVencendo, diasAteVencer, type PcaItem, type RecorrenciaItem, type ContratoVencendo, type Filtro } from "@/lib/antecipacao";
import { itensAplicaveis, statusItem } from "@/lib/habilitacao";
import { sinaisEdital, SINAL_BADGE } from "@/lib/sinais";
import { dataBR, nowISO, isoDiasAtras } from "@/lib/utils";
import { monitorar, descartar, reverter, analisar, monitorarCidade, removerCidade } from "./actions";
import { CityPicker } from "./city-picker";

const brl = (n: number | null) =>
  !n ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

type Edital = {
  numero_controle_pncp: string; objeto: string | null; valor_estimado: number | null;
  situacao_nome: string | null; modalidade_nome: string | null; data_publicacao: string | null;
  data_encerramento: string | null; cnpj_orgao: string | null;
  link_origem: string | null; cidade: string | null; orgao: { razao_social: string | null } | null;
};

type Escopo = "cidade" | "estado" | "nacional";
const ESCOPO_LABEL: Record<Escopo, string> = { cidade: "Minha cidade", estado: "Meu estado", nacional: "Nacional" };

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ q?: string; uf?: string; pilar?: string; escopo?: string; pag?: string }> }) {
  const sp = await searchParams;
  const busca = (sp.q ?? "").trim();
  const pilar: "dia" | "antecipacao" = sp.pilar === "antecipacao" ? "antecipacao" : "dia";
  // Escopo geográfico DENTRO do segmento (amplia só o alcance). Default = recorte do cadastro (cidade/UF).
  const escopo: Escopo = sp.escopo === "estado" ? "estado" : sp.escopo === "nacional" ? "nacional" : "cidade";
  const pag = Math.max(0, parseInt(sp.pag ?? "0", 10) || 0);
  const PAGE = 60;
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
  const SELECT = "numero_controle_pncp, objeto, valor_estimado, situacao_nome, modalidade_nome, data_publicacao, data_encerramento, cnpj_orgao, link_origem, cidade, orgao:cnpj_orgao(razao_social)";
  // UF da busca: explícita (?uf=), ou inferida do texto ("no Piauí"→PI), ou a UF da empresa.
  const ufBusca = busca ? (sp.uf || ufDoTexto(busca) || uf) : null;

  // ===== TRAVA DE LICITAÇÃO REAL (participável): só prazo de proposta EM ABERTO =====
  // aberto = encerramento no FUTURO; OU encerramento nulo MAS publicado há ≤60d (e não "morto").
  // Nunca mostra edital com prazo vencido/encerrado nas listas de DESCOBERTA.
  const AGORA = nowISO();
  const CORTE_RECENTE = isoDiasAtras(60);
  const MORTAS = '("Revogada","Anulada","Cancelada","Deserta","Fracassada")';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aplicarTrava = (query: any) => query
    .not("situacao_nome", "in", MORTAS)
    .or(`data_encerramento.gte.${AGORA},and(data_encerramento.is.null,data_publicacao.gte.${CORTE_RECENTE})`);
  const baseDescoberta = () => aplicarTrava(supabase.from("raw_editais").select(SELECT).is("valor_homologado", null));

  // Filtro geográfico do escopo (DENTRO do segmento). cidade = recorte do cadastro (cidades prontas, ou UF
  // honesto enquanto coleta); estado = a UF inteira; nacional = sem geo (metadado nacional, Camada 1).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escopoGeo = (qq: any) => {
    if (escopo === "nacional") return qq;
    if (escopo === "estado") return qq.eq("uf_sigla", uf);
    return prontas.length ? qq.in("cidade", prontas) : qq.eq("uf_sigla", uf); // cidade (recorte)
  };
  // Recorte só faz fallback de UF no escopo "cidade" enquanto as cidades coletam.
  const recorteFallbackUf = escopo === "cidade" && prontas.length === 0;

  let editais: Edital[];
  let totalRecorte = 0;
  if (busca) {
    // Busca livre por nicho/objeto (SINÔNIMOS) numa UF — uf_sigla denormalizado (índice) + trigram objeto.
    let q = baseDescoberta().eq("uf_sigla", ufBusca!);
    const termos = expandirBusca(busca);
    if (termos.length) q = q.or(termos.map((t) => `objeto.ilike.*${t}*`).join(","));
    const { data } = await q.order("data_publicacao", { ascending: false }).limit(PAGE);
    editais = (data ?? []) as unknown as Edital[];
    totalRecorte = editais.length;
  } else {
    // Total do recorte (abertas) p/ paginação + honestidade de cobertura.
    const { count } = await escopoGeo(
      aplicarTrava(supabase.from("raw_editais").select("numero_controle_pncp", { count: "exact", head: true }).is("valor_homologado", null).overlaps("segmentos", segmentos)),
    );
    totalRecorte = count ?? 0;
    const baseRecorte = () => escopoGeo(baseDescoberta().overlaps("segmentos", segmentos));
    if (pag === 0) {
      // REUSA a priorização da cidade monitorada: traz a cidade-sede ao topo quando o escopo é mais amplo
      // que ela (estado/nacional). No escopo "cidade" a própria cidade já é o recorte (não precisa injetar).
      const cidadePrioritaria = company?.municipio && escopo !== "cidade" ? company.municipio : null;
      let cidadeRows: Edital[] = [];
      if (cidadePrioritaria) {
        const { data } = await baseDescoberta().overlaps("segmentos", segmentos)
          .eq("cidade", cidadePrioritaria).eq("uf_sigla", uf)
          .order("data_publicacao", { ascending: false }).limit(30);
        cidadeRows = (data ?? []) as unknown as Edital[];
      }
      const { data: restoData } = await baseRecorte().order("data_publicacao", { ascending: false }).limit(PAGE);
      const resto = (restoData ?? []) as unknown as Edital[];
      const jaTem = new Set(cidadeRows.map((e) => e.numero_controle_pncp));
      editais = [...cidadeRows, ...resto.filter((e) => !jaTem.has(e.numero_controle_pncp))].slice(0, PAGE);
    } else {
      const { data } = await baseRecorte().order("data_publicacao", { ascending: false }).range(pag * PAGE, pag * PAGE + PAGE - 1);
      editais = (data ?? []) as unknown as Edital[];
    }
  }

  // Sinal "órgão recorrente": órgãos com histórico homologado no nicho
  const orgaosVisiveis = [...new Set(editais.map((e) => e.cnpj_orgao).filter(Boolean) as string[])];
  const recorrentes = new Set<string>();
  if (orgaosVisiveis.length) {
    const { data: rec } = await supabase.from("raw_editais")
      .select("cnpj_orgao").overlaps("segmentos", segmentos).in("cnpj_orgao", orgaosVisiveis).not("valor_homologado", "is", null).limit(2000);
    for (const r of rec ?? []) if (r.cnpj_orgao) recorrentes.add(r.cnpj_orgao);
  }

  // Sinal "certidão impeditiva": empresa tem obrigatória VENCIDA
  const { data: cdocs } = await supabase.from("documento").select("tipo, vencimento").eq("escopo", "company");
  const docByTipo: Record<string, { vencimento: string }> = {};
  for (const d of cdocs ?? []) if (d.vencimento) docByTipo[d.tipo] = { vencimento: d.vencimento };
  const vencidas = itensAplicaveis(segmentos).filter((it) => statusItem(docByTipo[it.key]) === "vencida");

  const { data: oports } = await supabase.from("oportunidade").select("numero_controle_pncp, stage");
  const stageBy: Record<string, string> = {};
  for (const o of oports ?? []) stageBy[o.numero_controle_pncp] = o.stage;
  const visiveis = editais.filter((e) => stageBy[e.numero_controle_pncp] !== "descartado");
  // Filtros de ouro (v2) — contagens REAIS do recorte (sem forjar).
  const monitorandoN = Object.values(stageBy).filter((s) => s === "monitorando").length;
  const descartadasN = Object.values(stageBy).filter((s) => s === "descartado").length;

  // Gasto de cada órgão visível NO NICHO do recorte (batch, 1 query) — muda conforme o segmento.
  const cnpjsVisiveis = [...new Set(visiveis.map((e) => e.cnpj_orgao).filter(Boolean) as string[])];
  const gastoByOrgao = await gastoOrgaosNoNicho(supabase, cnpjsVisiveis, tokensDosSegmentos(segmentos), 12);

  // Pilar 2 — Antecipação: PCA (planejado) + recorrência (homologados). Só busca se for a aba ativa.
  const filtro: Filtro = { busca, segmentos, uf, prontas, usandoFallbackUf, ufBusca: ufBusca ?? uf };
  let pca: PcaItem[] = [];
  let recorrenciaItens: RecorrenciaItem[] = [];
  let contratosVenc: ContratoVencendo[] = [];
  if (pilar === "antecipacao") {
    [pca, recorrenciaItens, contratosVenc] = await Promise.all([
      buscarPCA(supabase, filtro), buscarRecorrencia(supabase, filtro), buscarContratosVencendo(supabase, filtro),
    ]);
  }
  // Links de aba preservando a busca atual.
  const qsBusca = busca ? `q=${encodeURIComponent(busca)}&uf=${ufBusca ?? uf}&` : "";
  const hrefDia = `/radar?${qsBusca}pilar=dia`;
  const hrefAntec = `/radar?${qsBusca}pilar=antecipacao`;

  const municipios = await municipiosDaUf(uf);

  return (
    <div className="v2 space-y-4">
      {/* Hero v2 */}
      <div className="hero">
        <div>
          <h1>Radar de Oportunidades</h1>
          <p>O Sentinela mostra o que combina com a sua empresa: editais abertos, contratos vencendo, recorrência e baixa concorrência — só do seu recorte ({segmentos.map((s) => SEG_LABEL[s] ?? s).join(", ")}).</p>
        </div>
      </div>

      {/* Importar licitação — uploadZone v2 (estado honesto: backend de importação em ingestão) */}
      <div className="uploadZone" data-testid="radar-upload">
        <div>
          <b>Tem um edital fora do radar?</b>
          <span>A importação de PDF/anexos para criar a Pasta Inteligente automaticamente está <strong>em ingestão</strong>. Por enquanto, monitore ou analise os editais do seu recorte abaixo — eles já abrem o Space completo.</span>
        </div>
        <Badge variant="muted" data-testid="radar-upload-ingestao">Importar — em ingestão</Badge>
      </div>

      {/* Filtros de ouro — contagens REAIS do recorte */}
      <div className="kpis" data-testid="radar-filtros-ouro">
        <div className="kpi"><label>Editais abertos no recorte</label><strong data-testid="filtro-abertas">{totalRecorte}</strong><small>no escopo {ESCOPO_LABEL[escopo]}</small></div>
        <div className="kpi"><label>Monitorando</label><strong data-testid="filtro-monitorando">{monitorandoN}</strong><small>na sua lista de acompanhamento</small></div>
        <div className="kpi"><label>Órgãos recorrentes</label><strong data-testid="filtro-recorrentes">{recorrentes.size}</strong><small>com histórico no seu nicho</small></div>
        <div className="kpi"><label>Descartadas por você</label><strong data-testid="filtro-descartadas">{descartadasN}</strong><small>fora do seu perfil</small></div>
        <div className="kpi"><label>Cidades no recorte</label><strong data-testid="filtro-cidades">{cidadesMonitoradas.length}</strong><small>{coletando.length > 0 ? `${coletando.length} coletando` : "monitoradas"}</small></div>
      </div>

      {/* Busca livre por nicho/objeto + UF (cruza o recorte; sinônimos) */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs text-muted-foreground">Buscar por objeto / nicho</label>
              <Input name="q" defaultValue={busca} data-testid="busca-objeto"
                placeholder="ex.: controle de vetores, dengue, dedetização…" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">UF</label>
              <Select name="uf" defaultValue={ufBusca ?? uf} data-testid="busca-uf" className="w-24">
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
            </div>
            <Button type="submit" size="sm" data-testid="busca-submit"><Search className="size-4" /> Buscar</Button>
            {busca && <Button asChild size="sm" variant="ghost"><Link href="/radar">limpar</Link></Button>}
          </form>
          {busca && (
            <p className="mt-2 text-xs text-muted-foreground">
              Busca livre: <strong>{busca}</strong> em <strong>{ufBusca}</strong> — editais abertos/em andamento (sinônimos do nicho).
            </p>
          )}
        </CardContent>
      </Card>

      {/* 2 pilares: Licitação do Dia (aberto) × Antecipação (pré-edital) */}
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1 text-sm" data-testid="radar-pilares">
        <Link href={hrefDia} data-testid="pilar-dia"
          className={`rounded-md px-3 py-1 font-medium ${pilar === "dia" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
          Licitação do Dia
        </Link>
        <Link href={hrefAntec} data-testid="pilar-antecipacao"
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium ${pilar === "antecipacao" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
          <CalendarClock className="size-3.5" /> Antecipação
        </Link>
      </div>

      {/* Escopo geográfico DENTRO do segmento — amplia só o alcance (default = recorte cidade/UF do cadastro). */}
      {pilar === "dia" && !busca && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Escopo (no seu segmento):</span>
          <div className="inline-flex gap-1 rounded-lg bg-muted p-1 text-sm" data-testid="radar-escopo">
            {(["cidade", "estado", "nacional"] as Escopo[]).map((e) => (
              <Link key={e} href={`/radar?pilar=dia&escopo=${e}`} data-testid={`escopo-${e}`}
                className={`rounded-md px-3 py-1 font-medium ${escopo === e ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
                {ESCOPO_LABEL[e]}
              </Link>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {escopo === "cidade" ? (recorteFallbackUf ? `coletando — mostrando ${uf}` : "suas cidades") : escopo === "estado" ? `estado ${uf}` : "Brasil (mesmo segmento)"}
          </span>
        </div>
      )}

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
                  ? <Badge variant="secondary">pronta</Badge>
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
            <CityPicker uf={uf} municipios={municipios} monitoradas={codigos} />
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

      {vencidas.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <ShieldAlert className="size-4 text-destructive" />
            <span className="font-medium">Certidão impeditiva:</span>
            <span className="text-muted-foreground">você tem documento(s) obrigatório(s) <strong className="text-destructive">vencido(s)</strong> — pode te impedir de habilitar:</span>
            {vencidas.map((v) => <Badge key={v.key} variant="destructive">{v.label}</Badge>)}
            <Link href="/empresa" className="ml-auto text-xs font-medium text-primary hover:underline">Renovar →</Link>
          </CardContent>
        </Card>
      )}

      {pilar === "dia" ? (
        <div className="space-y-3">
          {!busca && (
            <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="recorte-contagem">
              <span className="font-medium">{totalRecorte} {totalRecorte === 1 ? "oportunidade aberta" : "oportunidades abertas"}</span>
              <span className="text-muted-foreground">no escopo <strong>{ESCOPO_LABEL[escopo]}</strong> · segmento {segmentos.map((s) => SEG_LABEL[s] ?? s).join(", ")}</span>
              {escopo === "nacional" && totalRecorte < 20 && <Badge variant="muted">cobertura nacional em ingestão</Badge>}
            </div>
          )}
          {visiveis.length === 0 ? (
            <EmptyState titulo="Nenhum edital em andamento agora" texto={busca
              ? `Nenhum edital aberto para “${busca}” em ${ufBusca} agora — pode ser vazio verdadeiro (nem toda semana há licitação aberta desse nicho nesta UF).`
              : `Sem editais abertos do seu segmento no escopo ${ESCOPO_LABEL[escopo]} agora — pode ser vazio verdadeiro. Tente ampliar o escopo (Meu estado / Nacional).`} />
          ) : (
            <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1" data-testid="recorte-lista">
          {visiveis.map((e) => {
            const valor = brl(e.valor_estimado);
            const mon = stageBy[e.numero_controle_pncp] === "monitorando";
            const sinais = sinaisEdital(e, recorrentes);
            return (
              <Card key={e.numero_controle_pncp} data-testid="edital-card" className={mon ? "border-primary/40" : ""}>
                <CardContent className="p-4">
                  {sinais.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {sinais.map((s) => (
                        <Badge key={s.tipo} variant={SINAL_BADGE[s.tone]} className="gap-1">
                          {s.tipo === "prazo" && <AlarmClock className="size-3" />}{s.label}
                        </Badge>
                      ))}
                    </div>
                  )}
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
                  {e.cnpj_orgao && gastoByOrgao[e.cnpj_orgao]?.total > 0 && (
                    <p className="mt-1.5 text-xs text-primary" data-testid="card-gasto-nicho">
                      Este órgão gastou <strong>{brl(gastoByOrgao[e.cnpj_orgao].total)}</strong> no seu nicho em 12m · {gastoByOrgao[e.cnpj_orgao].n} contrato(s)
                    </p>
                  )}
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
                        <Button type="submit" size="sm" variant="outline" data-testid="card-monitorar"><Eye className="size-4" /> Monitorar</Button></form>
                    )}
                    <form action={descartar} className="flex items-center gap-1"><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Select name="motivo" defaultValue="" className="h-8 w-36 text-xs" aria-label="Motivo do descarte">
                        <option value="">Descartar por…</option>
                        <option value="fora_escopo">Fora do escopo</option>
                        <option value="ja_participei">Já participei</option>
                        <option value="prazo_passou">Prazo passou</option>
                        <option value="sem_interesse">Sem interesse</option>
                      </Select>
                      <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground" data-testid="card-descartar"><X className="size-4" /></Button></form>
                    <form action={analisar} className="ml-auto"><input type="hidden" name="numero" value={e.numero_controle_pncp} />
                      <Button type="submit" size="sm" data-testid="card-analisar"><Sparkles className="size-4" /> Adicionar à análise</Button></form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          )}
          {!busca && (totalRecorte > PAGE || pag > 0) && (
            <div className="flex items-center justify-between gap-2" data-testid="recorte-paginacao">
              {pag > 0
                ? <Button asChild size="sm" variant="outline"><Link href={`/radar?pilar=dia&escopo=${escopo}&pag=${pag - 1}`}>← Anterior</Link></Button>
                : <Button size="sm" variant="outline" disabled>← Anterior</Button>}
              <span className="text-xs text-muted-foreground">página {pag + 1} · mostrando {visiveis.length} de {totalRecorte}</span>
              {(pag + 1) * PAGE < totalRecorte
                ? <Button asChild size="sm" variant="outline"><Link href={`/radar?pilar=dia&escopo=${escopo}&pag=${pag + 1}`}>Próxima →</Link></Button>
                : <Button size="sm" variant="outline" disabled>Próxima →</Button>}
            </div>
          )}
        </div>
      ) : (
        <AntecipacaoLista pca={pca} rec={recorrenciaItens} contratos={contratosVenc} busca={busca} uf={ufBusca ?? uf} usandoFallbackUf={usandoFallbackUf} />
      )}
    </div>
  );
}

function AntecipacaoLista({ pca, rec, contratos, busca, uf, usandoFallbackUf }:
  { pca: PcaItem[]; rec: RecorrenciaItem[]; contratos: ContratoVencendo[]; busca: string; uf: string; usandoFallbackUf: boolean }) {
  const vazio = pca.length === 0 && rec.length === 0 && contratos.length === 0;
  return (
    <div className="space-y-3">
      <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Antecipação:</strong> o que está se <strong>formando</strong> antes do edital —
        <strong>contrato vencendo</strong>, itens <strong>planejados</strong> (PCA) e órgãos <strong>recorrentes</strong>.
        É <strong>probabilidade, não promessa</strong>: “planejado / pode virar edital”, nunca “vai ter com certeza”.
      </p>
      {vazio ? (
        <EmptyState titulo="Sem sinais de antecipação agora" texto={busca
          ? `Nenhum contrato vencendo, PCA ou recorrência para “${busca}” em ${uf} — pode ser vazio verdadeiro (o sinal acende quando o dado entrar).`
          : `Sem sinais de antecipação do seu nicho ${usandoFallbackUf ? `em ${uf}` : "nas suas cidades"} no momento.`} />
      ) : (
        <>
          {contratos.map((c) => {
            const dias = diasAteVencer(c.data_vigencia_fim);
            return (
              <Card key={c.numero_controle_pncp} data-testid="antecipacao-card">
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="destructive" className="gap-1"><AlarmClock className="size-3" /> {dias != null ? `contrato vence em ${dias}d` : "contrato vencendo"}</Badge>
                    <Badge variant="muted">janela de renovação / nova disputa</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="size-3.5" />
                    <span className="font-medium text-foreground">{c.orgao?.razao_social ?? "Órgão"}</span>
                    {c.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {c.cidade}</span>}
                    {c.data_vigencia_fim && <span className="ml-auto">vigência até {dataBR(c.data_vigencia_fim)}</span>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{c.objeto}</p>
                  <div className="mt-2 text-xs">
                    <span className="font-semibold text-foreground">{brl(c.valor_global) ?? "—"}</span>
                    <span className="text-muted-foreground"> · fornecedor atual: {c.nome_fornecedor ?? "—"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {pca.map((p) => (
            <Card key={p.id} data-testid="antecipacao-card">
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1"><CalendarClock className="size-3" /> PCA {p.ano_pca ?? ""}</Badge>
                  <Badge variant="muted">planejado — pode virar edital</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" />
                  <span className="font-medium text-foreground">{p.orgao?.razao_social ?? "Órgão"}</span>
                  {p.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {p.cidade}</span>}
                  {p.data_desejada && <span className="ml-auto">desejada: {dataBR(p.data_desejada.slice(0, 10))}</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{p.descricao_item ?? "Item planejado"}</p>
                <div className="mt-2 text-xs font-semibold text-foreground">{brl(p.valor_total) ?? "Valor planejado não informado"}</div>
              </CardContent>
            </Card>
          ))}
          {rec.map((r) => {
            // Antecipação = janela FUTURA prevista (não a data velha como se fosse a oportunidade).
            // Heurística: último contrato + ~12 meses → próxima janela estimada.
            const proximaJanela = r.data_publicacao
              ? (() => { const d = new Date(r.data_publicacao!.slice(0, 10) + "T00:00:00"); d.setMonth(d.getMonth() + 12); return d.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" }); })()
              : null;
            return (
            <Card key={r.numero_controle_pncp} data-testid="antecipacao-card">
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {proximaJanela && <Badge variant="secondary" className="gap-1"><CalendarClock className="size-3" /> próxima janela ~{proximaJanela}</Badge>}
                  <Badge variant="warning" className="gap-1"><Repeat className="size-3" /> recorrência</Badge>
                  <Badge variant="muted">tende a repetir o ciclo</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="size-3.5" />
                  <span className="font-medium text-foreground">{r.orgao?.razao_social ?? "Órgão"}</span>
                  {r.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {r.cidade}</span>}
                  {r.data_publicacao && <span className="ml-auto">último em {dataBR(r.data_publicacao.slice(0, 10))}</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{r.objeto}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-foreground">{brl(r.valor_homologado) ?? "—"} <span className="font-normal text-muted-foreground">contratado antes</span></span>
                  {r.link_origem && <a href={r.link_origem} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3" /> Origem</a>}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </>
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
