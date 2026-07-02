"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  BarChart3,
  Building2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Tend = "up" | "down" | "flat";
type Concorrente = {
  pos: number;
  nome: string;
  cnpj: string;
  vitorias: number;
  valor: number;
  share: number;
  orgaos: string;
  tend: Tend;
  sancao: boolean;
  ameaca: "alta" | "média" | "baixa";
  eu?: boolean;
};

const ranking: Concorrente[] = [
  { pos: 1, nome: "Papelaria Central LTDA", cnpj: "11.111.111/0001-11", vitorias: 18, valor: 2100000, share: 22, orgaos: "Pref. Vitória · IFES · TJ-ES", tend: "up", sancao: false, ameaca: "alta" },
  { pos: 2, nome: "Distribuidora ABC", cnpj: "22.222.222/0001-22", vitorias: 14, valor: 1700000, share: 18, orgaos: "SESA · Pref. Serra", tend: "up", sancao: false, ameaca: "alta" },
  { pos: 3, nome: "MegaSupri", cnpj: "44.444.444/0001-44", vitorias: 11, valor: 1200000, share: 13, orgaos: "Pref. Serra · Cariacica", tend: "down", sancao: false, ameaca: "média" },
  { pos: 4, nome: "Comercial XYZ", cnpj: "33.333.333/0001-33", vitorias: 9, valor: 900000, share: 9, orgaos: "Pref. Cariacica · Linhares", tend: "up", sancao: false, ameaca: "média" },
  { pos: 5, nome: "Minha Empresa", cnpj: "27.637.346/0001-51", vitorias: 6, valor: 500000, share: 6, orgaos: "Pref. Vitória · IFES", tend: "flat", sancao: false, ameaca: "baixa", eu: true },
  { pos: 6, nome: "Fornecedor Único ME", cnpj: "55.555.555/0001-55", vitorias: 5, valor: 400000, share: 4, orgaos: "Câmara de X", tend: "down", sancao: true, ameaca: "baixa" },
];

export default function AnaliseConcorrentePage() {
  const [aba, setAba] = useState<"radar" | "processos" | "consultar">("radar");

  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">Análise de Concorrente</h1>
        <p className="mt-1 max-w-[640px] text-[13.5px] text-cinza">
          O sistema mapeia quem está ganhando no seu segmento e região — quem avança na sua frente. Se quiser, investigue uma empresa específica.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AbaBtn ativo={aba === "radar"} onClick={() => setAba("radar")}>Meus concorrentes</AbaBtn>
        <AbaBtn ativo={aba === "processos"} onClick={() => setAba("processos")}>Processos ganhos</AbaBtn>
        <AbaBtn ativo={aba === "consultar"} onClick={() => setAba("consultar")}>Consultar empresa</AbaBtn>
      </div>

      {aba === "radar" && <Radar />}
      {aba === "processos" && <Processos />}
      {aba === "consultar" && <Consultar />}
    </>
  );
}

/* ---------- RADAR (proativo) ---------- */

function Radar() {
  return (
    <div className="mt-4 space-y-5">
      {/* contexto */}
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-cinza">
        Baseado no seu perfil:
        <Chip>Segmento: Material de escritório</Chip>
        <Chip>UF: ES</Chip>
        <Chip>Últimos 12 meses</Chip>
      </div>

      {/* insights */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Concorrentes ativos" valor="23" />
        <KPI label="Líder do segmento" valor="Papelaria Central" sub="22% de share" />
        <KPI label="Sua posição" valor="5º" sub="de 23" destaque />
        <KPI label="Mercado no segmento (12m)" valor={brl(9400000)} />
      </div>

      {/* ganhando terreno */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#FCD9B6] bg-[#FFF4E8] p-4">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-laranja text-white"><Crosshair size={16} /></span>
        <div>
          <p className="font-display text-[13.5px] font-semibold text-[#B45309]">Ganhando terreno na sua frente</p>
          <p className="mt-0.5 text-[12.5px] text-[#92660C]">
            <b>Papelaria Central</b> e <b>Distribuidora ABC</b> vêm crescendo e disputam os mesmos órgãos que você (Pref. Vitória, IFES). Vale priorizar esses certames e revisar seu preço.
          </p>
        </div>
      </div>

      {/* ranking */}
      <div className="rounded-2xl border border-borda bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#EDE7FB] text-violeta"><BarChart3 size={15} /></span>
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Ranking de concorrentes — seu segmento</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-borda text-left font-display text-[12px] font-semibold text-cinza">
                <th className="pb-2.5">#</th><th className="pb-2.5">Empresa</th><th className="pb-2.5 text-right">Vitórias (12m)</th><th className="pb-2.5 text-right">Valor arrematado</th><th className="pb-2.5 text-right">Share</th><th className="pb-2.5 text-center">Tendência</th><th className="pb-2.5">Risco</th><th className="pb-2.5">Ameaça</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((c) => (
                <tr key={c.cnpj} className={["border-b border-borda last:border-b-0", c.eu ? "bg-[#F5F3FF]" : ""].join(" ")}>
                  <td className="py-3 font-display font-bold text-indigo-deep">{c.pos}º</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 font-display font-semibold text-indigo-deep">
                      {c.eu && <span className="rounded-full bg-violeta px-1.5 py-0.5 text-[9px] font-bold text-white">VOCÊ</span>}
                      {c.nome}
                    </div>
                    <div className="text-[11.5px] text-cinza">{c.orgaos}</div>
                  </td>
                  <td className="py-3 text-right font-semibold text-indigo-deep">{c.vitorias}</td>
                  <td className="py-3 text-right text-ink">{brl(c.valor)}</td>
                  <td className="py-3 text-right text-ink">{c.share}%</td>
                  <td className="py-3 text-center"><Tendencia t={c.tend} /></td>
                  <td className="py-3">{c.sancao ? <span className="inline-flex items-center gap-1 rounded-full bg-[#FDE7E7] px-2 py-0.5 text-[10.5px] font-bold text-[#B91C1C]"><ShieldAlert size={11} /> CEIS</span> : <span className="inline-flex items-center gap-1 text-[11.5px] text-verde"><ShieldCheck size={12} /> ok</span>}</td>
                  <td className="py-3"><Ameaca nivel={c.ameaca} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-cinza">Fonte: PNCP — histórico de fornecedores vencedores. Sanções: CEIS/CNEP/CEPIM (Portal da Transparência).</p>
      </div>
    </div>
  );
}

function Tendencia({ t }: { t: Tend }) {
  if (t === "up") return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-verde"><TrendingUp size={14} /> sobe</span>;
  if (t === "down") return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-vermelho"><TrendingDown size={14} /> cai</span>;
  return <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-cinza"><Minus size={14} /> estável</span>;
}

function Ameaca({ nivel }: { nivel: "alta" | "média" | "baixa" }) {
  const m = { alta: { bg: "#FDE7E7", fg: "#B91C1C" }, "média": { bg: "#FEF3E2", fg: "#B45309" }, baixa: { bg: "#F1F5F9", fg: "#64748B" } };
  const c = m[nivel];
  return <span className="rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold capitalize" style={{ background: c.bg, color: c.fg }}>{nivel}</span>;
}

/* ---------- CONSULTAR (due diligence) ---------- */

const certidoes: [string, "Regular" | "Vencida" | "Pendente"][] = [
  ["Cadastro na Receita (CNPJ)", "Regular"],
  ["SICAF", "Regular"],
  ["CND Federal / PGFN", "Regular"],
  ["FGTS (CRF)", "Regular"],
  ["Trabalhista (CNDT)", "Regular"],
  ["Estadual", "Regular"],
  ["Municipal", "Vencida"],
];

function Consultar() {
  const [cnpj, setCnpj] = useState("");
  const [mostra, setMostra] = useState(false);
  const [atualizado, setAtualizado] = useState("30/06/2026 09:12");
  const apto = !certidoes.some(([, s]) => s !== "Regular");

  return (
    <div className="mt-4 space-y-5">
      <div className="rounded-2xl border border-borda bg-white p-5">
        <label className="mb-1.5 block font-display text-[13px] font-semibold text-indigo-deep">Consultar uma empresa específica</label>
        <div className="flex gap-3">
          <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
            <Building2 size={18} />
            <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="Digite o CNPJ da empresa" className="flex-1 bg-transparent text-sm text-ink outline-none" />
          </div>
          <button onClick={() => setMostra(true)} className="flex items-center gap-2 rounded-xl bg-violeta px-5 font-display text-sm font-semibold text-white transition hover:bg-roxo">
            <Search size={16} /> Consultar
          </button>
        </div>
        <button onClick={() => { setCnpj("27.637.346/0001-51"); setMostra(true); }} className="mt-2 text-[12.5px] font-semibold text-violeta">Usar o meu CNPJ (auto-auditoria)</button>
      </div>

      {mostra && (
        <div className="rounded-2xl border border-borda bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EDE7FB] font-display text-[13px] font-bold text-violeta">PC</span>
            <div className="flex-1">
              <h3 className="font-display text-[16px] font-bold text-indigo-deep">Papelaria Central LTDA</h3>
              <p className="text-[12.5px] text-cinza">{cnpj || "11.111.111/0001-11"} · EPP · Ativa</p>
            </div>
            <span className="rounded-full bg-[#FEF3E2] px-3 py-1 font-display text-[11px] font-bold text-[#B45309]">Risco médio</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <KPI label="Situação cadastral" valor="Ativa" />
            <KPI label="Vitórias (12m)" valor="18" />
            <KPI label="Valor arrematado" valor={brl(2100000)} />
            <KPI label="Órgãos atendidos" valor="7" />
          </div>

          {/* situação perante o governo */}
          <div className="mt-4 rounded-xl border border-borda p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="font-display text-[13px] font-semibold text-indigo-deep">Situação perante o governo (habilitação)</p>
              <span className="rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold" style={{ background: apto ? "#DCFCE7" : "#FEF3E2", color: apto ? "#15803D" : "#B45309" }}>
                {apto ? "Apto" : "Atenção — pendência"}
              </span>
              <button onClick={() => setAtualizado(new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }))} className="ml-auto flex items-center gap-1.5 rounded-lg border border-borda px-3 py-1.5 text-[12px] font-semibold text-violeta transition hover:border-violeta">
                <RefreshCw size={13} /> Atualizar
              </button>
            </div>
            <p className="mb-3 text-[11.5px] text-cinza">Atualizado em {atualizado} · consulta a dados públicos</p>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {certidoes.map(([nome, status]) => {
                const cor = status === "Regular" ? { i: <ShieldCheck size={14} />, c: "#16A34A" } : status === "Vencida" ? { i: <AlertTriangle size={14} />, c: "#DC2626" } : { i: <AlertTriangle size={14} />, c: "#B45309" };
                return (
                  <div key={nome} className="flex items-center justify-between border-b border-borda py-1.5 text-[12.5px] last:border-b-0">
                    <span className="text-ink">{nome}</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: cor.c }}>{cor.i} {status}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-borda p-4">
              <p className="mb-2 font-display text-[13px] font-semibold text-indigo-deep">Sanções e idoneidade</p>
              <ul className="space-y-1.5 text-[12.5px]">
                <li className="flex items-center gap-2 text-verde"><ShieldCheck size={14} /> CEIS — sem registro</li>
                <li className="flex items-center gap-2 text-verde"><ShieldCheck size={14} /> CNEP — sem registro</li>
                <li className="flex items-center gap-2 text-verde"><ShieldCheck size={14} /> CEPIM — sem registro</li>
                <li className="flex items-center gap-2 text-[#B45309]"><ShieldAlert size={14} /> TCU — 1 ocorrência (acórdão, 2024)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-borda p-4">
              <p className="mb-2 font-display text-[13px] font-semibold text-indigo-deep">Onde mais vende</p>
              <ul className="space-y-1.5 text-[12.5px] text-cinza">
                <li className="flex items-center gap-2"><Trophy size={13} className="text-laranja" /> Prefeitura de Vitória — 6 vitórias</li>
                <li className="flex items-center gap-2"><Trophy size={13} className="text-laranja" /> IFES — 4 vitórias</li>
                <li className="flex items-center gap-2"><Trophy size={13} className="text-laranja" /> TJ-ES — 3 vitórias</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-cinza">Fontes: Receita/BrasilAPI (cadastro), Portal da Transparência (CEIS/CNEP/CEPIM), PNCP (histórico). Copiloto — confira antes de decidir.</p>
        </div>
      )}
    </div>
  );
}

/* ---------- PROCESSOS GANHOS ---------- */

type Processo = {
  data: string;
  orgao: string;
  uf: string;
  objeto: string;
  segmento: string;
  tipo: "Material" | "Serviço";
  valor: number;
  empresa: string;
  modalidade: string;
};

const processos: Processo[] = [
  { data: "14/05/2026", orgao: "Prefeitura de Vitória", uf: "ES", objeto: "Papel A4 e suprimentos de escritório", segmento: "Material de escritório", tipo: "Material", valor: 210000, empresa: "Papelaria Central LTDA", modalidade: "Pregão" },
  { data: "02/05/2026", orgao: "Governo do ES — SESA", uf: "ES", objeto: "Material de limpeza e higiene", segmento: "Serviços", tipo: "Material", valor: 178000, empresa: "Distribuidora ABC", modalidade: "Pregão SRP" },
  { data: "28/04/2026", orgao: "IFES", uf: "ES", objeto: "Mobiliário — cadeiras e mesas", segmento: "Mobiliário", tipo: "Material", valor: 540000, empresa: "Papelaria Central LTDA", modalidade: "Pregão" },
  { data: "19/04/2026", orgao: "Prefeitura da Serra", uf: "ES", objeto: "Serviço de limpeza predial (12 meses)", segmento: "Serviços", tipo: "Serviço", valor: 462000, empresa: "MegaSupri", modalidade: "Pregão" },
  { data: "05/04/2026", orgao: "Prefeitura de Cariacica", uf: "ES", objeto: "Toner e suprimentos de informática", segmento: "Informática", tipo: "Material", valor: 96000, empresa: "Comercial XYZ", modalidade: "Dispensa" },
  { data: "22/03/2026", orgao: "TJ-ES", uf: "ES", objeto: "Notebooks i5", segmento: "Informática", tipo: "Material", valor: 420000, empresa: "Distribuidora ABC", modalidade: "Pregão SRP" },
  { data: "10/03/2026", orgao: "Prefeitura de Vitória", uf: "ES", objeto: "Manutenção de ar-condicionado", segmento: "Serviços", tipo: "Serviço", valor: 132000, empresa: "MegaSupri", modalidade: "Pregão" },
  { data: "27/02/2026", orgao: "IFES", uf: "ES", objeto: "Papel A4 — registro de preços", segmento: "Material de escritório", tipo: "Material", valor: 88000, empresa: "Papelaria Central LTDA", modalidade: "Pregão SRP" },
  { data: "12/02/2026", orgao: "Prefeitura de Linhares", uf: "ES", objeto: "Material hospitalar básico", segmento: "Saúde", tipo: "Material", valor: 305000, empresa: "Comercial XYZ", modalidade: "Pregão" },
  { data: "30/01/2026", orgao: "Câmara Municipal de X", uf: "MG", objeto: "Serviço de vigilância", segmento: "Serviços", tipo: "Serviço", valor: 240000, empresa: "Fornecedor Único ME", modalidade: "Pregão" },
];

const empresasLista = ["Todas", ...Array.from(new Set(processos.map((p) => p.empresa)))];
const orgaosLista = ["Todos", ...Array.from(new Set(processos.map((p) => p.orgao)))];

function parseData(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function Processos() {
  const [empresa, setEmpresa] = useState("Todas");
  const [tipo, setTipo] = useState("Todos");
  const [orgao, setOrgao] = useState("Todos");
  const [periodo, setPeriodo] = useState(12);
  const [termo, setTermo] = useState("");

  const corte = new Date(2026, 5, 29);
  corte.setMonth(corte.getMonth() - periodo);

  const lista = processos
    .filter((p) => (empresa === "Todas" || p.empresa === empresa))
    .filter((p) => (tipo === "Todos" || p.tipo === tipo))
    .filter((p) => (orgao === "Todos" || p.orgao === orgao))
    .filter((p) => (!termo || p.objeto.toLowerCase().includes(termo.toLowerCase())))
    .filter((p) => parseData(p.data) >= corte)
    .sort((a, b) => parseData(b.data).getTime() - parseData(a.data).getTime());

  const total = lista.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="mt-4 space-y-4">
      {/* filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-white p-4">
        <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-borda px-3 text-cinza focus-within:border-violeta">
          <Search size={15} />
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por objeto" className="flex-1 bg-transparent text-[13px] text-ink outline-none" />
        </div>
        <SelectMini value={empresa} onChange={setEmpresa} options={empresasLista} label="Empresa" />
        <SelectMini value={tipo} onChange={setTipo} options={["Todos", "Material", "Serviço"]} label="Tipo" />
        <SelectMini value={orgao} onChange={setOrgao} options={orgaosLista} label="Órgão" />
        <SelectMini value={String(periodo)} onChange={(v) => setPeriodo(Number(v))} options={["6", "12", "24", "36"]} label="Período" sufixo=" meses" />
      </div>

      {/* resumo */}
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-cinza">
        <span><b className="font-display text-[15px] font-bold text-indigo-deep">{lista.length}</b> processos ganhos</span>
        <span>Total arrematado: <b className="font-display font-semibold text-indigo-deep">{brl(total)}</b></span>
      </div>

      {/* tabela */}
      <div className="overflow-x-auto rounded-2xl border border-borda bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-borda bg-[#F8FAFC] text-left font-display text-[12px] font-semibold text-cinza">
              <th className="px-4 py-3">Data</th><th className="px-4 py-3">Órgão</th><th className="px-4 py-3">Objeto</th><th className="px-4 py-3">Segmento</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3">Vencedor</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p, idx) => (
              <tr key={idx} className="border-b border-borda last:border-b-0">
                <td className="px-4 py-3 whitespace-nowrap text-cinza">{p.data}</td>
                <td className="px-4 py-3 text-ink">{p.orgao}/{p.uf}</td>
                <td className="px-4 py-3 text-ink">{p.objeto}</td>
                <td className="px-4 py-3 text-cinza">{p.segmento}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-indigo-deep">{p.tipo}</span></td>
                <td className="px-4 py-3 text-right font-display font-semibold text-indigo-deep">{brl(p.valor)}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 font-medium text-indigo-deep"><Trophy size={13} className="text-laranja" /> {p.empresa}</span></td>
                <td className="px-4 py-3"><a href="#" className="inline-flex items-center gap-1 text-[12px] font-semibold text-violeta">PNCP <ExternalLink size={12} /></a></td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={8} className="py-12 text-center text-[13px] text-cinza">Nenhum processo com esses filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-cinza">Fonte: PNCP — resultados homologados (vencedores). Dados de exemplo.</p>
    </div>
  );
}

function SelectMini({ value, onChange, options, label, sufixo = "" }: { value: string; onChange: (v: string) => void; options: string[]; label: string; sufixo?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 appearance-none rounded-lg border border-borda bg-white pl-3 pr-8 text-[12.5px] font-medium text-indigo-deep outline-none focus:border-violeta" aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{o === "Todas" || o === "Todos" ? `${label}: ${o}` : o + sufixo}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cinza" />
    </div>
  );
}

/* ---------- helpers ---------- */

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-borda bg-white px-2.5 py-1 font-display text-[11.5px] font-semibold text-indigo-deep">{children}</span>;
}

function AbaBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={["rounded-xl border px-4 py-2.5 font-display text-[13px] font-semibold transition", ativo ? "border-transparent bg-indigo-deep text-white" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>
      {children}
    </button>
  );
}

function KPI({ label, valor, sub, destaque }: { label: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={["rounded-xl border p-4", destaque ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white"].join(" ")}>
      <div className="text-[11.5px] text-cinza">{label}</div>
      <div className="mt-1 font-display text-[18px] font-bold text-indigo-deep">{valor}</div>
      {sub && <div className="text-[11px] text-cinza">{sub}</div>}
    </div>
  );
}
