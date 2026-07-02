"use client";

import { useState } from "react";
import {
  Search,
  Trophy,
  Sparkles,
  FileDown,
  Scale,
  Info,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

type Fonte = "homologados" | "atas" | "contratos";
type Registro = {
  item: string;
  segmento: string;
  tipo: "Material" | "Serviço";
  fornecedor: string;
  cnpjForn: string;
  orgao: string;
  cnpjOrgao: string;
  uf: string;
  porte: "ME" | "EPP" | "Demais";
  data: string; // DD/MM/YYYY
  valor: number;
  fonte: Fonte;
  srp: boolean;
};

const dados: Registro[] = [
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Papelaria Central LTDA", cnpjForn: "11.111.111/0001-11", orgao: "Prefeitura de Vitória", cnpjOrgao: "27.000.001/0001-00", uf: "ES", porte: "EPP", data: "12/05/2026", valor: 18.9, fonte: "homologados", srp: false },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Distribuidora ABC", cnpjForn: "22.222.222/0001-22", orgao: "Governo do ES — SESA", cnpjOrgao: "27.000.002/0001-00", uf: "ES", porte: "Demais", data: "03/04/2026", valor: 21.5, fonte: "atas", srp: true },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Comercial XYZ", cnpjForn: "33.333.333/0001-33", orgao: "Prefeitura de Cariacica", cnpjOrgao: "27.000.003/0001-00", uf: "ES", porte: "ME", data: "20/03/2026", valor: 17.8, fonte: "homologados", srp: false },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Papelaria Central LTDA", cnpjForn: "11.111.111/0001-11", orgao: "IFES", cnpjOrgao: "27.000.004/0001-00", uf: "ES", porte: "EPP", data: "15/02/2026", valor: 24.0, fonte: "contratos", srp: false },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "MegaSupri", cnpjForn: "44.444.444/0001-44", orgao: "Prefeitura da Serra", cnpjOrgao: "27.000.005/0001-00", uf: "ES", porte: "Demais", data: "28/01/2026", valor: 19.4, fonte: "atas", srp: true },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Fornecedor Único ME", cnpjForn: "55.555.555/0001-55", orgao: "Câmara Municipal de X", cnpjOrgao: "31.000.006/0001-00", uf: "MG", porte: "ME", data: "10/01/2026", valor: 39.9, fonte: "homologados", srp: false },
  { item: "Papel A4 75g — resma", segmento: "Material de escritório", tipo: "Material", fornecedor: "Comercial XYZ", cnpjForn: "33.333.333/0001-33", orgao: "Prefeitura de Linhares", cnpjOrgao: "27.000.007/0001-00", uf: "ES", porte: "ME", data: "05/05/2026", valor: 18.2, fonte: "contratos", srp: false },
  { item: "Cadeira giratória executiva", segmento: "Mobiliário", tipo: "Material", fornecedor: "Móveis Brasil", cnpjForn: "66.666.666/0001-66", orgao: "Prefeitura de Vitória", cnpjOrgao: "27.000.001/0001-00", uf: "ES", porte: "Demais", data: "18/04/2026", valor: 540.0, fonte: "homologados", srp: false },
  { item: "Cadeira giratória executiva", segmento: "Mobiliário", tipo: "Material", fornecedor: "ErgoOffice", cnpjForn: "77.777.777/0001-77", orgao: "TJ-ES", cnpjOrgao: "27.000.008/0001-00", uf: "ES", porte: "EPP", data: "02/03/2026", valor: 612.0, fonte: "atas", srp: true },
  { item: "Notebook i5 16GB", segmento: "Informática", tipo: "Material", fornecedor: "TechSupri", cnpjForn: "88.888.888/0001-88", orgao: "IFES", cnpjOrgao: "27.000.004/0001-00", uf: "ES", porte: "Demais", data: "22/04/2026", valor: 4200.0, fonte: "homologados", srp: false },
  { item: "Serviço de limpeza — posto/mês", segmento: "Serviços", tipo: "Serviço", fornecedor: "Conserva Master", cnpjForn: "99.999.999/0001-99", orgao: "Governo do ES — SESA", cnpjOrgao: "27.000.002/0001-00", uf: "ES", porte: "Demais", data: "30/04/2026", valor: 3850.0, fonte: "contratos", srp: false },
  { item: "Serviço de limpeza — posto/mês", segmento: "Serviços", tipo: "Serviço", fornecedor: "LimpaTudo", cnpjForn: "10.101.010/0001-10", orgao: "Prefeitura da Serra", cnpjOrgao: "27.000.005/0001-00", uf: "ES", porte: "EPP", data: "11/02/2026", valor: 3990.0, fonte: "atas", srp: true },
];

const segmentos = ["Todos", "Material de escritório", "Mobiliário", "Informática", "Serviços", "Saúde"];
const ufs = ["Todos", "ES", "SP", "MG", "BA"];
const portes = ["Todos", "ME", "EPP", "Demais"];

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const r2 = (n: number) => Math.round(n * 100) / 100;
function median(ns: number[]) {
  if (!ns.length) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function parseData(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}

type Filtros = {
  segmento: string;
  objeto: string;
  empresa: string;
  cnpjForn: string;
  cnpjOrgao: string;
  uf: string;
  porte: string;
  tipo: string;
  precoMin: string;
  precoMax: string;
  periodo: number;
  apenasSRP: boolean;
};
const filtrosVazio: Filtros = {
  segmento: "Todos", objeto: "", empresa: "", cnpjForn: "", cnpjOrgao: "",
  uf: "Todos", porte: "Todos", tipo: "Todos", precoMin: "", precoMax: "", periodo: 24, apenasSRP: false,
};

export default function PesquisaPrecosPage() {
  const [aba, setAba] = useState<"historico" | "inteligente">("historico");
  const [termo, setTermo] = useState("Papel A4");
  const [drawer, setDrawer] = useState(false);
  const [fontes, setFontes] = useState<Set<Fonte>>(new Set(["homologados", "atas", "contratos"]));
  const [f, setF] = useState<Filtros>(filtrosVazio);

  const toggleFonte = (x: Fonte) =>
    setFontes((s) => { const n = new Set(s); if (n.has(x)) n.delete(x); else n.add(x); return n; });
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((p) => ({ ...p, [k]: v }));

  const corte = new Date(2026, 5, 29);
  corte.setMonth(corte.getMonth() - f.periodo);

  const resultado = dados.filter((d) => {
    if (!fontes.has(d.fonte)) return false;
    if (termo && !d.item.toLowerCase().includes(termo.toLowerCase())) return false;
    if (f.segmento !== "Todos" && d.segmento !== f.segmento) return false;
    if (f.objeto && !d.item.toLowerCase().includes(f.objeto.toLowerCase())) return false;
    if (f.empresa && !d.fornecedor.toLowerCase().includes(f.empresa.toLowerCase())) return false;
    if (f.cnpjForn && !d.cnpjForn.includes(f.cnpjForn)) return false;
    if (f.cnpjOrgao && !d.cnpjOrgao.includes(f.cnpjOrgao)) return false;
    if (f.uf !== "Todos" && d.uf !== f.uf) return false;
    if (f.porte !== "Todos" && d.porte !== f.porte) return false;
    if (f.tipo !== "Todos" && d.tipo !== f.tipo) return false;
    const min = Number(f.precoMin.replace(",", "."));
    const max = Number(f.precoMax.replace(",", "."));
    if (f.precoMin && d.valor < min) return false;
    if (f.precoMax && d.valor > max) return false;
    if (f.apenasSRP && !d.srp) return false;
    if (parseData(d.data) < corte) return false;
    return true;
  });

  const valores = resultado.map((d) => d.valor);
  const med = median(valores);
  const sane = valores.filter((v) => v <= med * 1.5);
  const stats = {
    amostras: resultado.length,
    mediana: med,
    media: sane.length ? r2(sane.reduce((a, b) => a + b, 0) / sane.length) : 0,
    min: valores.length ? Math.min(...valores) : 0,
    max: valores.length ? Math.max(...valores) : 0,
  };
  const intel = {
    inexequivel: r2(med * 0.8),
    competitivo: r2(med * 0.95),
    mediana: med,
    teto: sane.length ? Math.max(...sane) : 0,
  };

  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">Pesquisa de Preços</h1>
        <p className="mt-1 max-w-[640px] text-[13.5px] text-cinza">
          Veja o que os órgãos pagaram (e quem ganhou) e descubra o preço inteligente para praticar — com justificativa dentro da Lei 14.133/2021.
        </p>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
          <Search size={18} />
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Descreva o item ou objeto (ex.: papel A4, cadeira giratória, serviço de limpeza)" className="flex-1 bg-transparent text-sm text-ink outline-none" />
        </div>
        <button onClick={() => setDrawer(true)} className="flex shrink-0 items-center gap-2 rounded-xl border-[1.5px] border-borda bg-white px-4 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta">
          <SlidersHorizontal size={16} /> Filtros
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-cinza">Fonte:</span>
        {([["homologados", "Preços homologados"], ["atas", "Atas de Registro de Preço"], ["contratos", "Contratos em vigor"]] as [Fonte, string][]).map(([id, label]) => {
          const on = fontes.has(id);
          return (
            <button key={id} onClick={() => toggleFonte(id)} className={["rounded-full border px-3.5 py-1.5 font-display text-[12.5px] font-semibold transition", on ? "border-violeta bg-[#F5F3FF] text-violeta" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <AbaBtn ativo={aba === "historico"} onClick={() => setAba("historico")}>1 · O que o mercado pagou</AbaBtn>
        <AbaBtn ativo={aba === "inteligente"} onClick={() => setAba("inteligente")}>2 · Preço inteligente</AbaBtn>
      </div>

      {resultado.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-borda bg-white py-16 text-center text-[13px] text-cinza">
          Nenhum registro com esses filtros. Ajuste a busca, a fonte ou os filtros.
        </div>
      ) : aba === "historico" ? (
        <Historico resultado={resultado} stats={stats} />
      ) : (
        <Inteligente intel={intel} stats={stats} termo={termo} />
      )}

      <p className="mt-4 text-[12px] text-cinza">
        Dados de exemplo. Base real: PNCP (homologados, atas de registro de preço, contratos em vigor) + Painel de Preços. Copiloto, fonte citada — não substitui parecer jurídico.
      </p>

      {drawer && <FiltrosDrawer f={f} set={set} fontes={fontes} toggleFonte={toggleFonte} onLimpar={() => setF(filtrosVazio)} onClose={() => setDrawer(false)} />}
    </>
  );
}

/* ---------- VERTENTE 1 ---------- */

function Historico({ resultado, stats }: { resultado: Registro[]; stats: { amostras: number; mediana: number; media: number; min: number; max: number } }) {
  return (
    <div className="mt-4 space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KPI label="Amostras" valor={String(stats.amostras)} />
        <KPI label="Mediana" valor={brl(stats.mediana)} destaque />
        <KPI label="Média saneada" valor={brl(stats.media)} />
        <KPI label="Menor preço" valor={brl(stats.min)} />
        <KPI label="Maior preço" valor={brl(stats.max)} />
      </div>

      <div className="rounded-2xl border border-borda bg-white p-5">
        <h3 className="mb-4 font-display text-[15px] font-semibold text-indigo-deep">Preços por registro — quem ganhou e por quanto</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-borda text-left font-display text-[12px] font-semibold text-cinza">
                <th className="pb-2.5">Valor unit.</th><th className="pb-2.5">Item</th><th className="pb-2.5">Órgão</th><th className="pb-2.5">UF</th><th className="pb-2.5">Data</th><th className="pb-2.5">Vencedor</th><th className="pb-2.5">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {[...resultado].sort((a, b) => a.valor - b.valor).map((l, idx) => {
                const outlier = l.valor > stats.media * 1.5;
                return (
                  <tr key={idx} className="border-b border-borda last:border-b-0">
                    <td className="py-3 font-display font-semibold text-indigo-deep">{brl(l.valor)}{outlier && <span className="ml-2 rounded-full bg-[#FDE7E7] px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">outlier</span>}</td>
                    <td className="py-3 text-ink">{l.item}</td>
                    <td className="py-3 text-cinza">{l.orgao}</td>
                    <td className="py-3 text-cinza">{l.uf}</td>
                    <td className="py-3 text-cinza">{l.data}</td>
                    <td className="py-3"><span className="inline-flex items-center gap-1.5 font-medium text-indigo-deep"><Trophy size={13} className="text-laranja" /> {l.fornecedor}</span></td>
                    <td className="py-3"><FonteTag fonte={l.fonte} srp={l.srp} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FonteTag({ fonte, srp }: { fonte: Fonte; srp: boolean }) {
  const m: Record<Fonte, { label: string; bg: string; fg: string }> = {
    homologados: { label: "Homologado", bg: "#DCFCE7", fg: "#15803D" },
    atas: { label: "Ata SRP", bg: "#EDE7FB", fg: "#5B21B6" },
    contratos: { label: "Contrato", bg: "#DBEAFE", fg: "#1E40AF" },
  };
  const c = m[fonte];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10.5px] font-bold" style={{ background: c.bg, color: c.fg }}>
      {c.label}{srp && fonte !== "atas" ? " · SRP" : ""}
    </span>
  );
}

/* ---------- VERTENTE 2 ---------- */

function Inteligente({ intel, stats, termo }: { intel: { inexequivel: number; competitivo: number; mediana: number; teto: number }; stats: { amostras: number; max: number }; termo: string }) {
  const { inexequivel, competitivo, mediana, teto } = intel;
  const lo = inexequivel * 0.96;
  const hi = teto * 1.04;
  const pos = (v: number) => (hi - lo ? ((v - lo) / (hi - lo)) * 100 : 50);

  return (
    <div className="mt-4 space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPI label="Inexequível provável (abaixo de)" valor={brl(inexequivel)} cor="#DC2626" />
        <KPI label="Preço competitivo recomendado" valor={brl(competitivo)} cor="#16A34A" destaque />
        <KPI label="Teto (estimativa do órgão)" valor={brl(teto)} cor="#5B21B6" />
      </div>

      <div className="rounded-2xl border border-borda bg-white p-5">
        <h3 className="mb-10 font-display text-[15px] font-semibold text-indigo-deep">Faixa de preço — {termo || "item"}</h3>
        <div className="relative mb-10 h-3 rounded-full" style={{ background: `linear-gradient(90deg,#FDE7E7 0%,#FDE7E7 ${pos(inexequivel)}%,#DCFCE7 ${pos(inexequivel)}%,#DCFCE7 ${pos(mediana)}%,#EDE7FB ${pos(mediana)}%,#EDE7FB 100%)` }}>
          {[{ v: inexequivel, t: "Inexequível", c: "#DC2626" }, { v: competitivo, t: "Recomendado", c: "#16A34A" }, { v: mediana, t: "Mediana", c: "#64748B" }, { v: teto, t: "Teto", c: "#5B21B6" }].map((mk) => (
            <div key={mk.t} className="absolute -top-7 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(mk.v) + "%" }}>
              <span className="font-display text-[11px] font-bold" style={{ color: mk.c }}>{brl(mk.v)}</span>
              <span className="mt-3 h-3 w-0.5" style={{ background: mk.c }} />
              <span className="mt-1 whitespace-nowrap text-[10.5px] text-cinza">{mk.t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAD9F7] bg-[#FBFAFF] p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violeta text-white"><Scale size={16} /></span>
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Justificativa do preço (embasamento legal)</h3>
          <span className="ml-auto rounded-full bg-[#EDE7FB] px-2.5 py-1 font-display text-[10px] font-bold text-violeta">GERADO POR IA · FONTE CITADA</span>
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink">
          Para <b>{termo || "o item"}</b>, a estimativa seguiu a <b>Lei 14.133/2021 (art. 23)</b> e a <b>IN SEGES/ME nº 65/2021</b>: coleta priorizando o <b>PNCP</b> (homologados, atas e contratos), com <b>saneamento de outliers</b> (acima de 50% da média). Da amostra saneada ({stats.amostras} registros), a <b>mediana</b> ficou em {brl(mediana)}. O <b>preço recomendado</b> de {brl(competitivo)} fica abaixo da mediana e acima do limite de inexequibilidade ({brl(inexequivel)}).
        </p>
        <ul className="mt-3 space-y-1.5 text-[12.5px] text-cinza">
          <li className="flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0 text-violeta" /> Fonte primária: PNCP — links por amostra.</li>
          <li className="flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0 text-violeta" /> Critério: mediana saneada (art. 23, §1º); alternativa: menor preço, se justificado.</li>
          <li className="flex items-start gap-2"><Info size={13} className="mt-0.5 shrink-0 text-violeta" /> Revisão humana obrigatória; não substitui parecer jurídico.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"><Sparkles size={15} /> Gerar justificativa com IA</button>
          <button className="flex items-center gap-2 rounded-lg border border-borda bg-white px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta"><FileDown size={15} /> Exportar pesquisa de preços (.docx)</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- DRAWER DE FILTROS (controlado) ---------- */

const inputF = "h-10 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta";

function FiltrosDrawer({
  f, set, fontes, toggleFonte, onLimpar, onClose,
}: {
  f: Filtros;
  set: <K extends keyof Filtros>(k: K, v: Filtros[K]) => void;
  fontes: Set<Fonte>;
  toggleFonte: (x: Fonte) => void;
  onLimpar: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40">
      <button aria-hidden onClick={onClose} className="flex-1 cursor-default" />
      <div className="flex h-full w-[380px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borda px-5 py-4">
          <h3 className="font-display text-[15px] font-bold text-indigo-deep">Filtros</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <CampoF label="Segmento / categoria"><SelectF value={f.segmento} onChange={(v) => set("segmento", v)} options={segmentos} /></CampoF>
          <CampoF label="Objeto / palavras-chave"><input className={inputF} value={f.objeto} onChange={(e) => set("objeto", e.target.value)} placeholder="ex.: hospitalar, informática" /></CampoF>
          <CampoF label="Empresa (fornecedor)"><input className={inputF} value={f.empresa} onChange={(e) => set("empresa", e.target.value)} placeholder="Nome do fornecedor" /></CampoF>
          <CampoF label="CNPJ do fornecedor"><input className={inputF} value={f.cnpjForn} onChange={(e) => set("cnpjForn", e.target.value)} placeholder="00.000.000/0000-00" /></CampoF>
          <CampoF label="CNPJ do órgão"><input className={inputF} value={f.cnpjOrgao} onChange={(e) => set("cnpjOrgao", e.target.value)} placeholder="00.000.000/0000-00" /></CampoF>
          <div className="grid grid-cols-2 gap-3">
            <CampoF label="UF"><SelectF value={f.uf} onChange={(v) => set("uf", v)} options={ufs} /></CampoF>
            <CampoF label="Porte"><SelectF value={f.porte} onChange={(v) => set("porte", v)} options={portes} /></CampoF>
          </div>

          <CampoF label="Tipo">
            <div className="flex gap-2">
              {["Todos", "Material", "Serviço"].map((t) => (
                <button key={t} onClick={() => set("tipo", t)} className={["flex-1 rounded-lg border px-2 py-2 font-display text-[12.5px] font-semibold transition", f.tipo === t ? "border-transparent bg-indigo-deep text-white" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>{t}</button>
              ))}
            </div>
          </CampoF>

          <CampoF label="Faixa de preço unitário">
            <div className="flex items-center gap-2">
              <input className={inputF} value={f.precoMin} onChange={(e) => set("precoMin", e.target.value)} placeholder="Mínimo" />
              <span className="text-cinza">até</span>
              <input className={inputF} value={f.precoMax} onChange={(e) => set("precoMax", e.target.value)} placeholder="Máximo" />
            </div>
          </CampoF>

          <CampoF label="Período">
            <SelectF value={String(f.periodo)} onChange={(v) => set("periodo", Number(v))} options={["6", "12", "24", "36"]} sufixo=" meses" />
          </CampoF>

          <div>
            <label className="mb-2 block font-display text-[12.5px] font-semibold text-indigo-deep">Fonte de dados</label>
            {([["homologados", "Preços homologados"], ["atas", "Atas de Registro de Preço"], ["contratos", "Contratos em vigor"]] as [Fonte, string][]).map(([id, label]) => (
              <label key={id} className="mt-1.5 flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                <input type="checkbox" checked={fontes.has(id)} onChange={() => toggleFonte(id)} className="h-4 w-4 accent-violeta" />
                {label}
              </label>
            ))}
          </div>

          <label className="flex cursor-pointer items-center justify-between text-[13px] font-medium text-ink">
            Apenas Registro de Preço
            <button
              type="button"
              onClick={() => set("apenasSRP", !f.apenasSRP)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition"
              style={{ background: f.apenasSRP ? "#16A34A" : "#CBD5E1" }}
            >
              <span className="absolute h-4 w-4 rounded-full bg-white transition-all" style={{ left: f.apenasSRP ? "18px" : "2px" }} />
            </button>
          </label>
        </div>

        <div className="flex gap-3 border-t border-borda p-4">
          <button onClick={onLimpar} className="rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-cinza transition hover:border-violeta hover:text-violeta">Limpar</button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-violeta py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo">Aplicar filtros</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function CampoF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-display text-[12.5px] font-semibold text-indigo-deep">{label}</label>
      {children}
    </div>
  );
}

function SelectF({ value, onChange, options, sufixo = "" }: { value: string; onChange: (v: string) => void; options: string[]; sufixo?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputF + " appearance-none"}>
        {options.map((o) => <option key={o} value={o}>{o}{sufixo}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
    </div>
  );
}

function AbaBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={["rounded-xl border px-4 py-2.5 font-display text-[13px] font-semibold transition", ativo ? "border-transparent bg-indigo-deep text-white" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>
      {children}
    </button>
  );
}

function KPI({ label, valor, destaque, cor }: { label: string; valor: string; destaque?: boolean; cor?: string }) {
  return (
    <div className={["rounded-xl border p-4", destaque ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white"].join(" ")}>
      <div className="text-[11.5px] text-cinza">{label}</div>
      <div className="mt-1 font-display text-[20px] font-bold" style={{ color: cor ?? "#1E1B4B" }}>{valor}</div>
    </div>
  );
}
