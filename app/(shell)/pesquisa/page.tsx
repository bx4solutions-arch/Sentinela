import Link from "next/link";
import { Search, Building2, Trophy, MapPin, Landmark, ExternalLink, SlidersHorizontal, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button, Input, Select } from "@/components/ui";
import { dataBR } from "@/lib/utils";
import { vidaDoConcorrente, perfilOrgao, buscarItem, faixaItemCidade, pesquisaCompleta, MODALIDADES, SITUACOES, type FiltrosCompleta } from "@/lib/pesquisa";
import { SEMAFORO_LABEL } from "@/lib/preco";
import { SEG_LABEL } from "@/lib/segmentos";
import { analisar } from "../radar/actions";

const brl = (n: number | null) => !n ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const SEG_KEYS = Object.keys(SEG_LABEL).filter((k) => k !== "generico");
const arr = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
const numOrNull = (v?: string) => { const n = Number((v ?? "").replace(/\D/g, "")); return v && !Number.isNaN(n) && n > 0 ? n : null; };

type SP = {
  modo?: string; q?: string; cnpj?: string; uf?: string;
  objeto?: string; exata?: string; ufs?: string | string[]; cidade?: string; mod?: string | string[];
  situacao?: string; numero?: string; orgao?: string; seg?: string | string[];
  vmin?: string; vmax?: string; pubDe?: string; pubAte?: string; encDe?: string; encAte?: string;
  abertas?: string; enviado?: string; pag?: string;
};

export default async function PesquisaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const modo = sp.modo === "orgao" ? "orgao" : sp.modo === "item" ? "item" : sp.modo === "concorrente" ? "concorrente" : "completa";
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("uf").maybeSingle();
  const ufDefault = sp.uf || company?.uf || "SP";

  const vida = modo === "concorrente" && sp.cnpj ? await vidaDoConcorrente(supabase, sp.cnpj) : null;
  const orgaos = modo === "orgao" && sp.q ? await perfilOrgao(supabase, sp.q) : null;
  const itens = modo === "item" && sp.q ? await buscarItem(supabase, sp.q, ufDefault) : null;
  const faixaItem = modo === "item" && sp.q ? await faixaItemCidade(supabase, sp.q, ufDefault) : null;

  // Pesquisa COMPLETA — multi-campo
  const enviado = sp.enviado === "1";
  const soAbertas = enviado ? sp.abertas === "1" : true; // default: só abertas
  const pag = Math.max(0, parseInt(sp.pag ?? "0", 10) || 0);
  const filtros: FiltrosCompleta = {
    objeto: sp.objeto?.trim() || undefined, exata: sp.exata === "1",
    ufs: arr(sp.ufs), cidade: sp.cidade?.trim() || undefined, modalidades: arr(sp.mod),
    situacao: sp.situacao || undefined, numero: sp.numero?.trim() || undefined,
    orgao: sp.orgao?.trim() || undefined, segmentos: arr(sp.seg),
    valorMin: numOrNull(sp.vmin), valorMax: numOrNull(sp.vmax),
    pubDe: sp.pubDe || undefined, pubAte: sp.pubAte || undefined, encDe: sp.encDe || undefined, encAte: sp.encAte || undefined,
    soAbertas, pagina: pag, tamanho: 25,
  };
  const completa = modo === "completa" && enviado ? await pesquisaCompleta(supabase, filtros) : null;
  const COMP = filtros.tamanho ?? 25;
  // querystring preservando os filtros (para a paginação)
  const buildCompletaQS = (overridePag: number) => {
    const p = new URLSearchParams();
    p.set("modo", "completa"); p.set("enviado", "1");
    const put = (k: string, v?: string | string[]) => arr(v).forEach((x) => p.append(k, x));
    put("objeto", sp.objeto); if (sp.exata === "1") p.set("exata", "1");
    put("ufs", sp.ufs); put("cidade", sp.cidade); put("mod", sp.mod); put("situacao", sp.situacao);
    put("numero", sp.numero); put("orgao", sp.orgao); put("seg", sp.seg);
    put("vmin", sp.vmin); put("vmax", sp.vmax); put("pubDe", sp.pubDe); put("pubAte", sp.pubAte); put("encDe", sp.encDe); put("encAte", sp.encAte);
    if (soAbertas) p.set("abertas", "1");
    p.set("pag", String(overridePag));
    return `/pesquisa?${p.toString()}`;
  };

  const tabs: [string, string][] = [["completa", "Pesquisa completa"], ["item", "Item + cidade"], ["orgao", "Órgão"], ["concorrente", "Concorrente (CNPJ)"]];

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1" data-testid="pesquisa-modos">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/pesquisa?modo=${id}`} data-testid={`modo-${id}`}
            className={`rounded-md px-3 py-1 text-sm font-medium ${modo === id ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>{label}</Link>
        ))}
      </div>

      {/* Pesquisa COMPLETA — multi-campo (qualquer segmento, todos os filtros do nosso dado) */}
      {modo === "completa" && (
        <>
          <Card><CardContent className="p-4">
            <form method="get" className="space-y-3" data-testid="form-completa">
              <input type="hidden" name="modo" value="completa" />
              <input type="hidden" name="enviado" value="1" />
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <p className="text-sm font-semibold">Pesquisa completa</p>
                <span className="text-xs text-muted-foreground">qualquer segmento · todos os campos que o nosso dado (PNCP) expõe</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Objeto</label>
                  <Input name="objeto" defaultValue={sp.objeto ?? ""} data-testid="f-objeto" placeholder="ex.: controle de vetores, medicamento, merenda…" />
                  <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" name="exata" value="1" defaultChecked={sp.exata === "1"} className="size-3.5" data-testid="f-exata" /> Busca exata (sem sinônimos)</label>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Nº controle PNCP</label>
                  <Input name="numero" defaultValue={sp.numero ?? ""} data-testid="f-numero" placeholder="ex.: 000394/2026" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">UF (Ctrl/Cmd p/ várias)</label>
                  <select multiple name="ufs" defaultValue={arr(sp.ufs)} data-testid="f-uf" className="h-24 w-full rounded-md border bg-background px-2 py-1 text-sm">{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Cidade</label>
                  <Input name="cidade" defaultValue={sp.cidade ?? ""} data-testid="f-cidade" placeholder="ex.: Santos" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Modalidade (multi)</label>
                  <select multiple name="mod" defaultValue={arr(sp.mod)} data-testid="f-modalidade" className="h-24 w-full rounded-md border bg-background px-2 py-1 text-sm">{MODALIDADES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Situação</label>
                  <Select name="situacao" defaultValue={sp.situacao ?? ""} data-testid="f-situacao"><option value="">(todas)</option>{SITUACOES.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Órgão (nome ou CNPJ)</label>
                  <Input name="orgao" defaultValue={sp.orgao ?? ""} data-testid="f-orgao" placeholder="ex.: Prefeitura de Teresina, ou CNPJ" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Valor mín (R$)</label>
                  <Input name="vmin" defaultValue={sp.vmin ?? ""} data-testid="f-vmin" placeholder="0" inputMode="numeric" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Valor máx (R$)</label>
                  <Input name="vmax" defaultValue={sp.vmax ?? ""} data-testid="f-vmax" placeholder="sem teto" inputMode="numeric" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Segmento / CNAE (multi)</label>
                <select multiple name="seg" defaultValue={arr(sp.seg)} data-testid="f-segmento" className="h-20 w-full rounded-md border bg-background px-2 py-1 text-sm">{SEG_KEYS.map((k) => <option key={k} value={k}>{SEG_LABEL[k]}</option>)}</select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label className="mb-1 block text-xs text-muted-foreground">Publicação de</label><Input type="date" name="pubDe" defaultValue={sp.pubDe ?? ""} data-testid="f-pubde" /></div>
                <div><label className="mb-1 block text-xs text-muted-foreground">Publicação até</label><Input type="date" name="pubAte" defaultValue={sp.pubAte ?? ""} /></div>
                <div><label className="mb-1 block text-xs text-muted-foreground">Encerramento de</label><Input type="date" name="encDe" defaultValue={sp.encDe ?? ""} /></div>
                <div><label className="mb-1 block text-xs text-muted-foreground">Encerramento até</label><Input type="date" name="encAte" defaultValue={sp.encAte ?? ""} /></div>
              </div>

              {/* Campos sem dado HOJE — desabilitados com "em breve" (nunca botão que não faz nada) */}
              <div className="grid gap-3 rounded-md border border-dashed p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="text-xs text-muted-foreground lg:col-span-4">Entram com a próxima coleta:</div>
                {["Nº do processo", "Itens do edital", "Raio de atuação", "Concorrência nacional/internacional"].map((c) => (
                  <div key={c}>
                    <label className="mb-1 block text-xs text-muted-foreground">{c}</label>
                    <div className="flex items-center gap-2"><Input disabled placeholder="—" className="opacity-60" /><Badge variant="muted">em breve</Badge></div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" data-testid="completa-buscar"><Search className="size-4" /> Buscar</Button>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" name="abertas" value="1" defaultChecked={soAbertas} className="size-3.5" data-testid="f-abertas" /> Somente abertas (prazo vigente)</label>
                <Button asChild variant="ghost" size="sm"><Link href="/pesquisa?modo=completa">limpar</Link></Button>
              </div>
            </form>
          </CardContent></Card>

          {completa && (completa.total === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground" data-testid="completa-vazio">Nenhum edital para esses filtros — vazio verdadeiro. Ajuste os campos ou desligue “Somente abertas”.</p>
          ) : (
            <div className="space-y-3" data-testid="completa-resultado">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{completa.total} resultado(s)</span>
                <span className="text-muted-foreground">{soAbertas ? "abertas (prazo vigente)" : "incluindo encerradas"}</span>
                {soAbertas && completa.total < 5 && <Badge variant="muted">cobertura em ingestão</Badge>}
              </div>
              {completa.rows.map((e, i) => (
                <Card key={e.numero} data-testid="completa-card"><CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">#{pag * COMP + i + 1}</span>
                    <Building2 className="size-3.5" /><span className="font-medium text-foreground">{e.orgao ?? "Órgão"}</span>
                    {e.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {e.cidade}{e.uf ? `/${e.uf}` : ""}</span>}
                    {e.modalidade && <Badge variant="outline">{e.modalidade}</Badge>}
                    {e.situacao && <Badge variant="muted">{e.situacao}</Badge>}
                    <span className="ml-auto">{e.dataPub ? dataBR(e.dataPub.slice(0, 10)) : ""}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{e.objeto}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-foreground">{brl(e.valor)}</span>
                    {e.dataEnc && <span className="text-muted-foreground">encerra {dataBR(e.dataEnc.slice(0, 10))}</span>}
                    <span className="text-muted-foreground">{e.numero}</span>
                    <form action={analisar} className="ml-auto"><input type="hidden" name="numero" value={e.numero} /><Button type="submit" size="sm" data-testid="completa-analisar"><Sparkles className="size-4" /> Abrir Space</Button></form>
                  </div>
                </CardContent></Card>
              ))}
              {(completa.total > COMP || pag > 0) && (
                <div className="flex items-center justify-between gap-2" data-testid="completa-paginacao">
                  {pag > 0 ? <Button asChild size="sm" variant="outline"><Link href={buildCompletaQS(pag - 1)}>← Anterior</Link></Button> : <Button size="sm" variant="outline" disabled>← Anterior</Button>}
                  <span className="text-xs text-muted-foreground">página {pag + 1} · mostrando {completa.rows.length} de {completa.total}</span>
                  {(pag + 1) * COMP < completa.total ? <Button asChild size="sm" variant="outline"><Link href={buildCompletaQS(pag + 1)}>Próxima →</Link></Button> : <Button size="sm" variant="outline" disabled>Próxima →</Button>}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* C3 — Vida do concorrente */}
      {modo === "concorrente" && (
        <>
          <Card><CardContent className="p-4">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="modo" value="concorrente" />
              <div className="flex-1 min-w-[220px]">
                <label className="mb-1 block text-xs text-muted-foreground">CNPJ do concorrente</label>
                <Input name="cnpj" defaultValue={sp.cnpj ?? ""} data-testid="input-cnpj" placeholder="só números, ex.: 00000000000191" />
              </div>
              <Button type="submit" data-testid="buscar"><Search className="size-4" /> Ver vida do concorrente</Button>
            </form>
          </CardContent></Card>
          {vida && (vida.nContratos === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum contrato desse CNPJ na base atual — vazio verdadeiro (a coleta de contratos avança em background).</p>
          ) : (
            <div className="space-y-3" data-testid="vida-concorrente">
              <Card><CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Trophy className="size-4 text-primary" />
                  <span className="text-sm font-semibold">{vida.nome ?? sp.cnpj}</span>
                  <Badge variant="secondary">{vida.nContratos} contratos ganhos</Badge>
                  <Badge variant="muted">{brl(vida.totalValor)} em contratos</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">atua em {vida.ufs.join(", ") || "—"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Vitórias e preços de <strong>contratos firmados</strong> (dado público PNCP). Sanções CEIS/CNEP e nº de participantes entram com a coleta dessas fontes (em ingestão).</p>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="mb-2 text-sm font-semibold">Órgãos onde atua</p>
                <ul className="divide-y rounded-md border" data-testid="orgaos-atua">
                  {vida.orgaos.map((o) => (<li key={o.cnpj} className="flex items-center gap-2 p-2.5 text-sm"><Building2 className="size-3.5 text-muted-foreground" /><span className="flex-1">{o.nome ?? o.cnpj}</span><Badge variant="secondary">{o.n}×</Badge></li>))}
                </ul>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <p className="mb-2 text-sm font-semibold">Contratos ganhos (recentes)</p>
                <ul className="divide-y rounded-md border">
                  {vida.vitorias.map((v) => (
                    <li key={v.numero} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                      {v.uf && <Badge variant="outline">{v.uf}</Badge>}
                      <span className="min-w-0 flex-1 truncate">{v.objeto}</span>
                      <span className="text-xs text-muted-foreground">{v.orgao}</span>
                      <span className="font-semibold">{brl(v.valor)}</span>
                      <span className="text-xs text-muted-foreground">{v.data ? dataBR(v.data.slice(0, 10)) : ""}</span>
                    </li>))}
                </ul>
              </CardContent></Card>
            </div>
          ))}
        </>
      )}

      {/* C1 — Perfil do órgão */}
      {modo === "orgao" && (
        <>
          <Card><CardContent className="p-4">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="modo" value="orgao" />
              <div className="flex-1 min-w-[220px]">
                <label className="mb-1 block text-xs text-muted-foreground">Órgão (nome ou CNPJ)</label>
                <Input name="q" defaultValue={sp.q ?? ""} data-testid="input-orgao" placeholder="ex.: Prefeitura de Teresina, ou CNPJ" />
              </div>
              <Button type="submit" data-testid="buscar"><Search className="size-4" /> Buscar órgão</Button>
            </form>
          </CardContent></Card>
          {orgaos && (orgaos.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum órgão encontrado para “{sp.q}”.</p>
          ) : (
            <div className="space-y-3" data-testid="perfil-orgao">
              {orgaos.map((o) => (
                <Card key={o.cnpj}><CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Landmark className="size-4 text-primary" /><span className="text-sm font-semibold">{o.nome ?? o.cnpj}</span>
                    {o.uf && <Badge variant="outline">{o.cidade ? `${o.cidade}/${o.uf}` : o.uf}</Badge>}
                    <Badge variant="secondary">{o.nEditais} editais</Badge>
                    <Badge variant="muted">{o.nContratos} contratos</Badge>
                  </div>
                  {o.editais.length > 0 && (
                    <ul className="mt-3 divide-y rounded-md border">
                      {o.editais.map((e) => (
                        <li key={e.numero} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                          <span className="min-w-0 flex-1 truncate">{e.objeto}</span>
                          {e.situacao && <Badge variant="muted">{e.situacao}</Badge>}
                          <span className="font-semibold">{brl(e.valor)}</span>
                          <span className="text-xs text-muted-foreground">{e.data ? dataBR(e.data.slice(0, 10)) : ""}</span>
                        </li>))}
                    </ul>
                  )}
                </CardContent></Card>
              ))}
            </div>
          ))}
        </>
      )}

      {/* C2 — Item + cidade */}
      {modo === "item" && (
        <>
          <Card><CardContent className="p-4">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="modo" value="item" />
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs text-muted-foreground">Item / objeto</label>
                <Input name="q" defaultValue={sp.q ?? ""} data-testid="input-item" placeholder="ex.: medicamento, controle de vetores" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">UF</label>
                <Select name="uf" defaultValue={ufDefault} data-testid="item-uf" className="w-24">{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</Select>
              </div>
              <Button type="submit" data-testid="buscar"><Search className="size-4" /> Buscar</Button>
            </form>
          </CardContent></Card>
          {faixaItem && (
            <Card data-testid="faixa-item"><CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Motor de preço — {sp.q} em {ufDefault}</p>
                <Badge variant={faixaItem.semaforo === "verde" ? "success" : faixaItem.semaforo === "amarelo" ? "warning" : "destructive"}>CV {(faixaItem.cv * 100).toFixed(0)}% · {SEMAFORO_LABEL[faixaItem.semaforo]}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{faixaItem.n} contratos</span>
              </div>
              {faixaItem.confiavel ? (
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-md border p-2"><p className="text-[11px] uppercase text-muted-foreground">Vencedora</p><p className="font-semibold">{brl(faixaItem.vencedora)}</p></div>
                  <div className="rounded-md border p-2"><p className="text-[11px] uppercase text-muted-foreground">Segura</p><p className="font-semibold">{brl(faixaItem.segura)}</p></div>
                  <div className="rounded-md border p-2"><p className="text-[11px] uppercase text-muted-foreground">Agressiva</p><p className="font-semibold">{brl(faixaItem.agressiva)}</p></div>
                </div>
              ) : <p className="mt-2 rounded border border-warning/40 bg-warning/10 px-2 py-1 text-xs">⚠️ {faixaItem.motivoRecusa}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Piso de inexequibilidade (ref.): {brl(faixaItem.pisoInexequivel)} (Lei 14.133, art. 59). Referência de contratos firmados — a empresa decide o preço.</p>
            </CardContent></Card>
          )}
          {itens && (itens.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum edital aberto para “{sp.q}” em {ufDefault} — vazio verdadeiro.</p>
          ) : (
            <div className="space-y-3" data-testid="item-achados">
              {itens.map((e) => (
                <Card key={e.numero}><CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="size-3.5" /><span className="font-medium text-foreground">{e.orgao ?? "Órgão"}</span>
                    {e.cidade && <span className="flex items-center gap-1"><MapPin className="size-3" /> {e.cidade}</span>}
                    {e.situacao && <Badge variant="muted">{e.situacao}</Badge>}
                    <span className="ml-auto">{e.data ? dataBR(e.data.slice(0, 10)) : ""}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm">{e.objeto}</p>
                  <p className="mt-1 text-xs font-semibold">{brl(e.valor)}</p>
                </CardContent></Card>
              ))}
            </div>
          ))}
        </>
      )}

      <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground"><ExternalLink className="size-3" /> Dados públicos do PNCP. Vitórias/preços = contratos firmados; sanções e participações entram com a coleta dessas fontes.</p>
    </div>
  );
}
