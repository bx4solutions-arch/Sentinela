"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Zap,
  Heart,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  ListTree,
  FileText,
  Bookmark,
  Check as CheckIcon,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { LicitacaoCard } from "@/components/widgets/licitacao-card";
import { formatarDataHora } from "@/lib/formatar";

/* ---------- score de aderência ---------- */
type Licitacao = Tables<"licitacoes">;

const POR_PAGINA = 10;

/* helpers de formatação extraídos para lib/formatar.ts (Fase A) */

function tsAsc(iso: string | null): number {
  if (!iso) return Infinity; // nulos sempre por último, em qualquer ordenação
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

function tsDesc(iso: string | null): number {
  if (!iso) return -Infinity;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? -Infinity : t;
}

export default function PesquisarLicitacoesPage() {
  const [aba, setAba] = useState<"buscar" | "favoritos">("buscar");
  const [query, setQuery] = useState("");
  const [ordem, setOrdem] = useState("relevancia");
  const [pagina, setPagina] = useState(1);

  const [dados, setDados] = useState<Licitacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("licitacoes")
        .select("*")
        .order("data_publicacao", { ascending: false, nullsFirst: false })
        .limit(500);

      if (!ativo) return;
      if (error) {
        setErro(error.message);
        setDados([]);
      } else {
        setDados(data ?? []);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const ultimaAtualizacao = useMemo(() => {
    if (dados.length === 0) return null;
    const maisRecente = dados.reduce((acc, d) => {
      const t = new Date(d.atualizado_em).getTime();
      return t > acc ? t : acc;
    }, 0);
    return maisRecente > 0 ? new Date(maisRecente) : null;
  }, [dados]);

  const filtrada = useMemo(() => {
    const termo = query.trim().toLowerCase();
    if (!termo) return dados;
    return dados.filter((l) =>
      [l.objeto, l.orgao_nome, l.modalidade, l.municipio]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termo))
    );
  }, [dados, query]);

  const lista = useMemo(() => {
    const copia = [...filtrada];
    if (ordem === "abertura") {
      copia.sort((a, b) => tsAsc(a.data_abertura) - tsAsc(b.data_abertura));
    } else if (ordem === "recente") {
      copia.sort((a, b) => tsDesc(b.data_publicacao) - tsDesc(a.data_publicacao));
    } else {
      // relevância: só existe quando o Raio-X já pontuou a licitação;
      // sem score, cai para publicação mais recente primeiro (nunca inventa nota)
      copia.sort((a, b) => {
        const sa = a.score_relevancia;
        const sb = b.score_relevancia;
        if (sa == null && sb == null) {
          return tsDesc(b.data_publicacao) - tsDesc(a.data_publicacao);
        }
        return (sb ?? -Infinity) - (sa ?? -Infinity);
      });
    }
    return copia;
  }, [filtrada, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const listaPagina = lista.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  );

  return (
    <>
      {/* cabeçalho */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1 className="font-display text-[22px] font-bold text-indigo-deep">
            Pesquisar Licitações
          </h1>
          <p className="mt-1 max-w-[560px] text-[13.5px] text-cinza">
            Pesquise pelos materiais e serviços que sua empresa oferece e encontre
            as melhores oportunidades disponíveis.
          </p>
        </div>
        <button className="flex items-center gap-2 font-display text-[13px] font-semibold text-laranja">
          <Zap size={16} /> Buscar com link
        </button>
      </div>

      {/* banner de origem do dado — transparência sobre o que está sendo exibido */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#DDD0F7] bg-[#F5F3FF] px-4 py-2.5 text-[12.5px] text-violeta">
        <span className="font-display font-semibold">Dados reais do PNCP</span>
        <span className="text-cinza">
          · piloto Teresina/PI · captura automática a cada 2h
          {ultimaAtualizacao && (
            <> · última atualização em {formatarDataHora(ultimaAtualizacao.toISOString())}</>
          )}
        </span>
      </div>

      {/* abas */}
      <div className="mt-5 flex gap-6 border-b border-borda">
        {(["buscar", "favoritos"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={[
              "-mb-px border-b-2 pb-2.5 font-display text-[14px] font-semibold capitalize transition",
              aba === a
                ? "border-laranja text-indigo-deep"
                : "border-transparent text-cinza hover:text-indigo-deep",
            ].join(" ")}
          >
            {a}
          </button>
        ))}
      </div>

      {aba === "favoritos" ? (
        <div className="mt-8 rounded-2xl border border-borda bg-white p-8 text-center">
          <p className="text-[13.5px] text-cinza">
            Você ainda não salvou nenhuma licitação para análise.
          </p>
        </div>
      ) : (
        <>
          {/* busca */}
          <div className="mt-5">
            <label className="mb-1.5 flex items-center gap-1.5 font-display text-[13px] font-semibold text-indigo-deep">
              Pesquisar
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPagina(1);
                }}
                placeholder="Digite o que você quer vender hoje"
                className="flex-1 bg-transparent text-sm text-ink outline-none"
              />
              <Search size={18} />
            </div>
          </div>

          {/* barra de resultados */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="font-display text-[14px] font-bold text-indigo-deep">
              {carregando ? "…" : lista.length}{" "}
              <span className="font-medium text-cinza">licitações</span>
            </span>
            <Pill>Abertura</Pill>
            <Pill>Todos os períodos</Pill>
            <label className="flex items-center gap-2 text-[13px] text-cinza">
              <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-verde">
                <span className="absolute right-0.5 h-4 w-4 rounded-full bg-white" />
              </span>
              Somente recebendo proposta
            </label>
            <div className="ml-auto">
              <OrdenarSelect value={ordem} onChange={setOrdem} />
            </div>
          </div>

          {/* split: feed + filtros */}
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {carregando && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-borda bg-white p-10 text-cinza">
                  <Loader2 size={18} className="animate-spin" /> Carregando licitações…
                </div>
              )}
              {!carregando && erro && (
                <div className="rounded-2xl border border-[#FDE7E7] bg-[#FEF2F2] p-6 text-[13px] text-[#B91C1C]">
                  Não foi possível carregar as licitações agora: {erro}
                </div>
              )}
              {!carregando && !erro && listaPagina.length === 0 && (
                <div className="rounded-2xl border border-borda bg-white p-8 text-center text-[13.5px] text-cinza">
                  Nenhuma licitação encontrada com esses termos.
                </div>
              )}
              {!carregando &&
                !erro &&
                listaPagina.map((l) => <LicitacaoCard key={l.id} l={l} />)}
            </div>
            <Filtros />
          </div>

          {/* paginação */}
          <div className="mt-6 flex items-center justify-center gap-3 text-[13px] text-cinza">
            <button
              aria-label="Anterior"
              disabled={paginaSegura <= 1}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-borda bg-white text-cinza transition hover:border-violeta hover:text-violeta disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="rounded-lg border border-borda bg-white px-3.5 py-1.5 font-display font-semibold text-indigo-deep">
              {paginaSegura}
            </span>
            <span>de {totalPaginas}</span>
            <button
              aria-label="Próxima"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              className="grid h-9 w-9 place-items-center rounded-lg border border-borda bg-white text-cinza transition hover:border-violeta hover:text-violeta disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- componentes ---------- */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep">
      {children}
      <ChevronDown size={14} className="text-cinza" />
    </button>
  );
}

const ordemOpcoes = [
  { id: "relevancia", label: "Relevância" },
  { id: "abertura", label: "Abertura mais próxima" },
  { id: "recente", label: "Recém-publicada" },
];

function OrdenarSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const atual = ordemOpcoes.find((o) => o.id === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep"
      >
        Ordenar por: <b className="font-semibold">{atual?.label}</b>
        <ChevronDown size={14} className="text-cinza" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[230px] rounded-xl border border-borda bg-white p-1.5 shadow-xl">
          {ordemOpcoes.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                onChange(o.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition hover:bg-[#F5F3FF]"
            >
              <span className="flex-1 text-indigo-deep">{o.label}</span>
              {value === o.id && <CheckIcon size={15} className="text-violeta" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* LicitacaoCard + Meta extraídos para components/widgets/licitacao-card.tsx (Fase A) */

/* ---------- painel de filtros ---------- */

const selectCls =
  "h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta appearance-none";
const inputCls =
  "h-11 w-full rounded-lg border border-borda bg-white px-3 text-[13px] text-ink outline-none focus:border-violeta";

function Filtros() {
  return (
    <aside className="h-fit rounded-2xl border border-borda bg-white p-5 lg:sticky lg:top-[88px]">
      <h3 className="mb-4 font-display text-[15px] font-semibold text-indigo-deep">
        Filtros de Pesquisa
      </h3>

      <div className="space-y-4">
        <Campo label="Modalidade">
          <Select placeholder="Selecionar modalidade" />
        </Campo>
        <Campo label="Estado">
          <Select placeholder="Selecionar estado" />
        </Campo>
        <Campo label="Cidade">
          <Select placeholder="Selecionar cidade" />
        </Campo>
        <Campo label="Portal">
          <Select placeholder="Pesquisar portal" />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Rotulo>Registro de Preço</Rotulo>
            <Check label="Sim" />
            <Check label="Não" />
          </div>
          <div>
            <Rotulo>Esfera</Rotulo>
            <Check label="Municipal" />
            <Check label="Estadual" />
          </div>
        </div>

        <Campo label="Palavras indesejadas">
          <input className={inputCls} placeholder="Termos que não quer ver" />
        </Campo>
        <Campo label="Código UASG">
          <input className={inputCls} placeholder="Código UASG do órgão" />
        </Campo>
        <Campo label="Número da compra">
          <input className={inputCls} placeholder="Ex: 90001/2026" />
        </Campo>
        <Campo label="Valor da compra total (estimado)">
          <div className="flex items-center gap-2">
            <input className={inputCls} placeholder="Mín." />
            <span className="text-cinza">—</span>
            <input className={inputCls} placeholder="Máx." />
          </div>
        </Campo>
        <Campo label="Valor do item (estimado)">
          <div className="flex items-center gap-2">
            <input className={inputCls} placeholder="Mín." />
            <span className="text-cinza">—</span>
            <input className={inputCls} placeholder="Máx." />
          </div>
        </Campo>
        <Campo label="Modo de disputa">
          <Select placeholder="Selecionar modo" />
        </Campo>
        <Campo label="Órgão">
          <Select placeholder="Selecionar órgão" />
        </Campo>

        <div className="flex gap-2 pt-1">
          <button className="flex-1 rounded-lg bg-laranja py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
            Aplicar filtros
          </button>
          <button className="rounded-lg border border-borda px-3 py-2.5 font-display text-[13px] font-semibold text-cinza transition hover:border-violeta hover:text-violeta">
            Limpar
          </button>
        </div>
      </div>
    </aside>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Rotulo>{label}</Rotulo>
      {children}
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block font-display text-[12px] font-semibold text-indigo-deep">
      {children}
    </label>
  );
}

function Select({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative">
      <select className={selectCls} defaultValue="">
        <option value="" disabled>
          {placeholder}
        </option>
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cinza"
      />
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[13px] text-ink">
      <input type="checkbox" className="h-4 w-4 accent-violeta" />
      {label}
    </label>
  );
}
