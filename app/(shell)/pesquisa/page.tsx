import Link from "next/link";
import { Search, Building2, Trophy, MapPin, Landmark, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, Badge, Button, Input, Select } from "@/components/ui";
import { dataBR } from "@/lib/utils";
import { vidaDoConcorrente, perfilOrgao, buscarItem, faixaItemCidade } from "@/lib/pesquisa";
import { SEMAFORO_LABEL } from "@/lib/preco";

const brl = (n: number | null) => !n ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

type SP = { modo?: string; q?: string; cnpj?: string; uf?: string };

export default async function PesquisaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const modo = sp.modo === "orgao" ? "orgao" : sp.modo === "item" ? "item" : "concorrente";
  const supabase = await createClient();
  const { data: company } = await supabase.from("company").select("uf").maybeSingle();
  const ufDefault = sp.uf || company?.uf || "SP";

  const vida = modo === "concorrente" && sp.cnpj ? await vidaDoConcorrente(supabase, sp.cnpj) : null;
  const orgaos = modo === "orgao" && sp.q ? await perfilOrgao(supabase, sp.q) : null;
  const itens = modo === "item" && sp.q ? await buscarItem(supabase, sp.q, ufDefault) : null;
  const faixaItem = modo === "item" && sp.q ? await faixaItemCidade(supabase, sp.q, ufDefault) : null;

  const tabs: [string, string][] = [["concorrente", "Concorrente (CNPJ)"], ["orgao", "Órgão"], ["item", "Item + cidade"]];

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-lg bg-muted p-1" data-testid="pesquisa-modos">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/pesquisa?modo=${id}`} data-testid={`modo-${id}`}
            className={`rounded-md px-3 py-1 text-sm font-medium ${modo === id ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>{label}</Link>
        ))}
      </div>

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
