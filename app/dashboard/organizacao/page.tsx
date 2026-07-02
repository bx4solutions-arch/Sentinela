"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pencil,
  Building2,
  Users,
  CreditCard,
  Search,
  Plus,
  X,
  AlertTriangle,
  Eye,
  Download,
  ShieldCheck,
  Shield,
  MoreVertical,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ============ MOCK ============ */

const ORG = {
  criadaEm: "29/06/2026",
  plano: "Premium",
  trialFim: "08/07/2026 15:11",
};

const CNPJ = { numero: "27.637.346/0001-51", razao: "", status: "Ativo" as const };

type Membro = {
  nome: string;
  email: string;
  cargo: "Admin" | "Membro";
  entrouEm: string;
  status: "Ativo" | "Convite pendente";
};
const membrosSeed: Membro[] = [
  { nome: "Você", email: "bionicaosilva@gmail.com", cargo: "Admin", entrouEm: "29/06/2026", status: "Ativo" },
];

type LogItem = { usuario: string; acao: string; data: string };
const historicoSeed: LogItem[] = [
  { usuario: "bionicaosilva@gmail.com", acao: "marcou a licitação como vista", data: "29/06/26 21:49:30" },
  { usuario: "bionicaosilva@gmail.com", acao: "marcou a licitação como vista", data: "29/06/26 21:47:27" },
  { usuario: "bionicaosilva@gmail.com", acao: "salvou um filtro", data: "29/06/26 16:51:53" },
  { usuario: "bionicaosilva@gmail.com", acao: "salvou um filtro", data: "29/06/26 16:51:48" },
  { usuario: "bionicaosilva@gmail.com", acao: "extraiu informações adicionais da licitação", data: "29/06/26 16:00:48" },
  { usuario: "bionicaosilva@gmail.com", acao: "marcou a licitação como vista", data: "29/06/26 16:00:26" },
  { usuario: "bionicaosilva@gmail.com", acao: "excluiu um filtro", data: "29/06/26 15:22:30" },
  { usuario: "bionicaosilva@gmail.com", acao: "iniciou o período de teste", data: "29/06/26 15:11:54" },
];

/* ============ PÁGINA ============ */

type Aba = "geral" | "cnpj" | "membros" | "assinatura" | "historico";
const abas: { id: Aba; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "cnpj", label: "CNPJ" },
  { id: "membros", label: "Membros" },
  { id: "assinatura", label: "Assinatura" },
  { id: "historico", label: "Histórico" },
];

export default function OrganizacaoPage() {
  const params = useSearchParams();
  const pedida = params.get("aba");
  const inicial: Aba = abas.some((a) => a.id === pedida) ? (pedida as Aba) : "geral";
  const [aba, setAba] = useState<Aba>(inicial);

  const [nomeOrg, setNomeOrg] = useState(CNPJ.numero);
  const [membros, setMembros] = useState<Membro[]>(membrosSeed);

  const limiteMembros = 6;

  return (
    <>
      {/* cabeçalho da organização */}
      <div className="rounded-2xl border border-borda bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-violeta font-display text-[20px] font-bold text-white">
            {nomeOrg.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[18px] font-bold text-indigo-deep">{nomeOrg}</h1>
              <span className="rounded-full bg-[#EDE7FB] px-2.5 py-0.5 font-display text-[11px] font-bold text-violeta">
                Sua organização
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-cinza">
              <span className="flex items-center gap-1.5"><Users size={13} /> {membros.length} membro{membros.length !== 1 ? "s" : ""}</span>
              <span>criada em {ORG.criadaEm}</span>
              <span>
                Você é <b className="font-display font-semibold text-indigo-deep">Admin</b> aqui
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* abas */}
      <div className="mt-5 flex flex-wrap gap-6 border-b border-borda">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={[
              "-mb-px whitespace-nowrap border-b-2 pb-2.5 font-display text-[14px] font-semibold transition",
              aba === a.id ? "border-laranja text-indigo-deep" : "border-transparent text-cinza hover:text-indigo-deep",
            ].join(" ")}
          >
            {a.label}
            {a.id === "membros" && <span className="ml-1.5 text-[12px] font-normal text-cinza">{membros.length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {aba === "geral" && <TabGeral nomeOrg={nomeOrg} setNomeOrg={setNomeOrg} />}
        {aba === "cnpj" && <TabCnpj />}
        {aba === "membros" && <TabMembros membros={membros} setMembros={setMembros} limite={limiteMembros} />}
        {aba === "assinatura" && <TabAssinatura />}
        {aba === "historico" && <TabHistorico />}
      </div>
    </>
  );
}

/* ============ GERAL ============ */

function TabGeral({ nomeOrg, setNomeOrg }: { nomeOrg: string; setNomeOrg: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(nomeOrg);
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  return (
    <div className="max-w-[760px] space-y-5">
      {/* identidade */}
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Identidade da organização</h3>
        <p className="mt-1 text-[13px] text-cinza">O nome usado para reconhecer sua empresa dentro da Sentinela.</p>

        <div className="my-5 h-px bg-borda" />

        {!editando ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-violeta font-display text-[14px] font-bold text-white">
                {nomeOrg.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <div className="text-[12px] text-cinza">Nome da organização</div>
                <div className="font-display text-[14px] font-semibold text-indigo-deep">{nomeOrg}</div>
              </div>
            </div>
            <button
              onClick={() => { setRascunho(nomeOrg); setEditando(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-borda px-3.5 py-2 font-display text-[13px] font-semibold text-violeta transition hover:border-violeta"
            >
              <Pencil size={13} /> Editar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              className="h-11 flex-1 min-w-[220px] rounded-lg border border-violeta bg-white px-3 text-[13px] text-ink outline-none"
              autoFocus
            />
            <button
              onClick={() => { if (rascunho.trim()) setNomeOrg(rascunho.trim()); setEditando(false); }}
              className="rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"
            >
              Salvar
            </button>
            <button onClick={() => setEditando(false)} className="rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* plano e propriedade */}
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Plano e responsável</h3>
        <p className="mt-1 text-[13px] text-cinza">Quem administra esta organização e em que plano ela está.</p>

        <div className="my-5 h-px bg-borda" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Plano" valor={ORG.plano} />
          <Campo label="Administrador" valor={nomeOrg} />
          <Campo label="Criada em" valor={ORG.criadaEm} />
        </div>
      </div>

      {/* zona de risco */}
      <div className="rounded-2xl border border-[#F7D9D9] bg-white p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-vermelho" />
          <h3 className="font-display text-[15px] font-semibold text-vermelho">Zona de risco</h3>
        </div>
        <p className="mt-1 text-[13px] text-cinza">A partir daqui as ações não têm volta. Avalie com cuidado antes de confirmar.</p>

        <div className="my-5 h-px bg-[#F7D9D9]" />

        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-[13.5px] font-semibold text-indigo-deep">Excluir organização</div>
            <p className="text-[12.5px] text-cinza">Apaga em definitivo o CNPJ, a equipe e o histórico registrados nesta organização.</p>
          </div>
          <button
            onClick={() => setConfirmExcluir(true)}
            className="rounded-lg border border-[#F7D9D9] px-4 py-2.5 font-display text-[13px] font-semibold text-vermelho transition hover:bg-[#FDF2F2]"
          >
            Excluir
          </button>
        </div>
      </div>

      {confirmExcluir && (
        <ExcluirOrgModal nomeOrg={nomeOrg} onClose={() => setConfirmExcluir(false)} />
      )}
    </div>
  );
}

function ExcluirOrgModal({ nomeOrg, onClose }: { nomeOrg: string; onClose: () => void }) {
  const [digitado, setDigitado] = useState("");
  const confirmado = digitado.trim() === nomeOrg;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FDF2F2] text-vermelho">
            <AlertTriangle size={17} />
          </span>
          <h3 className="font-display text-[15px] font-bold text-indigo-deep">Excluir organização</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-cinza">
          Esta ação é <b className="font-semibold text-vermelho">definitiva</b>: o CNPJ, os membros, os filtros e o histórico
          desta organização deixam de existir. Nada é apagado de verdade aqui — esta tela é o protótipo do produto; a exclusão
          real sempre vai depender de confirmação explícita do Admin.
        </p>
        <label className="mt-4 block font-display text-[12.5px] font-semibold text-indigo-deep">
          Digite <span className="text-vermelho">{nomeOrg}</span> para confirmar
        </label>
        <input
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] outline-none focus:border-vermelho"
          autoFocus
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <button onClick={onClose} className="rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep">
            Cancelar
          </button>
          <button
            disabled={!confirmado}
            className="rounded-lg bg-vermelho px-4 py-2.5 font-display text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Excluir permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor?: string }) {
  return (
    <div>
      <div className="text-[11.5px] text-cinza">{label.toUpperCase()}</div>
      <div className="mt-0.5 font-display text-[14px] font-semibold text-indigo-deep">{valor || "Não informado"}</div>
    </div>
  );
}

/* ============ CNPJ ============ */

function TabCnpj() {
  return (
    <div className="max-w-[760px] space-y-4">
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">CNPJ desta organização</h3>
        <p className="mt-1 max-w-[560px] text-[13px] text-cinza">
          Cada organização na Sentinela é dedicada a uma única empresa. O CNPJ abaixo é quem participa das licitações,
          concentra os documentos de habilitação e recebe o Raio-X do Órgão.
        </p>

        <div className="my-5 h-px bg-borda" />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borda bg-[#F8FAFC] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-violeta">
              <Building2 size={18} />
            </span>
            <div>
              <div className="font-display text-[14px] font-semibold text-indigo-deep">{CNPJ.numero}</div>
              <div className="text-[12.5px] text-cinza">{CNPJ.razao || "Razão social não informada"}</div>
            </div>
          </div>
          <StatusBadge status={CNPJ.status} />
        </div>

        <a
          href="/dashboard/minha-empresa"
          className="mt-4 flex items-center gap-1.5 font-display text-[13px] font-semibold text-violeta"
        >
          Editar dados cadastrais em Minha Empresa <ArrowRight size={14} />
        </a>
      </div>

      <div className="rounded-2xl border border-borda bg-[#F8FAFC] p-5">
        <p className="text-[12.5px] leading-relaxed text-cinza">
          Hoje a Sentinela atende uma empresa por organização. Consolidar mais de um CNPJ numa mesma conta — para
          escritórios ou grupos que representam vários fornecedores — está no radar de evolução do produto, mas ainda
          fora do escopo desta versão.
        </p>
      </div>
    </div>
  );
}

/* ============ MEMBROS (RBAC) ============ */

function TabMembros({
  membros,
  setMembros,
  limite,
}: {
  membros: Membro[];
  setMembros: (v: Membro[]) => void;
  limite: number;
}) {
  const [filtro, setFiltro] = useState<"Todos" | "Admins" | "Membros">("Todos");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const atingiuLimite = membros.length >= limite;

  const admins = membros.filter((m) => m.cargo === "Admin").length;
  const comuns = membros.length - admins;

  const lista = membros
    .filter((m) => filtro === "Todos" || (filtro === "Admins" ? m.cargo === "Admin" : m.cargo === "Membro"))
    .filter((m) => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || m.email.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="rounded-2xl border border-borda bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-indigo-deep">
            Membros ({membros.length} de {limite})
          </h3>
          <p className="mt-1 max-w-[520px] text-[13px] text-cinza">
            Sua equipe dentro da Sentinela. O cargo de cada pessoa define o que ela pode ver e fazer na plataforma.
          </p>
        </div>
        <button
          onClick={() => !atingiuLimite && setModal(true)}
          disabled={atingiuLimite}
          title={atingiuLimite ? "Limite de membros do plano atingido." : undefined}
          className="flex items-center gap-1.5 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-cinza"
        >
          <Plus size={15} /> Adicionar membro
        </button>
      </div>

      <div className="mt-4 flex h-11 items-center gap-2.5 rounded-lg border border-borda bg-white px-3.5 text-cinza focus-within:border-violeta">
        <Search size={16} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="flex-1 bg-transparent text-sm outline-none" />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FiltroChip ativo={filtro === "Todos"} onClick={() => setFiltro("Todos")}>Todos {membros.length}</FiltroChip>
        <FiltroChip ativo={filtro === "Admins"} onClick={() => setFiltro("Admins")}>Admins {admins}</FiltroChip>
        <FiltroChip ativo={filtro === "Membros"} onClick={() => setFiltro("Membros")}>Membros {comuns}</FiltroChip>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-borda">
        <div className="grid grid-cols-[1.8fr_0.9fr_1fr_0.9fr_40px] gap-2 bg-[#F8FAFC] px-4 py-2.5 font-display text-[11.5px] font-semibold text-cinza">
          <span>Membro</span>
          <span>Cargo</span>
          <span>Entrou em</span>
          <span>Status</span>
          <span />
        </div>
        {lista.map((m) => (
          <div key={m.email} className="grid grid-cols-[1.8fr_0.9fr_1fr_0.9fr_40px] items-center gap-2 border-t border-borda px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violeta font-display text-[11px] font-bold text-white">
                {m.nome.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-[13px] font-semibold text-indigo-deep">
                  {m.nome} {m.nome === "Você" && <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-cinza">você</span>}
                </div>
                <div className="truncate text-[12px] text-cinza">{m.email}</div>
              </div>
            </div>
            <CargoBadge cargo={m.cargo} />
            <span className="text-[13px] text-cinza">{m.entrouEm}</span>
            <StatusBadge status={m.status === "Ativo" ? "Ativo" : "Inativo"} label={m.status} />
            <button aria-label="Mais opções" className="justify-self-end text-cinza hover:text-indigo-deep">
              <MoreVertical size={16} />
            </button>
          </div>
        ))}
        {lista.length === 0 && <div className="py-12 text-center text-[13px] text-cinza">Nenhum membro encontrado.</div>}
        <div className="flex items-center justify-between border-t border-borda px-4 py-2.5 text-[12px] text-cinza">
          <span>Itens por página: 10</span>
          <span>1 até {lista.length} de {lista.length}</span>
        </div>
      </div>

      {modal && (
        <AdicionarMembroModal
          onClose={() => setModal(false)}
          onSalvar={(m) => { setMembros([...membros, m]); setModal(false); }}
        />
      )}
    </div>
  );
}

function AdicionarMembroModal({
  onClose,
  onSalvar,
}: {
  onClose: () => void;
  onSalvar: (m: Membro) => void;
}) {
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState<"Admin" | "Membro">("Membro");

  function enviar() {
    if (!email.trim()) return;
    onSalvar({
      nome: email.split("@")[0],
      email: email.trim(),
      cargo,
      entrouEm: new Date().toLocaleDateString("pt-BR"),
      status: "Convite pendente",
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-[480px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-borda px-6 py-4">
          <h3 className="font-display text-[16px] font-bold text-indigo-deep">Adicionar membro</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <label className="mb-1.5 block font-display text-[12.5px] font-semibold text-indigo-deep">E-mail do convidado *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@empresa.com.br" className="h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] outline-none focus:border-violeta" />
          </div>

          <div>
            <label className="mb-1.5 block font-display text-[12.5px] font-semibold text-indigo-deep">Cargo</label>
            <div className="flex gap-2.5">
              <CargoOpcao ativo={cargo === "Admin"} onClick={() => setCargo("Admin")} icone={<ShieldCheck size={15} />} titulo="Admin" texto="Administra a organização: CNPJ, equipe e assinatura." />
              <CargoOpcao ativo={cargo === "Membro"} onClick={() => setCargo("Membro")} icone={<Shield size={15} />} titulo="Membro" texto="Acompanha e opera licitações, sem acesso à cobrança." />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] p-3 text-[12px] text-cinza">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-violeta" />
            O convite chega por e-mail e só vira acesso de fato quando a pessoa aceitar — nada é liberado automaticamente.
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-borda p-4">
          <button onClick={onClose} className="rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep">Cancelar</button>
          <button
            disabled={!email.trim()}
            onClick={enviar}
            className="rounded-lg bg-laranja px-5 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enviar convite
          </button>
        </div>
      </div>
    </div>
  );
}

function CargoOpcao({ ativo, onClick, icone, titulo, texto }: { ativo: boolean; onClick: () => void; icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 rounded-xl border p-3 text-left transition",
        ativo ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white hover:border-violeta",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-indigo-deep">{icone} {titulo}</div>
      <p className="mt-1 text-[11.5px] leading-snug text-cinza">{texto}</p>
    </button>
  );
}

/* ============ ASSINATURA ============ */

function TabAssinatura() {
  return (
    <div className="max-w-[760px] space-y-5">
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Plano Atual</h3>
        <div className="my-5 h-px bg-borda" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-[20px] font-bold text-indigo-deep">Plano {ORG.plano}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-[#FEF3E2] px-2.5 py-0.5 font-display text-[11px] font-bold text-[#B45309]">Em teste</span>
            </div>
            <p className="mt-2 text-[13px] text-cinza">O período de avaliação encerra sozinho em {ORG.trialFim} — nenhum cancelamento é necessário.</p>
            <a href="#" className="mt-1 inline-block text-[12.5px] font-semibold text-violeta">Termos de uso e políticas de cancelamento</a>
          </div>
          <button className="rounded-lg bg-laranja px-5 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
            Atualize seu plano
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Consumo neste ciclo</h3>
        <div className="my-5 h-px bg-borda" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ConsumoItem label="Membros da equipe" atual={1} limite={6} />
          <ConsumoItem label="Raio-X do Órgão / mês" atual={4} limite={20} />
          <ConsumoItem label="Licitações acompanhadas" atual={12} limite={50} />
        </div>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-6">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-cinza" />
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Faturas</h3>
        </div>
        <div className="my-5 h-px bg-borda" />
        <div className="py-8 text-center text-[13px] text-cinza">Nenhuma fatura emitida ainda — você está no período de teste.</div>
      </div>
    </div>
  );
}

function ConsumoItem({ label, atual, limite }: { label: string; atual: number; limite: number }) {
  const pct = Math.min(100, Math.round((atual / limite) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="text-cinza">{label}</span>
        <span className="font-display font-semibold text-indigo-deep">{atual}/{limite}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#F1F5F9]">
        <div className="h-full rounded-full bg-violeta" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ============ HISTÓRICO ============ */

function TabHistorico() {
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState<LogItem | null>(null);

  const lista = historicoSeed.filter((l) => !busca || l.acao.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="rounded-2xl border border-borda bg-white p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 min-w-[220px] items-center gap-2.5 rounded-lg border border-borda bg-white px-3.5 text-cinza focus-within:border-violeta">
          <Search size={16} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Filtrar por ação…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta">
          <Download size={15} /> Exportar
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-borda">
        <div className="grid grid-cols-[1.4fr_2fr_1fr_40px] gap-2 bg-[#F8FAFC] px-4 py-2.5 font-display text-[11.5px] font-semibold text-cinza">
          <span>Usuário</span>
          <span>Ação</span>
          <span>Data</span>
          <span />
        </div>
        {lista.map((l, i) => (
          <div key={i} className="grid grid-cols-[1.4fr_2fr_1fr_40px] items-center gap-2 border-t border-borda px-4 py-3">
            <span className="truncate text-[13px] text-ink">{l.usuario}</span>
            <span className="text-[13px] font-medium text-verde">{l.acao}</span>
            <span className="text-[12.5px] text-cinza">{l.data}</span>
            <button onClick={() => setDetalhe(l)} aria-label="Ver detalhes" className="justify-self-end text-cinza hover:text-violeta">
              <Eye size={16} />
            </button>
          </div>
        ))}
        {lista.length === 0 && <div className="py-12 text-center text-[13px] text-cinza">Nenhuma ação encontrada.</div>}
        <div className="flex items-center justify-between border-t border-borda px-4 py-2.5 text-[12px] text-cinza">
          <span>Itens por página: 200</span>
          <span>1 até {lista.length} de {lista.length}</span>
        </div>
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold text-indigo-deep">Detalhe da ação</h3>
              <button onClick={() => setDetalhe(null)} aria-label="Fechar" className="text-cinza hover:text-indigo-deep"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div><span className="text-cinza">Usuário: </span><span className="font-semibold text-indigo-deep">{detalhe.usuario}</span></div>
              <div><span className="text-cinza">Ação: </span><span className="font-semibold text-indigo-deep">{detalhe.acao}</span></div>
              <div><span className="text-cinza">Data: </span><span className="font-semibold text-indigo-deep">{detalhe.data}</span></div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[12px] text-cinza">Cada ação relevante da equipe fica registrada aqui, com autor e horário — sua trilha de auditoria.</p>
    </div>
  );
}

/* ============ HELPERS COMPARTILHADOS ============ */

function FiltroChip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3.5 py-1.5 font-display text-[12.5px] font-semibold transition",
        ativo ? "bg-indigo-deep text-white" : "border border-borda bg-white text-indigo-deep hover:border-violeta",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CargoBadge({ cargo }: { cargo: "Admin" | "Membro" }) {
  return (
    <span
      className={[
        "w-fit rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold",
        cargo === "Admin" ? "bg-[#EDE7FB] text-violeta" : "bg-[#F1F5F9] text-cinza",
      ].join(" ")}
    >
      {cargo}
    </span>
  );
}

function StatusBadge({ status, label }: { status: "Ativo" | "Inativo"; label?: string }) {
  const ok = status === "Ativo";
  return (
    <span
      className={[
        "flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[11px] font-bold",
        ok ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEF3E2] text-[#B45309]",
      ].join(" ")}
    >
      {ok && <Check size={11} />}
      {label ?? status}
    </span>
  );
}
