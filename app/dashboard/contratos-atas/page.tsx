"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Radar,
  Bell,
  Clock,
  Plus,
  X,
  Building2,
  MapPin,
  Trophy,
  ExternalLink,
  FileCheck2,
  Paperclip,
  Trash2,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const HOJE = new Date(2026, 5, 30);
function diasAte(s: string) {
  const [d, m, y] = s.split("/").map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - HOJE.getTime()) / 86400000);
}
function urg(dias: number) {
  if (dias <= 15) return { c: "#DC2626", bg: "#FDE7E7" };
  if (dias <= 45) return { c: "#B45309", bg: "#FEF3E2" };
  return { c: "#15803D", bg: "#DCFCE7" };
}

type Vencendo = {
  orgao: string; uf: string; objeto: string; categoria: string; tipoReg: "Contrato" | "Ata SRP";
  incumbente: string; valor: number; vencimento: string;
};
const vencendo: Vencendo[] = [
  { orgao: "IFES", uf: "ES", objeto: "Mobiliário — cadeiras e mesas", categoria: "Mobiliário", tipoReg: "Contrato", incumbente: "ErgoOffice", valor: 540000, vencimento: "15/07/2026" },
  { orgao: "TJ-ES", uf: "ES", objeto: "Notebooks i5 (registro de preços)", categoria: "Informática", tipoReg: "Ata SRP", incumbente: "Distribuidora ABC", valor: 4200000, vencimento: "22/07/2026" },
  { orgao: "Prefeitura da Serra", uf: "ES", objeto: "Manutenção de elevadores", categoria: "Serviços", tipoReg: "Contrato", incumbente: "MegaSupri", valor: 554160, vencimento: "29/07/2026" },
  { orgao: "Prefeitura de Cariacica", uf: "ES", objeto: "Medicamentos da farmácia hospitalar", categoria: "Saúde", tipoReg: "Contrato", incumbente: "Papelaria Central LTDA", valor: 2100000, vencimento: "12/08/2026" },
  { orgao: "Prefeitura de Vitória", uf: "ES", objeto: "Papel A4 (registro de preços)", categoria: "Material de escritório", tipoReg: "Ata SRP", incumbente: "Papelaria Central LTDA", valor: 88000, vencimento: "27/08/2026" },
  { orgao: "Governo do ES — SESA", uf: "ES", objeto: "Limpeza e conservação predial", categoria: "Serviços", tipoReg: "Contrato", incumbente: "Conserva Master", valor: 3850000, vencimento: "30/09/2026" },
  { orgao: "Câmara Municipal de X", uf: "MG", objeto: "Serviço de vigilância", categoria: "Serviços", tipoReg: "Contrato", incumbente: "Fornecedor Único ME", valor: 240000, vencimento: "10/10/2026" },
];

const categorias = ["Todas", "Saúde", "Informática", "Serviços", "Mobiliário", "Material de escritório"];
const ufs = ["Todas", "ES", "MG", "SP", "BA"];
const prazos: [string, number][] = [["Todos", 9999], ["≤ 30 dias", 30], ["≤ 60 dias", 60], ["≤ 90 dias", 90], ["≤ 180 dias", 180]];

type Registro = { numero: string; orgao: string; objeto: string; valor: number; vencimento: string; saldo: number; origem: "PNCP" | "Manual" };

export default function ContratosAtasPage() {
  const [aba, setAba] = useState<"vencendo" | "contratos" | "atas">("vencendo");
  const [modal, setModal] = useState(false);
  const [contratos, setContratos] = useState<Registro[]>([
    { numero: "Contrato 045/2025", orgao: "Pref. de Vitória", objeto: "Material de informática", valor: 420000, vencimento: "30/11/2026", saldo: 38, origem: "PNCP" },
  ]);
  const [atas, setAtas] = useState<Registro[]>([
    { numero: "Ata 012/2026", orgao: "IFES", objeto: "Papel A4 — resma", valor: 88000, vencimento: "15/02/2027", saldo: 62, origem: "PNCP" },
  ]);

  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">Contratos e Atas</h1>
        <p className="mt-1 max-w-[660px] text-[13.5px] text-cinza">
          Gerencie seus contratos e atas — e, principalmente, veja os <b>contratos e atas vencendo no mercado</b>: cada um é a janela para um novo edital antes dele existir.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <AbaBtn ativo={aba === "vencendo"} onClick={() => setAba("vencendo")}>Vencendo (oportunidades)</AbaBtn>
        <AbaBtn ativo={aba === "contratos"} onClick={() => setAba("contratos")}>Meus contratos</AbaBtn>
        <AbaBtn ativo={aba === "atas"} onClick={() => setAba("atas")}>Minhas atas</AbaBtn>
      </div>

      {aba === "vencendo" && <Vencendo />}
      {aba === "contratos" && <MeusRegistros titulo="Meus contratos" tipo="Contrato" itens={contratos} onAdd={() => setModal(true)} />}
      {aba === "atas" && <MeusRegistros titulo="Minhas atas de registro de preço" tipo="Ata" itens={atas} onAdd={() => setModal(true)} />}

      {modal && (
        <AddModal
          tipo={aba === "atas" ? "Ata" : "Contrato"}
          onClose={() => setModal(false)}
          onSalvar={(r) => {
            if (aba === "atas") setAtas((a) => [...a, r]);
            else setContratos((c) => [...c, r]);
            setModal(false);
          }}
        />
      )}
    </>
  );
}

/* ---------- VENCENDO (o trunfo) ---------- */

function Vencendo() {
  const [termo, setTermo] = useState("");
  const [cat, setCat] = useState("Todas");
  const [uf, setUf] = useState("Todas");
  const [prazo, setPrazo] = useState(9999);
  const [seguidos, setSeguidos] = useState<Set<string>>(new Set());

  const lista = vencendo
    .map((v) => ({ ...v, dias: diasAte(v.vencimento) }))
    .filter((v) => !termo || v.objeto.toLowerCase().includes(termo.toLowerCase()) || v.orgao.toLowerCase().includes(termo.toLowerCase()) || v.incumbente.toLowerCase().includes(termo.toLowerCase()))
    .filter((v) => cat === "Todas" || v.categoria === cat)
    .filter((v) => uf === "Todas" || v.uf === uf)
    .filter((v) => v.dias <= prazo)
    .sort((a, b) => a.dias - b.dias);

  const valorJogo = lista.reduce((s, v) => s + v.valor, 0);
  const ate30 = lista.filter((v) => v.dias <= 30).length;
  const ate90 = lista.filter((v) => v.dias <= 90).length;

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Vencendo em ≤30 dias" valor={String(ate30)} cor="#DC2626" />
        <KPI label="Vencendo em ≤90 dias" valor={String(ate90)} />
        <KPI label="Valor em jogo" valor={brl(valorJogo)} destaque />
        <KPI label="Órgãos" valor={String(new Set(lista.map((v) => v.orgao)).size)} />
      </div>

      {/* filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-borda bg-white p-4">
        <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-borda px-3 text-cinza focus-within:border-violeta">
          <Search size={15} />
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por objeto, órgão ou fornecedor atual" className="flex-1 bg-transparent text-[13px] text-ink outline-none" />
        </div>
        <Sel label="Categoria" value={cat} onChange={setCat} options={categorias} />
        <Sel label="UF" value={uf} onChange={setUf} options={ufs} />
        <Sel label="Prazo" value={String(prazo)} onChange={(v) => setPrazo(Number(v))} options={prazos.map(([t, n]) => [String(n), t])} />
      </div>

      <p className="text-[13px] text-cinza"><b className="font-display font-bold text-indigo-deep">{lista.length}</b> contratos/atas vencendo</p>

      <div className="space-y-3">
        {lista.map((v, i) => {
          const u = urg(v.dias);
          const seg = seguidos.has(v.orgao + i);
          return (
            <div key={i} className="rounded-2xl border border-borda bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 font-display text-[11px] font-semibold text-indigo-deep">{v.categoria}</span>
                <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-medium text-cinza">{v.tipoReg}</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold" style={{ background: u.bg, color: u.c }}>
                  <Clock size={12} /> vence em {v.dias} dias · {v.vencimento}
                </span>
              </div>

              <h3 className="mt-2.5 font-display text-[15px] font-semibold leading-snug text-indigo-deep">{v.objeto}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cinza">
                <span className="flex items-center gap-1"><Building2 size={12} /> {v.orgao}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {v.uf}</span>
                <span className="flex items-center gap-1"><Trophy size={12} className="text-laranja" /> Fornecedor atual: {v.incumbente}</span>
                <span className="font-display font-semibold text-indigo-deep">{brl(v.valor)}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <a href="/dashboard/raio-x" className="flex items-center gap-2 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"><Radar size={15} /> Cruzar com Raio-X</a>
                <button
                  onClick={() => setSeguidos((s) => { const n = new Set(s); const k = v.orgao + i; if (n.has(k)) n.delete(k); else n.add(k); return n; })}
                  className={["flex items-center gap-2 rounded-lg border px-4 py-2.5 font-display text-[13px] font-semibold transition", seg ? "border-violeta bg-[#F5F3FF] text-violeta" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}
                >
                  <Bell size={15} /> {seg ? "Acompanhando" : "Avisar quando abrir edital"}
                </button>
                <a href="#" className="ml-auto flex items-center gap-1.5 self-center text-[12.5px] font-semibold text-violeta">Ver no PNCP <ExternalLink size={13} /></a>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <div className="rounded-2xl border border-dashed border-borda bg-white py-14 text-center text-[13px] text-cinza">Nenhum contrato/ata vencendo com esses filtros.</div>}
      </div>

      <p className="text-[12px] text-cinza">Carregados automaticamente do PNCP (contratos e atas com vigência terminando). Dados de exemplo.</p>
    </div>
  );
}

/* ---------- MEUS CONTRATOS / ATAS ---------- */

function MeusRegistros({ titulo, tipo, itens, onAdd }: { titulo: string; tipo: "Contrato" | "Ata"; itens: Registro[]; onAdd: () => void }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold text-indigo-deep">{titulo}</h2>
        <button onClick={onAdd} className="flex items-center gap-2 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"><Plus size={15} /> Adicionar {tipo.toLowerCase()}</button>
      </div>

      <div className="space-y-3">
        {itens.map((r, i) => {
          const dias = diasAte(r.vencimento);
          const u = urg(dias);
          return (
            <div key={i} className="rounded-2xl border border-borda bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <FileCheck2 size={16} className="text-violeta" />
                <span className="font-display text-[14px] font-semibold text-indigo-deep">{r.numero}</span>
                <span className="rounded-full px-2 py-0.5 font-display text-[10px] font-bold" style={{ background: r.origem === "PNCP" ? "#DBEAFE" : "#F1F5F9", color: r.origem === "PNCP" ? "#1E40AF" : "#64748B" }}>{r.origem === "PNCP" ? "via PNCP" : "manual"}</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold" style={{ background: u.bg, color: u.c }}><Clock size={12} /> vence {r.vencimento} ({dias}d)</span>
              </div>
              <p className="mt-2 text-[13px] text-ink">{r.objeto} · <span className="text-cinza">{r.orgao}</span></p>
              <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
                <Meta label="Valor global" valor={brl(r.valor)} />
                <Meta label="Vigência até" valor={r.vencimento} />
                <div>
                  <div className="text-[11px] text-cinza">Saldo</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-violeta" style={{ width: `${r.saldo}%` }} /></div>
                    <span className="font-display text-[12px] font-semibold text-indigo-deep">{r.saldo}%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {itens.length === 0 && <div className="rounded-2xl border border-dashed border-borda bg-white py-14 text-center text-[13px] text-cinza">Nenhum registro ainda. Adicione manualmente ou aguarde o carregamento automático via PNCP.</div>}
      </div>
    </div>
  );
}

/* ---------- MODAL ADICIONAR ---------- */

const inp = "h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta";

type ItemForm = { descricao: string; marca: string; modelo: string; unidade: string; qtd: string; valorUnit: string };
const itemVazio: ItemForm = { descricao: "", marca: "", modelo: "", unidade: "", qtd: "", valorUnit: "" };
const licitacoesRel = ["Pregão 011/2026 — Rurópolis", "Dispensa 39/2026 — FUNAI", "Concorrência 091/2026 — Bahia", "Pregão 045/2026 — Educação Vitória"];

function AddModal({ tipo, onClose, onSalvar }: { tipo: "Contrato" | "Ata"; onClose: () => void; onSalvar: (r: Registro) => void }) {
  const rotulo = tipo.toLowerCase();
  const [licitacao, setLicitacao] = useState("");
  const [numero, setNumero] = useState("");
  const [dataDoc, setDataDoc] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [vigIni, setVigIni] = useState("");
  const [vigFim, setVigFim] = useState("");
  const [viabilidade, setViabilidade] = useState("");
  const [obs, setObs] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [entregaUteis, setEntregaUteis] = useState(false);
  const [prazoPgto, setPrazoPgto] = useState("");
  const [pgtoUteis, setPgtoUteis] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([]);

  const total = itens.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valorUnit.replace(",", ".")) || 0), 0);

  function setItem(i: number, k: keyof ItemForm, v: string) {
    setItens((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  }
  function salvar() {
    if (!numero.trim() || !dataDoc) return;
    const venc = vigFim || dataDoc;
    const [y, m, d] = venc.split("-");
    onSalvar({
      numero: `${tipo} ${numero}`,
      orgao: licitacao || "—",
      objeto: obs || itens[0]?.descricao || "—",
      valor: Math.round(total),
      vencimento: `${d}/${m}/${y}`,
      saldo: 100,
      origem: "Manual",
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-[760px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borda px-6 py-4">
          <h3 className="font-display text-[16px] font-bold text-indigo-deep">Adicionar {tipo}</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <Campo label="Licitação relacionada">
            <div className="relative">
              <select value={licitacao} onChange={(e) => setLicitacao(e.target.value)} className={inp + " appearance-none"}>
                <option value="">Selecione uma licitação (opcional)</option>
                {licitacoesRel.map((l) => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
            </div>
          </Campo>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label={`Nº do ${rotulo} *`}><input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 001/2026" className={inp} /></Campo>
            <Campo label={`Data do ${rotulo} *`}><input type="date" value={dataDoc} onChange={(e) => setDataDoc(e.target.value)} className={inp} /></Campo>
            <Campo label={`Arquivo do ${rotulo}`}>
              <button className="flex h-11 w-full items-center gap-2 rounded-lg border border-borda px-3 text-[13px] font-medium text-violeta transition hover:border-violeta"><Paperclip size={15} /> Selecionar arquivo</button>
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Data de assinatura"><input type="date" value={assinatura} onChange={(e) => setAssinatura(e.target.value)} className={inp} /></Campo>
            <Campo label="Vigência início"><input type="date" value={vigIni} onChange={(e) => setVigIni(e.target.value)} className={inp} /></Campo>
            <Campo label="Vigência fim"><input type="date" value={vigFim} onChange={(e) => setVigFim(e.target.value)} className={inp} /></Campo>
          </div>

          <div className="max-w-[240px]">
            <Campo label="Viabilidade">
              <div className="relative">
                <select value={viabilidade} onChange={(e) => setViabilidade(e.target.value)} className={inp + " appearance-none"}>
                  <option value="">Selecione</option>
                  <option>Viável</option>
                  <option>Atenção</option>
                  <option>Inviável</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
              </div>
            </Campo>
          </div>

          <Campo label="Observações"><textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder={`Observações sobre o ${rotulo}…`} className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-violeta" /></Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Prazo de entrega">
              <div className="flex items-center gap-2">
                <input value={prazoEntrega} onChange={(e) => setPrazoEntrega(e.target.value)} placeholder="Ex: 15 dias" className={inp} />
                <label className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-cinza"><input type="checkbox" checked={entregaUteis} onChange={(e) => setEntregaUteis(e.target.checked)} className="h-4 w-4 accent-violeta" /> Úteis</label>
              </div>
            </Campo>
            <Campo label="Prazo de pagamento">
              <div className="flex items-center gap-2">
                <input value={prazoPgto} onChange={(e) => setPrazoPgto(e.target.value)} placeholder="Ex: 30 dias" className={inp} />
                <label className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-cinza"><input type="checkbox" checked={pgtoUteis} onChange={(e) => setPgtoUteis(e.target.checked)} className="h-4 w-4 accent-violeta" /> Úteis</label>
              </div>
            </Campo>
          </div>

          <div className="border-t border-borda pt-4">
            <h4 className="mb-3 font-display text-[13px] font-semibold text-indigo-deep">Dados de contato</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Telefone"><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(99) 99999-9999" className={inp} /></Campo>
              <Campo label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inp} /></Campo>
            </div>
          </div>

          {/* itens */}
          <div className="border-t border-borda pt-4">
            <h4 className="mb-2 font-display text-[13px] font-semibold text-indigo-deep">Itens do {rotulo}</h4>
            {itens.length === 0 ? (
              <div className="rounded-lg border border-borda py-6 text-center text-[12.5px] text-cinza">Nenhum item adicionado</div>
            ) : (
              <div className="space-y-2">
                {itens.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-1.5">
                    <input value={it.descricao} onChange={(e) => setItem(i, "descricao", e.target.value)} placeholder="Descrição" className="col-span-4 h-9 rounded-lg border border-borda px-2 text-[12px] outline-none focus:border-violeta" />
                    <input value={it.unidade} onChange={(e) => setItem(i, "unidade", e.target.value)} placeholder="Un." className="col-span-2 h-9 rounded-lg border border-borda px-2 text-[12px] outline-none focus:border-violeta" />
                    <input value={it.qtd} onChange={(e) => setItem(i, "qtd", e.target.value)} placeholder="Qtd" className="col-span-2 h-9 rounded-lg border border-borda px-2 text-[12px] outline-none focus:border-violeta" />
                    <input value={it.valorUnit} onChange={(e) => setItem(i, "valorUnit", e.target.value)} placeholder="Valor un." className="col-span-3 h-9 rounded-lg border border-borda px-2 text-[12px] outline-none focus:border-violeta" />
                    <button onClick={() => setItens((a) => a.filter((_, idx) => idx !== i))} aria-label="Remover" className="col-span-1 grid h-9 place-items-center text-cinza hover:text-vermelho"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => setItens((a) => [...a, { ...itemVazio }])} className="flex items-center gap-1.5 rounded-lg border border-borda px-3 py-2 font-display text-[12.5px] font-semibold text-violeta transition hover:border-violeta"><Plus size={14} /> Adicionar item</button>
              <span className="font-display text-[13px] font-semibold text-indigo-deep">Valor total do {rotulo}: {brl(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-borda p-4">
          <button onClick={salvar} className="rounded-xl bg-laranja px-8 py-3 font-display text-[14px] font-semibold text-white transition hover:bg-laranja-hover">Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function AbaBtn({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={["rounded-xl border px-4 py-2.5 font-display text-[13px] font-semibold transition", ativo ? "border-transparent bg-indigo-deep text-white" : "border-borda bg-white text-indigo-deep hover:border-violeta"].join(" ")}>{children}</button>;
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block font-display text-[12.5px] font-semibold text-indigo-deep">{label}</label>{children}</div>;
}
function Meta({ label, valor }: { label: string; valor: string }) {
  return <div><div className="text-[11px] text-cinza">{label}</div><div className="mt-0.5 font-display text-[13px] font-semibold text-indigo-deep">{valor}</div></div>;
}
function KPI({ label, valor, destaque, cor }: { label: string; valor: string; destaque?: boolean; cor?: string }) {
  return <div className={["rounded-xl border p-4", destaque ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white"].join(" ")}><div className="text-[11.5px] text-cinza">{label}</div><div className="mt-1 font-display text-[20px] font-bold" style={{ color: cor ?? "#1E1B4B" }}>{valor}</div></div>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | [string, string])[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-10 appearance-none rounded-lg border border-borda bg-white pl-3 pr-8 text-[12.5px] font-medium text-indigo-deep outline-none focus:border-violeta">
        {options.map((o) => {
          const val = Array.isArray(o) ? o[0] : o;
          const txt = Array.isArray(o) ? o[1] : o;
          const pre = val === "Todas" || val === "Todos" ? `${label}: ` : "";
          return <option key={val} value={val}>{pre}{txt}</option>;
        })}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cinza" />
    </div>
  );
}
