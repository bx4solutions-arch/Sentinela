"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  User2,
  FileText,
  Clock,
  Link2,
} from "lucide-react";

type Tipo = "abertura" | "sessao" | "tarefa" | "vencimento" | "impugnacao" | "recurso";

const tipoCfg: Record<Tipo, { label: string; cor: string; tint: string }> = {
  abertura: { label: "Abertura", cor: "#5B21B6", tint: "#EDE7FB" },
  sessao: { label: "Sessão pública", cor: "#2563EB", tint: "#DBEAFE" },
  tarefa: { label: "Tarefa", cor: "#16A34A", tint: "#DCFCE7" },
  vencimento: { label: "Vencimento", cor: "#DC2626", tint: "#FDE7E7" },
  impugnacao: { label: "Impugnação", cor: "#F59E0B", tint: "#FEF3E2" },
  recurso: { label: "Recurso", cor: "#FF6600", tint: "#FFE9D6" },
};

type Evento = {
  id: string;
  titulo: string;
  tipo: Tipo;
  data: string; // YYYY-MM-DD
  hora: string;
  responsavel: string;
  licitacao: string;
};

const usuarios = ["Bione (você)", "Maria Souza", "João Lima"];
const licitacoes = [
  "Pregão 011/2026 — Rurópolis",
  "Dispensa 39/2026 — FUNAI",
  "Concorrência 091/2026 — Bahia",
  "Pregão PE046/2026 — São Carlos",
];

const eventosIniciais: Evento[] = [
  { id: "e1", titulo: "Sessão — São Carlos", tipo: "sessao", data: "2026-06-29", hora: "14:00", responsavel: "Bione (você)", licitacao: "Pregão PE046/2026 — São Carlos" },
  { id: "e2", titulo: "Revisar proposta", tipo: "tarefa", data: "2026-06-30", hora: "09:00", responsavel: "Maria Souza", licitacao: "Pregão 011/2026 — Rurópolis" },
  { id: "e3", titulo: "Abertura — FUNAI", tipo: "abertura", data: "2026-07-03", hora: "07:00", responsavel: "Bione (você)", licitacao: "Dispensa 39/2026 — FUNAI" },
  { id: "e4", titulo: "Certidão FGTS vence", tipo: "vencimento", data: "2026-07-04", hora: "23:59", responsavel: "Bione (você)", licitacao: "—" },
  { id: "e5", titulo: "Abertura — Rurópolis", tipo: "abertura", data: "2026-07-13", hora: "08:00", responsavel: "João Lima", licitacao: "Pregão 011/2026 — Rurópolis" },
];

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const semana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function AgendaPage() {
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(5); // Junho
  const [eventos, setEventos] = useState<Evento[]>(eventosIniciais);
  const [filtros, setFiltros] = useState<Set<Tipo>>(new Set());
  const [modal, setModal] = useState(false);
  const [dataPre, setDataPre] = useState<string | null>(null);

  function navega(delta: number) {
    let m = mes + delta;
    let a = ano;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setMes(m);
    setAno(a);
  }
  function toggleFiltro(t: Tipo) {
    setFiltros((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  }
  function abrirNova(data?: string) {
    setDataPre(data ?? null);
    setModal(true);
  }
  function criar(ev: Omit<Evento, "id">) {
    setEventos((arr) => [...arr, { ...ev, id: "e" + (arr.length + 1) + Date.now() }]);
    setModal(false);
  }

  const visiveis = filtros.size === 0 ? eventos : eventos.filter((e) => filtros.has(e.tipo));

  // grade do mês
  const inicio = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < inicio; i++) cells.push(null);
  for (let d = 1; d <= totalDias; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const hojeKey = "2026-06-29";

  return (
    <>
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1 className="font-display text-[22px] font-bold text-indigo-deep">Agenda Fácil</h1>
          <p className="mt-1 max-w-[560px] text-[13.5px] text-cinza">
            Crie e gerencie tarefas da sua equipe e dos seus clientes para otimizar participações e resultados.
          </p>
        </div>
        <button onClick={() => abrirNova()} className="flex items-center gap-2 rounded-lg bg-laranja px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      {/* toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-lg border border-borda bg-white px-3.5 text-cinza focus-within:border-violeta">
          <Search size={16} />
          <input placeholder="Pesquisar por título ou licitação" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2.5 text-[13px] font-medium text-indigo-deep">
          Visão: <b className="font-semibold">Mensal</b> <ChevronDown size={14} className="text-cinza" />
        </button>
      </div>

      {/* filtros por tipo */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["abertura", "sessao", "tarefa", "vencimento"] as Tipo[]).map((t) => {
          const ativo = filtros.has(t);
          const c = tipoCfg[t];
          return (
            <button
              key={t}
              onClick={() => toggleFiltro(t)}
              className="flex items-center gap-2 rounded-full border px-3.5 py-2 font-display text-[12.5px] font-semibold transition"
              style={{
                borderColor: ativo ? c.cor : "var(--color-borda)",
                background: ativo ? c.tint : "#fff",
                color: ativo ? c.cor : "#1E1B4B",
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* calendário */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-borda bg-white">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <button onClick={() => navega(-1)} className="grid h-7 w-7 place-items-center rounded-md bg-[#F1F5F9] text-cinza hover:text-violeta"><ChevronLeft size={15} /></button>
          <button onClick={() => navega(1)} className="grid h-7 w-7 place-items-center rounded-md bg-[#F1F5F9] text-cinza hover:text-violeta"><ChevronRight size={15} /></button>
          <h2 className="font-display text-[15px] font-bold text-indigo-deep">{meses[mes]} de {ano}</h2>
        </div>

        <div className="grid grid-cols-7 border-t border-borda">
          {semana.map((s) => (
            <div key={s} className="border-b border-r border-borda px-3 py-2 text-[12px] font-medium text-cinza last:border-r-0">{s}</div>
          ))}
          {cells.map((d, idx) => {
            const key = d ? `${ano}-${pad(mes + 1)}-${pad(d)}` : "";
            const evs = d ? visiveis.filter((e) => e.data === key) : [];
            const ehHoje = key === hojeKey;
            return (
              <button
                key={idx}
                onClick={() => d && abrirNova(key)}
                className="min-h-[108px] border-b border-r border-borda p-2 text-left align-top transition last:border-r-0 hover:bg-[#FBFAFF] disabled:cursor-default disabled:hover:bg-transparent"
                disabled={!d}
              >
                {d && (
                  <span className={["inline-grid h-6 w-6 place-items-center rounded-full text-[12.5px]", ehHoje ? "bg-indigo-deep font-bold text-white" : "text-ink"].join(" ")}>
                    {d}
                  </span>
                )}
                <div className="mt-1 space-y-1">
                  {evs.slice(0, 3).map((e) => {
                    const c = tipoCfg[e.tipo];
                    return (
                      <div key={e.id} className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ background: c.tint, color: c.cor }}>
                        {e.hora} {e.titulo}
                      </div>
                    );
                  })}
                  {evs.length > 3 && <div className="px-1 text-[10.5px] text-cinza">+{evs.length - 3} mais</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-cinza">
        Clique em um dia para criar uma tarefa. Dados de exemplo — prazos reais (abertura, impugnação, recurso, vencimento) entram automaticamente ao conectar o banco.
      </p>

      {modal && <NovaTarefaModal dataPre={dataPre} onClose={() => setModal(false)} onCriar={criar} />}
    </>
  );
}

const inputCls = "h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta";

function NovaTarefaModal({
  dataPre,
  onClose,
  onCriar,
}: {
  dataPre: string | null;
  onClose: () => void;
  onCriar: (ev: Omit<Evento, "id">) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<Tipo>("tarefa");
  const [data, setData] = useState(dataPre ?? "");
  const [hora, setHora] = useState("");
  const [responsavel, setResponsavel] = useState(usuarios[0]);
  const [licitacao, setLicitacao] = useState("—");

  function salvar() {
    if (!titulo.trim() || !data) return;
    onCriar({ titulo: titulo.trim(), tipo, data, hora: hora || "09:00", responsavel, licitacao });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-[520px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borda px-6 py-4">
          <h3 className="font-display text-[16px] font-bold text-indigo-deep">Nova tarefa</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Campo label="Título">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Enviar proposta, ligar para o pregoeiro…" className={inputCls} />
          </Campo>

          <Campo label="Tipo">
            <div className="relative">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className={inputCls + " appearance-none"}>
                {(Object.keys(tipoCfg) as Tipo[]).map((t) => (
                  <option key={t} value={t}>{tipoCfg[t].label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
            </div>
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputCls} /></Campo>
            <Campo label="Hora"><input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls} /></Campo>
          </div>

          <Campo label="Responsável (usuário)">
            <div className="relative">
              <User2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
              <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls + " appearance-none pl-9"}>
                {usuarios.map((u) => <option key={u}>{u}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
            </div>
          </Campo>

          <Campo label="Vincular à licitação / processo">
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
              <select value={licitacao} onChange={(e) => setLicitacao(e.target.value)} className={inputCls + " appearance-none pl-9"}>
                <option value="—">Nenhuma (tarefa avulsa)</option>
                {licitacoes.map((l) => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza" />
            </div>
          </Campo>

          <Campo label="Objeto / observação">
            <textarea rows={2} placeholder="Detalhe a tarefa…" className="w-full rounded-lg border border-borda bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-violeta" />
          </Campo>
        </div>

        <div className="flex gap-3 border-t border-borda p-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-borda py-3 font-display text-[14px] font-semibold text-indigo-deep transition hover:border-violeta">Cancelar</button>
          <button onClick={salvar} className="flex-1 rounded-xl bg-laranja py-3 font-display text-[14px] font-semibold text-white transition hover:bg-laranja-hover">Criar tarefa</button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 font-display text-[12.5px] font-semibold text-indigo-deep">
        <FileText size={12} className="text-cinza" /> {label}
      </label>
      {children}
    </div>
  );
}
