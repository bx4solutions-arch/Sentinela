"use client";

import { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Radar,
  Bell,
  ExternalLink,
  MapPin,
  CalendarClock,
  Building2,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { FonteInstavel } from "@/components/fonte-instavel";
import { geoMercator, geoPath } from "d3-geo";

type Esfera = "Federal" | "Estadual" | "Municipal";
type StatusPCA = "Planejado" | "Com verba" | "Virou edital" | "Em execução";
const fases: StatusPCA[] = ["Planejado", "Com verba", "Virou edital", "Em execução"];

type ItemPCA = {
  objeto: string;
  categoria: string;
  tipo: "Material" | "Serviço";
  esfera: Esfera;
  valorTotal: number;
  qtd: string;
  dataDesejada: string;
  orgao: string;
  cidade: string;
  uf: string;
  status: StatusPCA;
  movimentacao: string;
  novo?: boolean;
  janela: string;
  score: number;
};

const itens: ItemPCA[] = [
  { objeto: "Fornecimento de medicamentos da farmácia hospitalar", categoria: "Saúde", tipo: "Material", esfera: "Municipal", valorTotal: 3200000, qtd: "120 itens", dataDesejada: "08/2026", orgao: "Pref. de Cariacica — Fundo Mun. de Saúde", cidade: "Cariacica", uf: "ES", status: "Com verba", movimentacao: "Emenda de R$1,5M empenhada para a categoria", novo: true, janela: "Edital provável: jul–ago/2026", score: 86 },
  { objeto: "Aquisição de material de informática e expediente", categoria: "Informática", tipo: "Material", esfera: "Municipal", valorTotal: 845000, qtd: "60 itens", dataDesejada: "07/2026", orgao: "Sec. de Educação de Vitória", cidade: "Vitória", uf: "ES", status: "Virou edital", movimentacao: "PCA virou Pregão 045/2026 — publicado", novo: true, janela: "Abertura: 11/07/2026", score: 78 },
  { objeto: "Serviço de limpeza e conservação predial", categoria: "Serviços", tipo: "Serviço", esfera: "Estadual", valorTotal: 4620000, qtd: "8 postos", dataDesejada: "09/2026", orgao: "Governo do ES — SESA", cidade: "Vitória", uf: "ES", status: "Planejado", movimentacao: "Sem movimentação financeira ainda", janela: "Edital provável: set–out/2026", score: 64 },
  { objeto: "Mobiliário — cadeiras e mesas", categoria: "Mobiliário", tipo: "Material", esfera: "Federal", valorTotal: 540000, qtd: "300 un", dataDesejada: "10/2026", orgao: "IFES", cidade: "Vitória", uf: "ES", status: "Planejado", movimentacao: "Aguardando dotação orçamentária", janela: "Edital provável: out/2026", score: 55 },
  { objeto: "Aquisição de notebooks i5", categoria: "Informática", tipo: "Material", esfera: "Estadual", valorTotal: 4200000, qtd: "200 un", dataDesejada: "11/2026", orgao: "TJ-ES", cidade: "Vitória", uf: "ES", status: "Em execução", movimentacao: "Contrato assinado — em fornecimento", janela: "Recompra prevista: 2027", score: 40 },
  { objeto: "Serviço de manutenção de elevadores", categoria: "Serviços", tipo: "Serviço", esfera: "Estadual", valorTotal: 554160, qtd: "1 contrato", dataDesejada: "07/2026", orgao: "Superintendência de Gestão — RO", cidade: "Porto Velho", uf: "RO", status: "Com verba", movimentacao: "Recurso reservado para a contratação", novo: true, janela: "Edital provável: jul/2026", score: 71 },
];

const categorias = ["Todas", "Saúde", "Informática", "Serviços", "Mobiliário"];
const ufs = ["Todas", "ES", "RO", "SP", "MG", "BA"];
const esferas = ["Todas", "Federal", "Estadual", "Municipal"];
const tipos = ["Todos", "Material", "Serviço"];
const statusOpts = ["Todos", ...fases];

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const valoresMes = [180, 140, 165, 150, 130, 110, 95, 120, 150, 135, 100, 310]; // R$ bi (exemplo)

const GEO_URL = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/brazil-states.geojson";
const escala = ["#F0EBFB", "#CFC3EF", "#A98FE0", "#7C57CC", "#4A1F9E"];
const valoresUF: Record<string, number> = {
  "São Paulo": 1240, "Rio de Janeiro": 820, "Minas Gerais": 760, "Bahia": 540, "Pernambuco": 360,
  "Ceará": 340, "Paraná": 430, "Rio Grande do Sul": 410, "Santa Catarina": 300, "Goiás": 280,
  "Distrito Federal": 300, "Espírito Santo": 260, "Pará": 250, "Mato Grosso": 210, "Maranhão": 190,
  "Mato Grosso do Sul": 180, "Amazonas": 160, "Rio Grande do Norte": 150, "Paraíba": 140, "Rondônia": 130,
  "Piauí": 120, "Alagoas": 110, "Tocantins": 105, "Sergipe": 100, "Acre": 70, "Amapá": 65, "Roraima": 60,
};
const capitais: Record<string, string> = {
  "São Paulo": "São Paulo", "Rio de Janeiro": "Rio de Janeiro", "Minas Gerais": "Belo Horizonte",
  "Bahia": "Salvador", "Pernambuco": "Recife", "Ceará": "Fortaleza", "Paraná": "Curitiba",
  "Rio Grande do Sul": "Porto Alegre", "Santa Catarina": "Florianópolis", "Goiás": "Goiânia",
  "Distrito Federal": "Brasília", "Espírito Santo": "Vitória", "Pará": "Belém", "Mato Grosso": "Cuiabá",
  "Maranhão": "São Luís", "Mato Grosso do Sul": "Campo Grande", "Amazonas": "Manaus",
  "Rio Grande do Norte": "Natal", "Paraíba": "João Pessoa", "Rondônia": "Porto Velho",
  "Piauí": "Teresina", "Alagoas": "Maceió", "Tocantins": "Palmas", "Sergipe": "Aracaju",
  "Acre": "Rio Branco", "Amapá": "Macapá", "Roraima": "Boa Vista",
};
const brBi = (n: number) => `R$ ${n} Bi`;

export default function PCAPage() {
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("Todas");
  const [uf, setUf] = useState("Todas");
  const [esfera, setEsfera] = useState("Todas");
  const [tipo, setTipo] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [ordem, setOrdem] = useState("recentes");
  const [seguidos, setSeguidos] = useState<Set<string>>(new Set());
  const [erro] = useState(false);

  const toggleSeguir = (o: string) =>
    setSeguidos((s) => { const n = new Set(s); if (n.has(o)) n.delete(o); else n.add(o); return n; });

  const lista = itens
    .filter((i) => !termo || i.objeto.toLowerCase().includes(termo.toLowerCase()) || i.orgao.toLowerCase().includes(termo.toLowerCase()))
    .filter((i) => cat === "Todas" || i.categoria === cat)
    .filter((i) => uf === "Todas" || i.uf === uf)
    .filter((i) => esfera === "Todas" || i.esfera === esfera)
    .filter((i) => tipo === "Todos" || i.tipo === tipo)
    .filter((i) => status === "Todos" || i.status === status)
    .sort((a, b) => (ordem === "valor" ? b.valorTotal - a.valorTotal : ordem === "score" ? b.score - a.score : 0));

  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">PCA — Plano de Contratação Anual</h1>
        <p className="mt-1 max-w-[640px] text-[13.5px] text-cinza">
          Explore o que os órgãos planejam comprar — e antecipe-se. A Sentinela acompanha cada PCA e avisa quando ele recebe verba, vira edital ou tem data de execução prevista.
        </p>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Órgãos" valor="3.685" />
        <KPI label="Itens publicados" valor="4.071.222" />
        <KPI label="Qtd total" valor="88.745,5 Mi" />
        <KPI label="Valor total" valor="R$ 3.109,8 Bi" destaque />
      </div>

      {/* visão geral */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_440px]">
        <BarChartInterativo />
        <MapaBrasil />
      </div>

      {/* busca + filtros (todos interativos) */}
      <div className="mt-5 flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
        <Search size={18} />
        <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar item do PCA por objeto ou órgão" className="flex-1 bg-transparent text-sm text-ink outline-none" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Sel label="Categoria" value={cat} onChange={setCat} options={categorias} />
        <Sel label="UF" value={uf} onChange={setUf} options={ufs} />
        <Sel label="Esfera" value={esfera} onChange={setEsfera} options={esferas} />
        <Sel label="Tipo" value={tipo} onChange={setTipo} options={tipos} />
        <Sel label="Status" value={status} onChange={setStatus} options={statusOpts} />
        <div className="ml-auto">
          <Sel label="Ordenar" value={ordem} onChange={setOrdem} options={[["recentes", "Mais recentes"], ["valor", "Maior valor"], ["score", "Maior oportunidade"]]} />
        </div>
      </div>

      <p className="mt-3 text-[13px] text-cinza"><b className="font-display font-bold text-indigo-deep">{lista.length}</b> itens encontrados</p>

      {/* lista */}
      {erro ? (
        <div className="mt-3"><FonteInstavel fonte="PNCP" onTentar={() => {}} /></div>
      ) : lista.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-borda bg-white py-14 text-center text-[13px] text-cinza">Nenhum item com esses filtros.</div>
      ) : (
        <div className="mt-3 space-y-3">
          {lista.map((i, idx) => (
            <ItemCard key={idx} i={i} seguindo={seguidos.has(i.objeto + idx)} onSeguir={() => toggleSeguir(i.objeto + idx)} />
          ))}
        </div>
      )}
    </>
  );
}

function ItemCard({ i, seguindo, onSeguir }: { i: ItemPCA; seguindo: boolean; onSeguir: () => void }) {
  const sb = i.score >= 70 ? { bg: "#DCFCE7", fg: "#15803D" } : i.score >= 50 ? { bg: "#FEF3E2", fg: "#B45309" } : { bg: "#F1F5F9", fg: "#64748B" };
  return (
    <div className="rounded-2xl border border-borda bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-display text-[11px] font-semibold text-indigo-deep">{i.categoria}</span>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-medium text-cinza">{i.tipo}</span>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-medium text-cinza">{i.esfera}</span>
        {i.novo && <span className="rounded-full bg-[#FFE9D6] px-2.5 py-0.5 font-display text-[10px] font-bold text-[#B45309]">● movimentação nova</span>}
        <span className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold" style={{ background: sb.bg, color: sb.fg }}>Oportunidade {i.score}</span>
      </div>

      <h3 className="mt-2.5 font-display text-[15px] font-semibold leading-snug text-indigo-deep">{i.objeto}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cinza">
        <span className="flex items-center gap-1"><Building2 size={12} /> {i.orgao}</span>
        <span className="flex items-center gap-1"><MapPin size={12} /> {i.cidade}/{i.uf}</span>
      </div>

      {/* status / movimentação */}
      <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3">
        <Stepper atual={i.status} />
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
          <span className="flex items-center gap-1.5 text-ink"><Banknote size={13} className="text-verde" /> {i.movimentacao}</span>
          <span className="flex items-center gap-1.5 font-semibold text-violeta"><CalendarClock size={13} /> {i.janela}</span>
        </div>
      </div>

      {/* dados */}
      <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-4">
        <Meta label="Valor total" valor={brl(i.valorTotal)} />
        <Meta label="Quantidade" valor={i.qtd} />
        <Meta label="Data desejada" valor={i.dataDesejada} />
        <Meta label="Esfera" valor={i.esfera} />
      </div>

      {/* ações */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a href="/dashboard/raio-x" className="flex items-center gap-2 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo">
          <Radar size={15} /> Cruzar com Raio-X
        </a>
        <button onClick={onSeguir} className={["flex items-center gap-2 rounded-lg border px-4 py-2.5 font-display text-[13px] font-semibold transition", seguindo ? "border-violeta bg-[#F5F3FF] text-violeta" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>
          <Bell size={15} /> {seguindo ? "Seguindo" : "Seguir movimentação"}
        </button>
        <a href="#" className="ml-auto flex items-center gap-1.5 self-center text-[12.5px] font-semibold text-violeta">Ver no PNCP <ExternalLink size={13} /></a>
      </div>
    </div>
  );
}

function Stepper({ atual }: { atual: StatusPCA }) {
  const idx = fases.indexOf(atual);
  return (
    <div className="flex items-center">
      {fases.map((f, i) => {
        const done = i <= idx;
        return (
          <div key={f} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full" style={{ background: done ? (i === idx ? "#FF6600" : "#5B21B6") : "#CBD5E1" }} />
              <span className="mt-1 whitespace-nowrap text-[10px] font-medium" style={{ color: done ? "#1E1B4B" : "#94A3B8" }}>{f}</span>
            </div>
            {i < fases.length - 1 && <div className="mx-1 mb-4 h-0.5 flex-1" style={{ background: i < idx ? "#5B21B6" : "#E2E8F0" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Meta({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] text-cinza">{label}</div>
      <div className="mt-0.5 font-display text-[13px] font-semibold text-indigo-deep">{valor}</div>
    </div>
  );
}

function BarChartInterativo() {
  const [h, setH] = useState<number | null>(null);
  const max = Math.max(...valoresMes);
  return (
    <div className="rounded-2xl border border-borda bg-white p-5">
      <h3 className="mb-2 font-display text-[14px] font-semibold text-indigo-deep">Valor planejado por mês</h3>
      <p className="mb-4 text-[12px] text-cinza">Passe o mouse para ver o valor.</p>
      <div className="relative flex h-[180px] items-end gap-2">
        {valoresMes.map((v, i) => (
          <div key={i} className="relative flex flex-1 flex-col items-center gap-1.5" onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)}>
            {h === i && (
              <div className="absolute -top-9 z-10 whitespace-nowrap rounded-lg bg-indigo-deep px-2.5 py-1 font-display text-[11px] font-semibold text-white shadow-lg">
                {meses[i]} · R$ {v} Bi
              </div>
            )}
            <div className="w-full max-w-[38px] rounded-t transition-all" style={{ height: `${(v / max) * 150}px`, background: h === i ? "#5B21B6" : i === 11 ? "#FF6600" : "#C9BCEC" }} />
            <span className="text-[10px] text-cinza">{meses[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function valorDe(f: any): number {
  const nome = f?.properties?.name as string | undefined;
  return (nome && valoresUF[nome]) || 80;
}
function nomeDe(f: any): string {
  return (f?.properties?.name as string) || "";
}

function MapaBrasil() {
  const W = 380;
  const H = 380;
  const [feats, setFeats] = useState<any[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [hover, setHover] = useState<{ nome: string; capital: string; valor: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    setErro(false);
    setFeats(null);
    fetch(GEO_URL)
      .then((r) => { if (!r.ok) throw new Error("falha"); return r.json(); })
      .then((j) => { if (vivo) setFeats(j.features as any[]); })
      .catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [tentativa]);

  return (
    <div className="relative rounded-2xl border border-borda bg-white p-5">
      <h3 className="mb-2 font-display text-[14px] font-semibold text-indigo-deep">Valor por estado</h3>

      {erro ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-[13px] font-medium text-[#B45309]">Não foi possível carregar o mapa agora.</p>
          <button onClick={() => setTentativa((t) => t + 1)} className="rounded-lg bg-laranja px-4 py-2 font-display text-[12.5px] font-semibold text-white transition hover:bg-laranja-hover">Tentar novamente</button>
        </div>
      ) : !feats ? (
        <div className="flex h-[280px] items-center justify-center text-[13px] text-cinza">Carregando mapa…</div>
      ) : (
        (() => {
          const valores = feats.map(valorDe);
          const min = Math.min(...valores);
          const max = Math.max(...valores);
          const fc = { type: "FeatureCollection", features: feats } as any;
          const proj = geoMercator().fitSize([W, H], fc);
          const path = geoPath(proj);
          const cor = (v: number) => {
            const t = max > min ? (v - min) / (max - min) : 0;
            return escala[Math.min(escala.length - 1, Math.floor(t * escala.length))];
          };
          return (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[400px]">
                {feats.map((f, i) => {
                  const v = valorDe(f);
                  const sel = hover?.nome === nomeDe(f);
                  return (
                    <path
                      key={i}
                      d={path(f) ?? undefined}
                      fill={cor(v)}
                      stroke={sel ? "#1E1B4B" : "#fff"}
                      strokeWidth={sel ? 1.6 : 0.6}
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHover({ nome: nomeDe(f), capital: capitais[nomeDe(f)] ?? "—", valor: v })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute right-5 top-5 min-w-[140px] rounded-lg border border-borda bg-white/95 px-3 py-2 shadow-sm">
                <div className="font-display text-[12.5px] font-semibold text-indigo-deep">{hover ? hover.nome : "Passe o mouse"}</div>
                {hover && <div className="text-[11px] text-cinza">Capital: {hover.capital}</div>}
                <div className="mt-0.5 font-display text-[15px] font-bold text-violeta">{hover ? brBi(hover.valor) : "—"}</div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] text-cinza">menor</span>
                <div className="h-2.5 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${escala.join(",")})` }} />
                <span className="text-[11px] text-cinza">maior</span>
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}

function KPI({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className={["rounded-xl border p-4", destaque ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white"].join(" ")}>
      <div className="text-[11.5px] text-cinza">{label}</div>
      <div className="mt-1 font-display text-[20px] font-bold text-indigo-deep">{valor}</div>
    </div>
  );
}

type Opt = string | [string, string];
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-10 appearance-none rounded-lg border border-borda bg-white pl-3 pr-8 text-[12.5px] font-medium text-indigo-deep outline-none focus:border-violeta">
        {options.map((o) => {
          const val = Array.isArray(o) ? o[0] : o;
          const txt = Array.isArray(o) ? o[1] : o;
          const prefixo = val === "Todas" || val === "Todos" ? `${label}: ` : "";
          return <option key={val} value={val}>{prefixo}{txt}</option>;
        })}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cinza" />
    </div>
  );
}
