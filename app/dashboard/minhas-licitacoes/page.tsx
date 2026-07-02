"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Table as TableIcon,
  Columns3,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  Plus,
  FileText,
  FolderPlus,
  Filter,
  Download,
  Upload,
  X,
  Sparkles,
  Trash2,
  GripVertical,
  UploadCloud,
  HelpCircle,
} from "lucide-react";

type Status =
  | "Análise"
  | "Recebendo Proposta"
  | "Fase de Lance"
  | "Sessão Pública"
  | "Homologada"
  | "Desistida";

const statusOrdem: Status[] = [
  "Análise",
  "Recebendo Proposta",
  "Fase de Lance",
  "Sessão Pública",
  "Homologada",
  "Desistida",
];
const statusCor: Record<Status, { dot: string; tint: string; texto: string }> = {
  "Análise": { dot: "#5B21B6", tint: "#EDE7FB", texto: "#5B21B6" },
  "Recebendo Proposta": { dot: "#FF6600", tint: "#FFE9D6", texto: "#B45309" },
  "Fase de Lance": { dot: "#16A34A", tint: "#DCFCE7", texto: "#15803D" },
  "Sessão Pública": { dot: "#2563EB", tint: "#DBEAFE", texto: "#1E40AF" },
  "Homologada": { dot: "#0F766E", tint: "#CCFBF1", texto: "#0F766E" },
  "Desistida": { dot: "#DC2626", tint: "#FDE7E7", texto: "#B91C1C" },
};

type Item = {
  id: string;
  titulo: string;
  orgao: string;
  uf: string;
  objeto: string;
  valor: string;
  abertura: string;
  portal: string;
  status: Status;
  tag?: string;
};

const iniciais: Item[] = [
  { id: "1", titulo: "Pregão 011/2026", orgao: "Pref. de Rurópolis", uf: "PA", objeto: "Medicamentos da farmácia hospitalar", valor: "R$ 10.347.610,28", abertura: "13/07/2026", portal: "Compras Públicas", status: "Análise", tag: "Margem Alta" },
  { id: "2", titulo: "Pregão 045/2026", orgao: "Educação de Vitória", uf: "ES", objeto: "Material de informática e expediente", valor: "R$ 845.200,00", abertura: "11/07/2026", portal: "Licitações-e", status: "Análise" },
  { id: "3", titulo: "Dispensa 39/2026", orgao: "FUNAI", uf: "BA", objeto: "Serviço de internet emergencial", valor: "R$ 3.000,00", abertura: "03/07/2026", portal: "Comprasnet", status: "Recebendo Proposta", tag: "Urgente" },
  { id: "4", titulo: "Concorrência 091/2026", orgao: "Estado da Bahia", uf: "BA", objeto: "Pavimentação de trecho (14 km)", valor: "R$ 16.442.313,38", abertura: "15/07/2026", portal: "BLL", status: "Fase de Lance" },
  { id: "5", titulo: "Pregão PE046/2026", orgao: "Município de São Carlos", uf: "SP", objeto: "Sinalização de trânsito", valor: "R$ 37.830.724,61", abertura: "16/07/2026", portal: "Licitações-e", status: "Sessão Pública" },
  { id: "6", titulo: "Pregão 023/2026", orgao: "SESA — Bahia", uf: "BA", objeto: "Material médico-hospitalar", valor: "R$ 329.400,00", abertura: "17/07/2026", portal: "BNC", status: "Homologada" },
  { id: "7", titulo: "Concorrência 004/2026", orgao: "Senador La Rocque", uf: "MA", objeto: "Construção de unidades habitacionais", valor: "R$ 2.730.000,00", abertura: "13/07/2026", portal: "Compras Públicas", status: "Desistida" },
];

type View = "cards" | "tabela" | "kanban";

export default function MinhasLicitacoesPage() {
  const [view, setView] = useState<View>("cards");
  const [itens, setItens] = useState<Item[]>(iniciais);
  const [statusFiltro, setStatusFiltro] = useState<Status | null>(null);
  const [modal, setModal] = useState(false);
  const [arrastado, setArrastado] = useState<string | null>(null);

  function mover(id: string, novo: Status) {
    setItens((arr) => arr.map((i) => (i.id === id ? { ...i, status: novo } : i)));
    setArrastado(null);
  }

  return (
    <>
      {/* cabeçalho + toggle */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1 className="font-display text-[22px] font-bold text-indigo-deep">Minhas Licitações</h1>
          <p className="mt-1 max-w-[600px] text-[13.5px] text-cinza">
            Gerencie e acompanhe as licitações que está participando — datas, pendências e detalhes de cada item.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-borda bg-white p-1">
          <ViewBtn ativo={view === "cards"} onClick={() => setView("cards")} icon={<LayoutGrid size={16} />} />
          <ViewBtn ativo={view === "tabela"} onClick={() => setView("tabela")} icon={<TableIcon size={16} />} />
          <ViewBtn ativo={view === "kanban"} onClick={() => setView("kanban")} icon={<Columns3 size={16} />} />
        </div>
      </div>

      {view === "cards" && (
        <CardsView
          itens={itens}
          statusFiltro={statusFiltro}
          setStatusFiltro={setStatusFiltro}
          onAddExterno={() => setModal(true)}
        />
      )}
      {view === "tabela" && <TabelaView itens={itens} />}
      {view === "kanban" && (
        <KanbanView itens={itens} arrastado={arrastado} setArrastado={setArrastado} mover={mover} />
      )}

      {modal && <ProcessoExternoModal onClose={() => setModal(false)} />}

      <p className="mt-4 text-center text-[12px] text-cinza">
        Dados de exemplo. No Kanban, arraste os cards entre as etapas. O pipeline real é populado ao conectar o banco.
      </p>
    </>
  );
}

/* ---------- CARDS (por status) ---------- */

function CardsView({
  itens,
  statusFiltro,
  setStatusFiltro,
  onAddExterno,
}: {
  itens: Item[];
  statusFiltro: Status | null;
  setStatusFiltro: (s: Status | null) => void;
  onAddExterno: () => void;
}) {
  const lista = statusFiltro ? itens.filter((i) => i.status === statusFiltro) : itens;
  const [sel, setSel] = useState<Set<string>>(new Set());
  const todas = lista.length > 0 && lista.every((i) => sel.has(i.id));
  const toggleTudo = () => setSel(todas ? new Set() : new Set(lista.map((i) => i.id)));
  const toggleUm = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <>
      <div className="mt-5 flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
        <input placeholder="Pesquise a licitação pelo código ou nome do órgão" className="flex-1 bg-transparent text-sm text-ink outline-none" />
        <Search size={18} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statusOrdem.map((s) => {
          const ativo = statusFiltro === s;
          const desistida = s === "Desistida";
          return (
            <button
              key={s}
              onClick={() => setStatusFiltro(ativo ? null : s)}
              className={[
                "rounded-full border px-3.5 py-2 font-display text-[12.5px] font-semibold transition",
                ativo ? "border-transparent bg-indigo-deep text-white" : desistida ? "border-vermelho/40 text-vermelho hover:bg-vermelho/5" : "border-borda bg-white text-indigo-deep hover:border-violeta",
              ].join(" ")}
            >
              {s} <span className={ativo ? "ml-1 opacity-80" : "ml-1 text-cinza"}>{itens.filter((i) => i.status === s).length}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pill icon={<ChevronDown size={14} className="text-cinza" />}>Abertura</Pill>
        <DatePicker />
        <Pill icon={<ChevronDown size={14} className="text-cinza" />}>Portais: Todos</Pill>
        <label className="flex items-center gap-2 text-[13px] text-cinza">
          <input type="checkbox" className="h-4 w-4 accent-violeta" checked={todas} onChange={toggleTudo} />
          Selecionar tudo
          {sel.size > 0 && <span className="font-semibold text-violeta">({sel.size})</span>}
        </label>
        <div className="ml-auto"><Pill icon={<ChevronDown size={14} className="text-cinza" />}>Ordenar: Abertura mais próxima</Pill></div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          {lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-white py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8]"><FileText size={22} /></span>
              <p className="font-display text-[15px] font-semibold text-indigo-deep">Nenhuma licitação neste status</p>
              <p className="text-[13px] text-cinza">Encontre novas oportunidades — quanto mais participações, mais chances de ganhar!</p>
              <a href="/dashboard/pesquisar-licitacoes" className="mt-2 rounded-lg bg-laranja px-5 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">Pesquisar Licitações</a>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {lista.map((i) => (
                <CardItem key={i.id} i={i} selecionavel selecionado={sel.has(i.id)} onToggleSel={() => toggleUm(i.id)} />
              ))}
            </div>
          )}
        </div>
        <Aside onAddExterno={onAddExterno} />
      </div>
    </>
  );
}

function Aside({ onAddExterno }: { onAddExterno: () => void }) {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-borda bg-white p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFE9D6] text-laranja"><Tag size={14} /></span>
          <h3 className="font-display text-[14px] font-semibold text-indigo-deep">Tags de controle</h3>
        </div>
        <p className="mb-3 text-[12.5px] text-cinza">Crie categorias para identificar e organizar suas participações.</p>
        <label className="flex items-center gap-2 text-[13px] text-ink"><input type="checkbox" className="h-4 w-4 accent-violeta" /> Sem tags</label>
        <button className="mt-3 text-[13px] font-semibold text-violeta">Gerenciar tags</button>
      </div>
      <div className="rounded-2xl border border-borda bg-white p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#EDE7FB] text-violeta"><FolderPlus size={14} /></span>
          <h3 className="font-display text-[14px] font-semibold text-indigo-deep">Adicionar Processo Externo</h3>
        </div>
        <p className="mb-3 text-[12.5px] text-cinza">Adicione um processo de licitação externo para gerenciar junto.</p>
        <button onClick={onAddExterno} className="flex items-center gap-1.5 text-[13px] font-semibold text-violeta"><Plus size={15} /> Adicionar processo</button>
      </div>
    </aside>
  );
}

function CardItem({
  i,
  draggable,
  onDragStart,
  selecionavel,
  selecionado,
  onToggleSel,
}: {
  i: Item;
  draggable?: boolean;
  onDragStart?: () => void;
  selecionavel?: boolean;
  selecionado?: boolean;
  onToggleSel?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={["rounded-xl border bg-white p-3.5", draggable ? "cursor-grab active:cursor-grabbing" : "", selecionado ? "border-violeta ring-2 ring-violeta/20" : "border-borda"].join(" ")}
    >
      <div className="flex items-center gap-2">
        {selecionavel && (
          <input type="checkbox" checked={!!selecionado} onChange={onToggleSel} className="h-4 w-4 accent-violeta" />
        )}
        {draggable && <GripVertical size={14} className="text-[#CBD5E1]" />}
        <span className="flex items-center gap-1 rounded-full bg-[#FFE9D6] px-2 py-0.5 font-display text-[10px] font-semibold text-[#B45309]"><FileText size={10} /> {i.portal}</span>
        {i.tag && <span className="ml-auto rounded-full bg-[#EDE7FB] px-2 py-0.5 font-display text-[10px] font-bold text-violeta">{i.tag}</span>}
      </div>
      <h4 className="mt-2 font-display text-[13px] font-semibold leading-snug text-indigo-deep">{i.titulo} — {i.orgao}/{i.uf}</h4>
      <p className="mt-1 line-clamp-2 text-[12px] text-cinza">{i.objeto}</p>
      <div className="mt-2.5 flex items-center justify-between border-t border-borda pt-2 text-[11.5px]">
        <span className="text-cinza">Abertura {i.abertura}</span>
        <span className="font-display font-semibold text-indigo-deep">{i.valor}</span>
      </div>
    </div>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep">
      {icon}
      {children}
    </button>
  );
}

function ViewBtn({ ativo, onClick, icon }: { ativo: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={["grid h-8 w-8 place-items-center rounded-md transition", ativo ? "bg-indigo-deep text-white" : "text-cinza hover:bg-[#F1F5F9]"].join(" ")}>
      {icon}
    </button>
  );
}

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function DatePicker() {
  const [open, setOpen] = useState(false);
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(5); // Junho (0-indexado)
  const [sel, setSel] = useState<string | null>(null);
  const [rotulo, setRotulo] = useState("Selecione uma data");

  const prox = mes === 11 ? { ano: ano + 1, mes: 0 } : { ano, mes: mes + 1 };

  function navega(delta: number) {
    let m = mes + delta;
    let a = ano;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setMes(m);
    setAno(a);
  }
  function pick(a: number, m: number, d: number) {
    setSel(`${a}-${m}-${d}`);
    setRotulo(`${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${a}`);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep">
        <Calendar size={14} className="text-cinza" /> {rotulo}
      </button>
      {open && (
        <>
          <button aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-[55] cursor-default" />
          <div className="absolute left-0 top-[calc(100%+8px)] z-[60] flex gap-4 rounded-2xl border border-borda bg-white p-4 shadow-2xl">
            <div className="flex w-[150px] flex-col gap-2 border-r border-borda pr-4">
              <span className="font-display text-[12px] font-semibold text-indigo-deep">Período</span>
              {["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias"].map((q) => (
                <button key={q} onClick={() => { setRotulo(q); setSel(null); setOpen(false); }} className="rounded-full border border-borda px-3 py-1.5 text-[12.5px] text-indigo-deep transition hover:border-violeta">
                  {q}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => navega(-1)} className="text-cinza hover:text-violeta"><ChevronLeft size={16} /></button>
                <div className="flex gap-12 font-display text-[13px] font-semibold text-indigo-deep">
                  <span>{meses[mes]} {ano}</span>
                  <span>{meses[prox.mes]} {prox.ano}</span>
                </div>
                <button onClick={() => navega(1)} className="text-cinza hover:text-violeta"><ChevronRight size={16} /></button>
              </div>
              <div className="flex gap-6">
                <MonthGrid ano={ano} mes={mes} sel={sel} onPick={(d) => pick(ano, mes, d)} />
                <MonthGrid ano={prox.ano} mes={prox.mes} sel={sel} onPick={(d) => pick(prox.ano, prox.mes, d)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MonthGrid({ ano, mes, sel, onPick }: { ano: number; mes: number; sel: string | null; onPick: (d: number) => void }) {
  const inicio = new Date(ano, mes, 1).getDay();
  const total = new Date(ano, mes + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < inicio; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  const hoje = ano === 2026 && mes === 5 ? 29 : -1;
  return (
    <div className="w-[200px]">
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-cinza">
        {semana.map((s) => <span key={s}>{s}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[12.5px]">
        {cells.map((d, idx) =>
          d === null ? (
            <span key={idx} />
          ) : (
            <button
              key={idx}
              onClick={() => onPick(d)}
              className={["mx-auto grid h-7 w-7 place-items-center rounded-full transition", sel === `${ano}-${mes}-${d}` ? "bg-violeta text-white" : d === hoje ? "font-bold text-laranja" : "text-ink hover:bg-[#F1F5F9]"].join(" ")}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}

/* ---------- TABELA (data-grid) ---------- */

function TabelaView({ itens }: { itens: Item[] }) {
  const cols = ["Portal", "Título", "Órgão", "UF", "Fase", "Tags", "Observações"];
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
          <input placeholder="Pesquise a licitação pelo código ou nome do órgão." className="flex-1 bg-transparent text-sm outline-none" />
          <Search size={17} />
        </div>
        <button className="flex items-center gap-2 font-display text-[13px] font-semibold text-violeta"><Upload size={16} /> Importar licitações</button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-indigo-deep px-3.5 py-1.5 font-display text-[12.5px] font-semibold text-white">Padrão <ChevronDown size={13} /></span>
        <button className="flex items-center gap-1.5 font-display text-[12.5px] font-semibold text-violeta"><Plus size={14} /> Nova tabela</button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-borda bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-borda bg-[#F8FAFC] text-left font-display text-[12px] font-semibold text-cinza">
              {cols.map((c) => (
                <th key={c} className="px-4 py-3 whitespace-nowrap">
                  <span className="flex items-center gap-1.5"><GripVertical size={12} className="text-[#CBD5E1]" /> {c} <ChevronDown size={12} className="text-[#CBD5E1]" /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id} className="border-b border-borda last:border-b-0">
                <td className="px-4 py-3 text-cinza">{i.portal}</td>
                <td className="px-4 py-3 font-display font-semibold text-indigo-deep">{i.titulo}</td>
                <td className="px-4 py-3 text-ink">{i.orgao}</td>
                <td className="px-4 py-3 text-ink">{i.uf}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12.5px]"><span className="h-2 w-2 rounded-full" style={{ background: statusCor[i.status].dot }} /> {i.status}</span></td>
                <td className="px-4 py-3">{i.tag ? <span className="rounded-full bg-[#EDE7FB] px-2 py-0.5 text-[11px] font-bold text-violeta">{i.tag}</span> : <span className="text-cinza">—</span>}</td>
                <td className="px-4 py-3 text-cinza">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-cinza">
        <button className="flex items-center gap-1.5 font-display font-semibold text-violeta"><Download size={15} /> Exportar</button>
        <div className="ml-auto flex items-center gap-3">
          <span>Itens por página: <b className="font-semibold text-indigo-deep">50</b></span>
          <span>1 até {itens.length} de {itens.length}</span>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </>
  );
}

/* ---------- KANBAN (arrastável) ---------- */

function KanbanView({
  itens,
  arrastado,
  setArrastado,
  mover,
}: {
  itens: Item[];
  arrastado: string | null;
  setArrastado: (id: string | null) => void;
  mover: (id: string, novo: Status) => void;
}) {
  const [over, setOver] = useState<Status | null>(null);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
          <Search size={17} />
          <input placeholder="Pesquisar por título, comprador ou descrição" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-laranja px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover"><Filter size={15} /> Filtrar</button>
        <Pill icon={<ChevronDown size={14} className="text-cinza" />}>Ordenar: Abertura mais próxima</Pill>
        <Pill icon={<ChevronDown size={14} className="text-cinza" />}>Agrupar: Fases</Pill>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {statusOrdem.map((s) => {
          const col = itens.filter((i) => i.status === s);
          const c = statusCor[s];
          return (
            <div
              key={s}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }}
              onDragLeave={() => setOver((o) => (o === s ? null : o))}
              onDrop={() => { if (arrastado) mover(arrastado, s); setOver(null); }}
              className="flex w-[270px] shrink-0 flex-col rounded-xl"
              style={{ background: over === s ? c.tint : "#F8FAFC", outline: over === s ? `2px dashed ${c.dot}` : "none" }}
            >
              <div className="flex items-center gap-2 rounded-t-xl px-3.5 py-2.5" style={{ background: c.tint }}>
                <span className="font-display text-[13px] font-semibold" style={{ color: c.texto }}>{s}</span>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 font-display text-[11px] font-bold" style={{ color: c.texto }}>{col.length}</span>
                <Filter size={13} className="ml-auto" style={{ color: c.texto }} />
              </div>
              <div className="flex-1 space-y-3 p-2.5">
                {col.map((i) => (
                  <CardItem key={i.id} i={i} draggable onDragStart={() => setArrastado(i.id)} />
                ))}
                {col.length === 0 && (
                  <div className="py-10 text-center text-[12.5px] text-cinza">Nenhuma licitação nesta etapa</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- MODAL: Adicionar Processo Externo ---------- */

const inputCls = "h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta";

function ProcessoExternoModal({ onClose }: { onClose: () => void }) {
  const [modo, setModo] = useState<"manual" | "ia">("manual");
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-6 w-full max-w-[760px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borda px-6 py-4">
          <h3 className="font-display text-[16px] font-bold text-indigo-deep">Adicionar Processo Externo</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
        </div>

        {modo === "manual" ? (
          <>
        <div className="space-y-5 px-6 py-5">
          {/* extrair com IA */}
          <div className="rounded-xl border border-[#FCD9B6] bg-[#FFF4E8] p-4 text-center">
            <p className="font-display text-[13px] font-semibold text-[#B45309]">Economize tempo com IA!</p>
            <button onClick={() => setModo("ia")} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-laranja px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
              <Sparkles size={15} /> Extrair dados automaticamente com IA
            </button>
            <p className="mt-2 text-[11.5px] text-[#92660C]">Faça upload do PDF e deixe a IA preencher tudo para você.</p>
          </div>

          <Campo label="CNPJ do Órgão"><input className={inputCls} placeholder="00.000.000/0000-00" /></Campo>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Campo label="Nome do Órgão"><input className={inputCls} placeholder="Informe o nome do Órgão" /></Campo>
            <Campo label="UF"><select className={inputCls + " appearance-none"} defaultValue=""><option value="" disabled>Selecione a UF</option><option>ES</option><option>SP</option><option>BA</option></select></Campo>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Número"><input className={inputCls} placeholder="000000" /></Campo>
            <Campo label="Ano"><input className={inputCls} defaultValue="2026" /></Campo>
            <Campo label="Portal"><input className={inputCls} placeholder="Informe o Portal" /></Campo>
          </div>
          <Campo label="Objeto do Pregão"><textarea rows={3} className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-violeta" /></Campo>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Data de abertura"><input type="date" className={inputCls} /></Campo>
            <Campo label="Hora"><input type="time" className={inputCls} /></Campo>
            <Campo label="Valor total estimado"><input className={inputCls} placeholder="0" /></Campo>
          </div>
          <Campo label="Modalidade de disputa"><select className={inputCls + " appearance-none"} defaultValue="Pregão eletrônico"><option>Pregão eletrônico</option><option>Concorrência</option><option>Dispensa</option></select></Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Registro de preço"><select className={inputCls + " appearance-none"} defaultValue="Não"><option>Não</option><option>Sim</option></select></Campo>
            <Campo label="Modo de disputa"><select className={inputCls + " appearance-none"} defaultValue="Aberto"><option>Aberto</option><option>Fechado</option><option>Aberto-Fechado</option></select></Campo>
          </div>

          {/* itens */}
          <div>
            <h4 className="mb-2 font-display text-[13px] font-semibold text-indigo-deep">Itens do edital extraídos</h4>
            <div className="grid grid-cols-6 gap-2 border-b border-borda pb-2 font-display text-[11.5px] font-semibold text-cinza">
              <span>Nº</span><span className="col-span-2">Descrição</span><span>Unidade</span><span>Qtd</span><span className="text-right">Valor ref.</span>
            </div>
            <div className="py-6 text-center text-[12.5px] text-cinza">Nenhum item ainda.</div>
            <button className="flex items-center gap-1.5 text-[13px] font-semibold text-violeta"><Plus size={14} /> Adicionar item</button>
          </div>
        </div>

        <div className="border-t border-borda p-4">
          <button onClick={onClose} className="w-full rounded-xl bg-laranja py-3 font-display text-[14px] font-semibold text-white transition hover:bg-laranja-hover">
            Confirmar
          </button>
        </div>
          </>
        ) : (
          <IAView onVoltar={() => setModo("manual")} />
        )}
      </div>
    </div>
  );
}

function IAView({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="px-6 py-6">
      <div className="text-center">
        <h4 className="font-display text-[18px] font-bold text-indigo-deep">Análise por IA</h4>
        <p className="mx-auto mt-1 max-w-[420px] text-[13px] text-cinza">
          Faça o upload do edital em PDF para extrair automaticamente todas as informações da licitação.
        </p>
      </div>

      <button
        onClick={onVoltar}
        className="mt-4 flex items-center gap-1.5 rounded-lg border border-borda px-3.5 py-2 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta"
      >
        ← Voltar ao preenchimento manual
      </button>

      <button className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-borda bg-[#F8FAFC] py-12 text-center transition hover:border-violeta">
        <UploadCloud size={30} className="text-violeta" />
        <span className="font-display text-[13.5px] font-semibold text-indigo-deep">Clique para selecionar o edital</span>
        <span className="text-[12px] text-cinza">Apenas arquivos PDF são aceitos</span>
      </button>

      <div className="mt-4 flex justify-center">
        <button disabled className="cursor-not-allowed rounded-lg bg-laranja/40 px-6 py-2.5 font-display text-[13px] font-semibold text-white">
          Extrair Informações
        </button>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#BBD6F5] bg-[#EAF3FB] p-3.5">
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-[#1E40AF]" />
        <div>
          <p className="font-display text-[12.5px] font-semibold text-[#1E40AF]">Dica importante</p>
          <p className="text-[12.5px] text-[#1E40AF]">
            Após a extração, você poderá revisar e ajustar todas as informações antes de salvar a licitação.
          </p>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block font-display text-[12.5px] font-semibold text-indigo-deep">{label}</label>
      {children}
    </div>
  );
}
