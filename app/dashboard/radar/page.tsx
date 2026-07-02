"use client";

import { useState } from "react";
import {
  Sparkles,
  Heart,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Rss,
  ListTree,
  FileText,
  BarChart3,
  Plus,
  Bookmark,
} from "lucide-react";
import { ConverseRadarModal } from "@/components/converse-radar-modal";

function scoreBand(n: number) {
  if (n >= 70) return { label: "Bom", bg: "#DCFCE7", fg: "#15803D" };
  if (n >= 50) return { label: "Regular", bg: "#FEF3E2", fg: "#B45309" };
  return { label: "Baixo", bg: "#FDE7E7", fg: "#B91C1C" };
}

type Licitacao = {
  id: string;
  portal: string;
  score: number;
  titulo: string;
  objeto: string;
  publicacao: string;
  abertura: string;
  disputa: string;
  registro: string;
  valor: string;
  cidade: string;
};

const mock: Licitacao[] = [
  {
    id: "l1",
    portal: "Itaipu",
    score: 80,
    titulo: "DISPENSA DE LICITAÇÃO NF 0840-26/2026 — ITAIPU BINACIONAL · CORI.DF",
    objeto: "Aquisição de insumos e materiais para uso em ambulância e no ambulatório.",
    publicacao: "29/06/2026",
    abertura: "22/06/2026 às 10:00",
    disputa: "Dispensa",
    registro: "Não",
    valor: "R$ 23.185,57",
    cidade: "Foz do Iguaçu/PR",
  },
  {
    id: "l2",
    portal: "Itaipu",
    score: 80,
    titulo: "DISPENSA DE LICITAÇÃO AF 0485-26/2026 — ITAIPU BINACIONAL · CORA.DF",
    objeto: "Chapas, barras, perfis de aço e lençol de borracha.",
    publicacao: "29/06/2026",
    abertura: "27/05/2026 às 15:00",
    disputa: "Dispensa",
    registro: "Não",
    valor: "R$ 71.952,95",
    cidade: "Foz do Iguaçu/PR",
  },
  {
    id: "l3",
    portal: "SPIEMT",
    score: 75,
    titulo: "DISPENSA DE LICITAÇÃO OC 0477-06/2026 — SESI · ESCOLA CUIABÁ",
    objeto: "Aquisição de material de limpeza e higiene para atender ao SESI Escola Cuiabá.",
    publicacao: "29/06/2026",
    abertura: "19/06/2026 às 08:00",
    disputa: "Dispensa",
    registro: "Não",
    valor: "R$ 262,00",
    cidade: "Cuiabá/MT",
  },
];

type Filtro = { id: string; nome: string; matches: number };
const filtrosMock: Filtro[] = [
  { id: "f1", nome: "Medicamentos — Sudeste", matches: 17245 },
  { id: "f2", nome: "Internet — Nordeste", matches: 5875 },
  { id: "f3", nome: "Informática — ES", matches: 320 },
];

export default function RadarPage() {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [mostrarOcultas, setMostrarOcultas] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);

  const visiveis = mostrarOcultas ? mock : mock.filter((l) => !ocultas.includes(l.id));

  return (
    <>
      {/* cabeçalho */}
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">
          Radar de Licitações
        </h1>
        <p className="mt-1 max-w-[600px] text-[13.5px] text-cinza">
          Configure filtros para receber diariamente recomendações de licitações
          publicadas e analise as melhores oportunidades para a sua empresa.
        </p>
      </div>

      {/* barra topo */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="font-display text-[14px] font-bold text-indigo-deep">
          17.245 <span className="font-medium text-cinza">licitações</span>
        </span>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => setConversaAberta(true)}
            className="flex items-center gap-2 rounded-lg bg-violeta px-3.5 py-2 font-display text-[13px] font-semibold text-white transition hover:bg-roxo"
          >
            <Sparkles size={15} /> Converse com Radar
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">Beta</span>
          </button>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-cinza">
            <button
              type="button"
              onClick={() => setMostrarOcultas((v) => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition"
              style={{ background: mostrarOcultas ? "#5B21B6" : "#CBD5E1" }}
            >
              <span
                className="absolute h-4 w-4 rounded-full bg-white transition-all"
                style={{ left: mostrarOcultas ? "18px" : "2px" }}
              />
            </button>
            Mostrar ocultas
          </label>
        </div>
      </div>

      {/* filtros rápidos */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Pill>Publicação</Pill>
        <Pill>Últimos 7 dias</Pill>
      </div>

      {/* split: feed + painel de radares */}
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {visiveis.map((l) => (
            <LicitacaoCard
              key={l.id}
              l={l}
              oculta={ocultas.includes(l.id)}
              onOcultar={() =>
                setOcultas((h) =>
                  h.includes(l.id) ? h.filter((x) => x !== l.id) : [...h, l.id]
                )
              }
            />
          ))}
          {visiveis.length === 0 && (
            <div className="rounded-2xl border border-dashed border-borda bg-white py-14 text-center text-[13px] text-cinza">
              Nenhuma licitação visível. Ative "Mostrar ocultas" para revê-las.
            </div>
          )}
        </div>

        <PainelRadares />
      </div>

      {/* paginação */}
      <div className="mt-6 flex items-center justify-center gap-3 text-[13px] text-cinza">
        <button aria-label="Anterior" className="grid h-9 w-9 place-items-center rounded-lg border border-borda bg-white transition hover:border-violeta hover:text-violeta">
          <ChevronLeft size={16} />
        </button>
        <span className="rounded-lg border border-borda bg-white px-3.5 py-1.5 font-display font-semibold text-indigo-deep">
          1
        </span>
        <span>de 1.725</span>
        <button aria-label="Próxima" className="grid h-9 w-9 place-items-center rounded-lg border border-borda bg-white transition hover:border-violeta hover:text-violeta">
          <ChevronRight size={16} />
        </button>
      </div>

      <p className="mt-4 text-center text-[12px] text-cinza">
        Dados de exemplo. O monitoramento real roda via PNCP + cron quando ligarmos o banco ao front.
      </p>

      <ConverseRadarModal open={conversaAberta} onClose={() => setConversaAberta(false)} />
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex items-center gap-1.5 rounded-lg border border-borda bg-white px-3 py-2 text-[13px] font-medium text-indigo-deep">
      {children}
      <ChevronDown size={14} className="text-cinza" />
    </button>
  );
}

function LicitacaoCard({
  l,
  oculta,
  onOcultar,
}: {
  l: Licitacao;
  oculta: boolean;
  onOcultar: () => void;
}) {
  const [tab, setTab] = useState<"detalhes" | "arquivos" | "dados" | "avisos">("detalhes");
  const [fav, setFav] = useState(false);
  const s = scoreBand(l.score);

  return (
    <div className="rounded-2xl border border-borda bg-white p-5" style={{ opacity: oculta ? 0.6 : 1 }}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 rounded-full bg-[#FFE9D6] px-2.5 py-1 font-display text-[11px] font-semibold text-[#B45309]">
          <FileText size={12} /> {l.portal}
        </span>
        <span
          className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold"
          style={{ background: s.bg, color: s.fg }}
        >
          <BarChart3 size={12} /> Score {l.score} · {s.label}
        </span>
        <button onClick={() => setFav((v) => !v)} aria-label="Favoritar" className="text-cinza hover:text-laranja" style={{ color: fav ? "#FF6600" : undefined }}>
          <Heart size={17} fill={fav ? "#FF6600" : "none"} />
        </button>
        <button aria-label="Compartilhar" className="text-cinza hover:text-violeta"><Share2 size={16} /></button>
        <button aria-label="Abrir" className="text-cinza hover:text-violeta"><ExternalLink size={16} /></button>
      </div>

      <h3 className="mt-3 font-display text-[15px] font-bold leading-snug text-indigo-deep">{l.titulo}</h3>

      <div className="mt-3 flex gap-5 border-b border-borda">
        {(
          [
            ["detalhes", "Detalhes"],
            ["arquivos", "Arquivos"],
            ["dados", "Dados adicionais"],
            ["avisos", "Quadro de avisos"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={[
              "-mb-px border-b-2 pb-2 text-[12.5px] font-semibold transition",
              tab === k ? "border-laranja text-indigo-deep" : "border-transparent text-cinza hover:text-indigo-deep",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        {tab === "detalhes" && (
          <>
            <p className="text-[13px] leading-relaxed text-ink">{l.objeto}</p>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <Meta label="Publicação" valor={l.publicacao} />
              <Meta label="Modo de disputa" valor={l.disputa} />
              <Meta label="Valor total estimado" valor={l.valor} />
              <Meta label="Abertura" valor={l.abertura} />
              <Meta label="Registro de preço" valor={l.registro} />
              <Meta label="Cidade" valor={l.cidade} />
            </div>
          </>
        )}
        {tab === "arquivos" && (
          <p className="py-3 text-[13px] text-cinza">Edital, TR e anexos — leitura por IA ao salvar para análise.</p>
        )}
        {tab === "dados" && (
          <div className="grid gap-x-6 gap-y-3 py-1 sm:grid-cols-3">
            <Meta label="Portal" valor={l.portal} />
            <Meta label="Registro de preço" valor={l.registro} />
          </div>
        )}
        {tab === "avisos" && <p className="py-3 text-[13px] text-cinza">Nenhum aviso publicado até o momento.</p>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button className="rounded-xl bg-laranja py-3 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover">
          Participar
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DDD0F7] bg-[#F5F3FF] py-3 font-display text-[13px] font-semibold text-violeta transition hover:bg-[#EDE7FB]">
          <Bookmark size={15} /> Salvar para análise
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-violeta py-3 font-display text-[13px] font-semibold text-white transition hover:bg-roxo">
          <Sparkles size={15} /> Converse com o edital
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onOcultar}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-cinza transition hover:text-vermelho"
        >
          <EyeOff size={14} /> {oculta ? "Reexibir licitação" : "Ocultar licitação"}
        </button>
        <button className="flex items-center gap-1.5 text-[12.5px] font-semibold text-violeta">
          <ListTree size={14} /> Ver itens do edital
          <ChevronDown size={14} />
        </button>
      </div>
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

function PainelRadares() {
  return (
    <aside className="h-fit rounded-2xl border border-borda bg-white p-5 lg:sticky lg:top-[88px]">
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
          <Rss size={14} />
        </span>
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Radares salvos</h3>
      </div>
      <p className="mb-4 text-[12px] text-cinza">
        Selecione um filtro para exibir os resultados do seu Radar.
      </p>

      <div className="space-y-2">
        {filtrosMock.map((f) => (
          <button
            key={f.id}
            className="flex w-full items-center gap-2 rounded-xl border border-borda px-3 py-2.5 text-left transition hover:border-violeta"
          >
            <span className="min-w-0 flex-1 truncate font-display text-[13px] font-semibold text-indigo-deep">
              {f.nome}
            </span>
            <span className="rounded-full bg-laranja px-2 py-0.5 font-display text-[11px] font-bold text-white">
              {f.matches.toLocaleString("pt-BR")}
            </span>
            <ChevronRight size={15} className="text-cinza" />
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-borda pt-4">
        <button className="flex items-center justify-center gap-1.5 rounded-lg border border-borda py-2.5 font-display text-[13px] font-semibold text-indigo-deep transition hover:border-violeta">
          <Plus size={15} /> Adicionar novo filtro
        </button>
        <button className="flex items-center justify-center gap-1.5 rounded-lg bg-violeta py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo">
          <Sparkles size={15} /> Criar com IA
        </button>
      </div>
    </aside>
  );
}
