"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Pencil,
  FileText,
  CheckCircle2,
  Send,
  Users,
  Search,
  Download,
  ChevronDown,
  Plus,
  ExternalLink,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  X,
  UploadCloud,
  CreditCard,
  Rss,
  ChevronRight,
  Lock,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Aba = "dados" | "portais" | "documentos" | "catalogo" | "participacoes";

const abas: { id: Aba; label: string }[] = [
  { id: "dados", label: "Dados da empresa" },
  { id: "portais", label: "Portais" },
  { id: "documentos", label: "Documentos" },
  { id: "catalogo", label: "Catálogo" },
  { id: "participacoes", label: "Minhas Participações" },
];

export default function MinhaEmpresaPage() {
  const params = useSearchParams();
  const pedida = params.get("aba");
  const inicial: Aba = abas.some((a) => a.id === pedida) ? (pedida as Aba) : "dados";
  const [aba, setAba] = useState<Aba>(inicial);

  return (
    <>
      <p className="font-display text-[14px] font-semibold text-cinza">27.637.346/0001-51</p>

      {/* abas */}
      <div className="mt-3 flex flex-wrap gap-6 border-b border-borda">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={[
              "-mb-px whitespace-nowrap border-b-2 pb-2.5 font-display text-[14px] font-semibold transition",
              aba === a.id
                ? "border-laranja text-indigo-deep"
                : "border-transparent text-cinza hover:text-indigo-deep",
            ].join(" ")}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {aba === "dados" && <TabDados />}
        {aba === "portais" && <TabPortais />}
        {aba === "documentos" && <TabDocumentos />}
        {aba === "catalogo" && <TabCatalogo />}
        {aba === "participacoes" && <TabParticipacoes />}
      </div>
    </>
  );
}

/* ============ DADOS DA EMPRESA ============ */

function TabDados() {
  const [sub, setSub] = useState<"rep" | "banco" | "assinatura" | "certificado">("rep");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-borda bg-white p-6">
          {/* identidade */}
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-xl bg-[#F1F5F9] text-cinza">
              <Building2 size={30} />
            </div>
            <div>
              <button className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-violeta">
                <Pencil size={13} /> Editar
              </button>
              <p className="font-display text-[15px] font-semibold text-indigo-deep">27.637.346/0001-51</p>
              <p className="text-[13px] text-cinza">bionicaosilva@gmail.com</p>
            </div>
          </div>

          <div className="my-5 h-px bg-borda" />

          {/* dados da empresa */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Dados da empresa</h3>
            <button className="flex items-center gap-1.5 text-[13px] font-semibold text-violeta">
              <Pencil size={13} /> Editar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Campo label="Razão social" />
            <Campo label="Inscrição Estadual" />
            <Campo label="Logradouro" />
            <Campo label="CEP" />
            <Campo label="Estado" />
            <Campo label="Município" />
            <Campo label="Bairro" />
            <Campo label="Telefone" valor="(11) 94800-0063" />
            <Campo label="Porte da empresa" />
          </div>

          <div className="my-5 h-px bg-borda" />

          {/* sub-abas */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["rep", "Representante legal"],
                ["banco", "Dados bancários"],
                ["assinatura", "Assinatura digitalizada"],
                ["certificado", "Certificado digital"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSub(k)}
                className={[
                  "rounded-full px-3.5 py-2 font-display text-[12.5px] font-semibold transition",
                  sub === k
                    ? "bg-indigo-deep text-white"
                    : "border border-borda bg-white text-indigo-deep hover:border-violeta",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {sub === "rep" && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-display text-[14px] font-semibold text-indigo-deep">Dados do representante</h4>
                  <button className="flex items-center gap-1.5 text-[13px] font-semibold text-violeta">
                    <Pencil size={13} /> Editar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Campo label="Nome completo" />
                  <Campo label="CPF" />
                  <Campo label="RG" />
                </div>
              </>
            )}
            {sub === "banco" && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <Campo label="Banco" />
                <Campo label="Agência" />
                <Campo label="Conta" />
              </div>
            )}
            {sub === "assinatura" && (
              <Dropzone titulo="Assinatura digitalizada" hint="PNG ou JPG da assinatura do representante" />
            )}
            {sub === "certificado" && (
              <>
                <Dropzone titulo="Certificado digital (A1)" hint="Arquivo .pfx — armazenado criptografado (Supabase Vault)" />
                <p className="mt-2 text-[12px] text-cinza">
                  🔒 Credenciais e certificados ficam criptografados em repouso. Nunca expostos no navegador.
                </p>
              </>
            )}
          </div>
        </div>

        {/* origens (resumo) */}
        <div className="rounded-2xl border border-borda bg-white p-6">
          <h3 className="mb-1 font-display text-[15px] font-semibold text-indigo-deep">
            Origens das licitações
          </h3>
          <p className="text-[12.5px] text-cinza">
            Suas licitações são lidas por um canal único — o{" "}
            <b className="font-semibold text-indigo-deep">PNCP</b> — que agrega todos os
            portais. Use a aba <b className="font-semibold text-indigo-deep">Portais</b>{" "}
            para ver todas as origens ou filtrar por uma.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#DCFCE7] px-3 py-2 text-[12.5px] font-medium text-[#15803D]">
            <CheckCircle2 size={15} /> Leitura ativa via PNCP — todas as origens
          </div>
        </div>
      </div>

      {/* coluna direita */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-borda bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
              <FileText size={15} />
            </span>
            <h3 className="font-display text-[14px] font-semibold text-indigo-deep">Gestão de documentos</h3>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-ink">
            <CheckCircle2 size={18} className="text-verde" />
            Você tem <b className="font-semibold">0</b> documentos adicionados
          </div>
          <p className="mt-3 text-[12.5px] text-cinza">Atenção aos próximos vencimentos</p>
          <p className="text-[12.5px] text-cinza">Nenhum documento encontrado</p>
          <button className="mt-3 w-full text-center text-[13px] font-semibold text-violeta">
            Ver todos os documentos
          </button>
        </div>

        <CardLink icon={<CreditCard size={15} />} titulo="Meu plano" texto="Movido para organização" href="/dashboard/organizacao?aba=assinatura" />
        <CardLink icon={<Send size={15} />} titulo="Telegram" texto="Movido para organização" href="/dashboard/organizacao" />
        <CardLink icon={<Users size={15} />} titulo="Minha equipe" texto="Movido para organização" href="/dashboard/organizacao?aba=membros" />
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor?: string }) {
  return (
    <div>
      <div className="font-display text-[12.5px] font-semibold text-indigo-deep">{label}</div>
      <div className="mt-0.5 text-[13px] text-cinza">{valor ?? "Não informado"}</div>
    </div>
  );
}

function CardLink({ icon, titulo, texto, href }: { icon: React.ReactNode; titulo: string; texto: string; href: string }) {
  return (
    <div className="rounded-2xl border border-borda bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFE9D6] text-laranja">{icon}</span>
        <h3 className="font-display text-[14px] font-semibold text-indigo-deep">{titulo}</h3>
      </div>
      <a href={href} className="text-[13px] font-semibold text-verde">{texto}</a>
    </div>
  );
}

function Dropzone({ titulo, hint }: { titulo: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-borda bg-[#F8FAFC] py-8 text-center">
      <UploadCloud size={26} className="text-violeta" />
      <p className="font-display text-[13px] font-semibold text-indigo-deep">{titulo}</p>
      <p className="text-[12px] text-cinza">{hint}</p>
      <button className="mt-1 rounded-lg bg-laranja px-4 py-2 font-display text-[12.5px] font-semibold text-white transition hover:bg-laranja-hover">
        Selecionar arquivo
      </button>
    </div>
  );
}

function OrigemChip({
  nome,
  qtd,
  ativo,
  onClick,
}: {
  nome: string;
  qtd: number;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition",
        ativo ? "border-violeta bg-[#F5F3FF]" : "border-borda bg-white hover:border-violeta",
      ].join(" ")}
    >
      <span className="font-display text-[13px] font-semibold text-indigo-deep">{nome}</span>
      <span className="rounded-full bg-[#EDE7FB] px-2 py-0.5 font-display text-[11px] font-bold text-violeta">
        {qtd.toLocaleString("pt-BR")}
      </span>
    </button>
  );
}

/* ============ PORTAIS ============ */

const origens = [
  { nome: "Portal de Compras Públicas", qtd: 12430 },
  { nome: "Comprasnet", qtd: 9880 },
  { nome: "BLL Compras", qtd: 4210 },
  { nome: "BNC", qtd: 3115 },
  { nome: "Licitanet", qtd: 2090 },
  { nome: "Licitações-e", qtd: 1349 },
];
const totalOrigens = origens.reduce((s, o) => s + o.qtd, 0);

function TabPortais() {
  const [origem, setOrigem] = useState("Todos");

  return (
    <div className="space-y-5">
      {/* explicação */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#EAD9F7] bg-[#FBFAFF] p-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violeta text-white">
          <Rss size={16} />
        </span>
        <div>
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">
            Origens das licitações (via PNCP)
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-cinza">
            A Sentinela lê todas as licitações por um <b className="font-semibold text-indigo-deep">canal único, o PNCP</b>,
            que por lei agrega todos os portais. Você não precisa conectar cada portal — escolha ver{" "}
            <b className="font-semibold text-indigo-deep">todas</b> as origens ou filtrar por uma.
          </p>
        </div>
      </div>

      {/* filtro de origem */}
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h4 className="font-display text-[14px] font-semibold text-indigo-deep">Mostrar licitações de:</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <OrigemChip nome="Todos" qtd={totalOrigens} ativo={origem === "Todos"} onClick={() => setOrigem("Todos")} />
          {origens.map((o) => (
            <OrigemChip key={o.nome} nome={o.nome} qtd={o.qtd} ativo={origem === o.nome} onClick={() => setOrigem(o.nome)} />
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-borda pt-4">
          <span className="text-[13px] text-cinza">
            Mostrando: <b className="font-semibold text-indigo-deep">{origem}</b>
            <span className="ml-2 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-bold text-[#15803D]">
              Leitura via PNCP
            </span>
          </span>
          <a
            href="/dashboard/pesquisar-licitacoes"
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-laranja px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover"
          >
            Ver licitações desta origem <ChevronRight size={15} />
          </a>
        </div>
      </div>

      {/* operação = fase futura */}
      <div className="rounded-2xl border border-borda bg-[#F8FAFC] p-6">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F1F5F9] text-cinza">
            <Lock size={14} />
          </span>
          <h4 className="font-display text-[14px] font-semibold text-indigo-deep">Operar dentro do portal</h4>
          <span className="ml-auto rounded-full bg-[#FEF3E2] px-2.5 py-1 font-display text-[11px] font-bold text-[#B45309]">
            Fase futura
          </span>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-cinza">
          Login, cadastro de proposta, robô de lances e sessão em tempo real dependem de integração proprietária de
          cada portal — fora do MVP. A <b className="font-semibold text-indigo-deep">leitura</b> das oportunidades já
          funciona via PNCP.
        </p>
      </div>
    </div>
  );
}

/* ============ DOCUMENTOS ============ */

type DocItem = { nome: string; emitir?: boolean };
const docCategorias: { titulo: string; itens: DocItem[]; aberta?: boolean }[] = [
  {
    titulo: "Habilitação Jurídica",
    aberta: true,
    itens: [
      { nome: "Cartão CNPJ", emitir: true },
      { nome: "Contrato Social" },
      { nome: "RG / CNH" },
      { nome: "Alvará de funcionamento" },
      { nome: "Certidão Simplificada" },
    ],
  },
  {
    titulo: "Regularidade Fiscal e Trabalhista Federal",
    aberta: true,
    itens: [
      { nome: "Receita Federal e PGFN", emitir: true },
      { nome: "Regularidade do FGTS", emitir: true },
      { nome: "Tribunal Superior do Trabalho", emitir: true },
      { nome: "Inscrição Municipal" },
      { nome: "Inscrição Estadual" },
    ],
  },
  {
    titulo: "Regularidade Estadual / Municipal",
    itens: [{ nome: "Certidão Estadual" }, { nome: "Certidão Municipal" }],
  },
  {
    titulo: "Qualificação Técnica",
    itens: [{ nome: "Atestado de Capacidade Técnica" }],
  },
  {
    titulo: "Qualificação Econômico-Financeira",
    itens: [{ nome: "Balanço Patrimonial" }, { nome: "Certidão Negativa de Falência" }],
  },
];

function TabDocumentos() {
  return (
    <div className="rounded-2xl border border-borda bg-white p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-lg border border-borda bg-white px-3.5 text-cinza focus-within:border-violeta">
          <Search size={16} />
          <input placeholder="Pesquisar documento" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-borda px-4 py-2.5 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta">
          <Download size={15} /> Baixar todos
        </button>
      </div>

      <div className="mt-5 space-y-1">
        {docCategorias.map((c) => (
          <Categoria key={c.titulo} c={c} />
        ))}
      </div>
    </div>
  );
}

function Categoria({ c }: { c: { titulo: string; itens: DocItem[]; aberta?: boolean } }) {
  const [aberta, setAberta] = useState(!!c.aberta);
  return (
    <div className="border-b border-borda last:border-b-0">
      <button onClick={() => setAberta((v) => !v)} className="flex w-full items-center gap-2 py-3.5">
        <ChevronDown
          size={17}
          className="text-violeta transition-transform"
          style={{ transform: aberta ? "none" : "rotate(-90deg)" }}
        />
        <span className="font-display text-[14px] font-semibold text-indigo-deep">{c.titulo}</span>
      </button>
      {aberta && (
        <div className="pb-2">
          {c.itens.map((it) => (
            <div key={it.nome} className="flex items-center gap-3 border-t border-borda py-3">
              <span className="flex-1 text-[13.5px] text-ink">{it.nome}</span>
              {it.emitir && (
                <button className="flex items-center gap-1 text-[13px] font-semibold text-indigo-deep hover:text-violeta">
                  Emitir agora <ExternalLink size={13} />
                </button>
              )}
              <button className="text-[13px] font-semibold text-violeta">+ Adicionar arquivo</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ CATÁLOGO ============ */

function TabCatalogo() {
  const [modal, setModal] = useState(false);
  return (
    <div className="rounded-2xl border border-borda bg-white p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-2.5 rounded-lg border border-borda bg-white px-3.5 text-cinza focus-within:border-violeta">
          <Search size={16} />
          <input placeholder="Pesquisar…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 rounded-lg bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"
        >
          <Sparkles size={15} /> Extrair com IA
        </button>
        <button className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-laranja">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-borda bg-[#F8FAFC] py-16 text-center">
        <FileText size={26} className="text-[#94A3B8]" />
        <p className="font-display text-[14px] font-semibold text-indigo-deep">Nenhum item encontrado</p>
        <p className="text-[13px] text-cinza">Adicione itens ao catálogo para começar.</p>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[560px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[15px] font-bold text-indigo-deep">Extrair Catálogo</h3>
              <button onClick={() => setModal(false)} aria-label="Fechar" className="text-cinza hover:text-indigo-deep">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#DDD0F7] bg-[#FBFAFF] py-12 text-center">
              <UploadCloud size={30} className="text-violeta" />
              <p className="font-display text-[13.5px] font-semibold text-indigo-deep">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-[12px] text-cinza">PDF, PNG, JPG, JPEG, WEBP, CSV, XLSX, DOC, DOCX</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ MINHAS PARTICIPAÇÕES ============ */

function TabParticipacoes() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-borda bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
              <BarChart3 size={15} />
            </span>
            <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Estatísticas</h3>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-[13px] font-semibold text-cinza hover:text-violeta">
              <RefreshCw size={14} /> Atualizar
            </button>
            <button className="flex items-center gap-1.5 text-[13px] font-semibold text-cinza hover:text-violeta">
              <SlidersHorizontal size={14} /> Meus filtros
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-laranja px-4 py-2 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
              <Download size={14} /> Exportar relatório
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <FiltroPill>Período: 01/06/2026 – 30/06/2026</FiltroPill>
          <FiltroPill>Portal</FiltroPill>
          <FiltroPill>UF</FiltroPill>
          <FiltroPill>Fase</FiltroPill>
          <FiltroPill>Modalidade</FiltroPill>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI ring="0%" titulo="Total de licitações disputadas" valor="0" sub="0 com vitórias" />
          <KPI titulo="Itens ganhos" valor="0/0" sub="0% de aproveitamento" />
          <KPI titulo="Valor total participado" valor="R$ 0,00" sub="—" />
          <KPI titulo="Valor total arrematado" valor="R$ 0,00" sub="0% de aproveitamento" />
        </div>

        <div className="my-5 h-px bg-borda" />

        <div className="grid gap-6 sm:grid-cols-3">
          <GraficoVazio titulo="Arrematações por período" />
          <div>
            <p className="mb-3 font-display text-[13px] font-semibold text-indigo-deep">Resultados das licitações</p>
            <div className="flex items-center gap-4 text-[13px] text-cinza">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-verde" /> Vencidas 0</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amarelo" /> Perdidas 0</span>
            </div>
          </div>
          <GraficoVazio titulo="Principais modalidades" />
        </div>

        <p className="mt-5 text-[12px] text-cinza">Os dados exibidos são baseados nos resultados da sessão pública.</p>
      </div>

      {/* licitações disputadas */}
      <div className="rounded-2xl border border-borda bg-white p-6">
        <h3 className="mb-4 font-display text-[15px] font-semibold text-indigo-deep">Licitações disputadas</h3>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Tag ativo>Todas (0)</Tag>
          <Tag>Vencidas (0)</Tag>
          <Tag>Perdidas (0)</Tag>
          <div className="ml-auto text-[13px] text-cinza">
            Ordenar por: <b className="font-semibold text-indigo-deep">Mais recentes</b>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-borda">
          <div className="grid grid-cols-6 gap-2 bg-[#F8FAFC] px-4 py-2.5 font-display text-[12px] font-semibold text-cinza">
            <span>Nº licitação</span><span>Portal</span><span>Órgão</span><span>Data disputa</span><span>UF</span><span>Itens</span>
          </div>
          <div className="py-12 text-center text-[13px] text-cinza">Sem resultados.</div>
        </div>
      </div>
    </div>
  );
}

function FiltroPill({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep">
      {children}
      <ChevronDown size={14} className="text-cinza" />
    </button>
  );
}

function KPI({ ring, titulo, valor, sub }: { ring?: string; titulo: string; valor: string; sub: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-3">
        {ring && (
          <span className="grid h-11 w-11 place-items-center rounded-full border-4 border-[#E2E8F0] font-display text-[11px] font-bold text-cinza">
            {ring}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-[11.5px] text-cinza">{titulo}</div>
          <div className="font-display text-[22px] font-bold text-indigo-deep">{valor}</div>
        </div>
      </div>
      <div className="mt-1 text-[11.5px] text-cinza">{sub}</div>
    </div>
  );
}

function GraficoVazio({ titulo }: { titulo: string }) {
  return (
    <div>
      <p className="mb-3 font-display text-[13px] font-semibold text-indigo-deep">{titulo}</p>
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-borda text-[12.5px] text-cinza">
        Nenhum dado para exibir
      </div>
    </div>
  );
}

function Tag({ children, ativo }: { children: React.ReactNode; ativo?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 font-display text-[12.5px] font-semibold",
        ativo ? "bg-indigo-deep text-white" : "bg-[#F1F5F9] text-cinza",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
