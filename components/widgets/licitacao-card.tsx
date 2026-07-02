"use client";

// components/widgets/licitacao-card.tsx
// Card de licitação — extraído de app/dashboard/pesquisar-licitacoes/page.tsx
// (Fase A), sem mudança visual. É o widget central da UI generativa (Fase B):
// a resposta do agente para "quais pregões abertos?" renderiza ESTE card.

import { useState } from "react";
import {
  Heart,
  Share2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  BarChart3,
  ListTree,
  FileText,
  Bookmark,
} from "lucide-react";
import type { Tables } from "@/lib/database.types";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/formatar";

export type Licitacao = Tables<"licitacoes">;

export function scoreBand(n: number) {
  if (n >= 70) return { label: "Bom", bg: "#DCFCE7", fg: "#15803D" };
  if (n >= 50) return { label: "Regular", bg: "#FEF3E2", fg: "#B45309" };
  return { label: "Baixo", bg: "#FDE7E7", fg: "#B91C1C" };
}

export function LicitacaoCard({ l }: { l: Licitacao }) {
  const [tab, setTab] = useState<"detalhes" | "arquivos" | "dados" | "avisos">("detalhes");
  const [fav, setFav] = useState(false);
  const temScore = l.score_relevancia !== null && l.score_relevancia !== undefined;
  const s = temScore ? scoreBand(l.score_relevancia as number) : null;

  const titulo = `${(l.modalidade ?? "Licitação").toUpperCase()}${
    l.numero_compra ? ` ${l.numero_compra}` : ""
  }${l.ano_compra ? `/${l.ano_compra}` : ""} — ${l.orgao_nome ?? "Órgão não informado"}`;

  const cidade = l.municipio
    ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}`
    : l.uf ?? "Não informado";

  const registro =
    l.registro_preco === true ? "Sim" : l.registro_preco === false ? "Não" : "Não informado";

  return (
    <div className="rounded-2xl border border-borda bg-white p-5">
      {/* topo */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 rounded-full bg-[#FFE9D6] px-2.5 py-1 font-display text-[11px] font-semibold text-[#B45309]">
          <FileText size={12} /> {l.portal ?? "PNCP"}
        </span>
        {s && (
          <span
            className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold"
            style={{ background: s.bg, color: s.fg }}
          >
            <BarChart3 size={12} /> Score {l.score_relevancia} · {s.label}
          </span>
        )}
        {!s && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#F1F0F4] px-2.5 py-1 font-display text-[11px] font-semibold text-cinza">
            <BarChart3 size={12} /> Raio-X ainda não calculado
          </span>
        )}
        <button
          onClick={() => setFav((v) => !v)}
          aria-label="Favoritar"
          className="text-cinza transition hover:text-laranja"
          style={{ color: fav ? "#FF6600" : undefined }}
        >
          <Heart size={17} fill={fav ? "#FF6600" : "none"} />
        </button>
        <button aria-label="Compartilhar" className="text-cinza hover:text-violeta">
          <Share2 size={16} />
        </button>
        {l.link_sistema_origem ? (
          <a
            href={l.link_sistema_origem}
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir no sistema de origem"
            className="text-cinza hover:text-violeta"
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          <span aria-label="Link indisponível" className="text-borda">
            <ExternalLink size={16} />
          </span>
        )}
      </div>

      {/* título */}
      <h3 className="mt-3 font-display text-[15px] font-bold leading-snug text-indigo-deep">
        {titulo}
      </h3>
      {l.unidade_nome && <p className="mt-0.5 text-[12px] text-cinza">{l.unidade_nome}</p>}

      {/* sub-abas */}
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
              tab === k
                ? "border-laranja text-indigo-deep"
                : "border-transparent text-cinza hover:text-indigo-deep",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* conteúdo da aba */}
      <div className="mt-3.5">
        {tab === "detalhes" && (
          <>
            <p className="text-[13px] leading-relaxed text-ink">
              {l.objeto ?? "Objeto não informado nesta publicação."}
            </p>
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <Meta label="Publicação" valor={formatarData(l.data_publicacao)} />
              <Meta label="Modo de disputa" valor={l.modo_disputa ?? "Não informado"} />
              <Meta label="Valor total estimado" valor={formatarMoeda(l.valor_total)} />
              <Meta label="Abertura" valor={formatarDataHora(l.data_abertura)} />
              <Meta label="Registro de preço" valor={registro} />
              <Meta label="Cidade" valor={cidade} />
            </div>
          </>
        )}
        {tab === "arquivos" && (
          <p className="py-3 text-[13px] text-cinza">
            Edital, Termo de Referência e anexos — leitura por IA disponível ao
            salvar para análise.
          </p>
        )}
        {tab === "dados" && (
          <div className="grid gap-x-6 gap-y-3 py-1 sm:grid-cols-3">
            <Meta label="Modalidade" valor={l.modalidade ?? "Não informado"} />
            <Meta label="Esfera" valor={l.esfera ?? "Não informado"} />
            <Meta label="Portal de origem" valor={l.portal ?? "Não informado"} />
            <Meta label="Nº controle PNCP" valor={l.numero_controle_pncp ?? "Não informado"} />
            <Meta
              label="Encerramento da proposta"
              valor={formatarDataHora(l.data_encerramento_proposta)}
            />
          </div>
        )}
        {tab === "avisos" && (
          <p className="py-3 text-[13px] text-cinza">Nenhum aviso publicado até o momento.</p>
        )}
      </div>

      {/* ações */}
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

      <button className="mt-3 flex w-full items-center justify-center gap-1.5 text-[12.5px] font-semibold text-violeta">
        <ListTree size={14} /> Ver itens do edital
        <ChevronDown size={14} />
      </button>
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
