"use client";

import { useState } from "react";
import {
  X,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Send,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Layers,
  Truck,
  Clock,
  ShieldCheck,
  Heart,
  Share2,
  ExternalLink,
  ListTree,
  BarChart3,
  Check,
  ChevronUp,
  Info,
  type LucideIcon,
} from "lucide-react";

type Highlight =
  | "Maior Valor"
  | "Alta Complexidade"
  | "Risco Logístico"
  | "Melhor Prazo"
  | "Baixo Risco/Valor"
  | "Risco Extremo/Destoante";

const hl: Record<Highlight, { bg: string; fg: string; Icon: LucideIcon }> = {
  "Maior Valor": { bg: "#DBEAFE", fg: "#1E40AF", Icon: TrendingUp },
  "Alta Complexidade": { bg: "#EDE7FB", fg: "#5B21B6", Icon: Layers },
  "Risco Logístico": { bg: "#FEF3E2", fg: "#B45309", Icon: Truck },
  "Melhor Prazo": { bg: "#DCFCE7", fg: "#15803D", Icon: Clock },
  "Baixo Risco/Valor": { bg: "#F1F5F9", fg: "#475569", Icon: ShieldCheck },
  "Risco Extremo/Destoante": { bg: "#DBEAFE", fg: "#1E40AF", Icon: Info },
};

const modos = [
  { id: "rapido", titulo: "Rápido", desc: "Menos raciocínio, respostas diretas" },
  { id: "detalhado", titulo: "Detalhado", desc: "Raciocínio equilibrado" },
  { id: "profundo", titulo: "Profundo", desc: "Mais raciocínio, análises complexas" },
];

type Comparativo = {
  portal: string;
  score: number;
  titulo: string;
  destaque: Highlight;
  insight: string;
  objeto: string;
  publicacao: string;
  disputa: string;
  valor: string;
  cidade: string;
};

const comparativo: Comparativo[] = [
  {
    portal: "Licitações-e",
    score: 75,
    titulo: "PREGÃO ELETRÔNICO PE046/2026 — MUNICÍPIO DE SÃO CARLOS",
    destaque: "Maior Valor",
    insight: "Maior valor total (R$ 37,8M) do filtro; risco técnico moderado.",
    objeto: "Instalação e aquisição de sinalização de trânsito horizontal e vertical.",
    publicacao: "29/06/2026",
    disputa: "Aberto",
    valor: "R$ 37.830.724,61",
    cidade: "São Carlos/SP",
  },
  {
    portal: "Licitações-e",
    score: 90,
    titulo: "CONCORRÊNCIA ELETRÔNICA 091/2026 — ESTADO DA BAHIA",
    destaque: "Alta Complexidade",
    insight: "Alto valor (R$ 16,4M) para pavimentação; exige alta capacidade operacional.",
    objeto: "Pavimentação do trecho São Félix do Coribe, extensão de 14,02 km.",
    publicacao: "29/06/2026",
    disputa: "Aberto-Fechado",
    valor: "R$ 16.442.313,38",
    cidade: "Salvador/BA",
  },
  {
    portal: "Portal de Compras Públicas",
    score: 70,
    titulo: "PREGÃO ELETRÔNICO 011/2026 — PREFEITURA DE RURÓPOLIS",
    destaque: "Risco Logístico",
    insight: "R$ 10,3M em medicamentos; risco logístico alto pela quantidade de itens (387).",
    objeto: "Registro de preços para medicamentos da farmácia hospitalar.",
    publicacao: "29/06/2026",
    disputa: "Aberto",
    valor: "R$ 10.347.610,28",
    cidade: "Rurópolis/PA",
  },
  {
    portal: "Licitações-e",
    score: 89,
    titulo: "PREGÃO ELETRÔNICO LC085/2026 — EMBASA",
    destaque: "Melhor Prazo",
    insight: "Prazo longo: encerramento em 10/09/2026, permite preparação detalhada.",
    objeto: "Obras do sistema de esgotamento sanitário de Eunápolis (1ª etapa).",
    publicacao: "29/06/2026",
    disputa: "Fechado",
    valor: "Sigiloso",
    cidade: "Salvador/BA",
  },
  {
    portal: "Itaipu",
    score: 80,
    titulo: "DISPENSA DE LICITAÇÃO NE 0901-26/2026 — ITAIPU BINACIONAL · CORE.DF",
    destaque: "Risco Extremo/Destoante",
    insight: "Risco crítico: preço unitário de fita rotuladora em R$ 200 mil; provável erro de cadastro.",
    objeto: "Aquisição de cinta/fita rotuladora e materiais correlatos.",
    publicacao: "29/06/2026",
    disputa: "Dispensa",
    valor: "R$ 19.599.954,00",
    cidade: "Foz do Iguaçu/PR",
  },
];

type Msg =
  | { id: number; role: "ia"; texto: string; cards?: Comparativo[] }
  | { id: number; role: "user"; texto: string };

const chips = [
  "Quais licitações devo olhar primeiro?",
  "Encontre itens destoantes",
  "Separe aderentes e fora do filtro",
  "Compare por valor, prazo e risco",
  "Favorite as melhores oportunidades",
];

const saudacao: Msg = {
  id: 0,
  role: "ia",
  texto:
    "Olá! Carreguei as licitações deste filtro do Radar. Posso comparar oportunidades, achar itens destoantes ou priorizar o que vale olhar primeiro.",
};

export function ConverseRadarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([saudacao]);
  const [input, setInput] = useState("");
  const [modo, setModo] = useState("profundo");
  const [modoAberto, setModoAberto] = useState(false);

  if (!open) return null;

  function enviar(texto: string) {
    const t = texto.trim();
    if (!t) return;
    const base = msgs.length;
    const user: Msg = { id: base + 1, role: "user", texto: t };
    const comparar = /compar|valor|prazo|risco|primeiro|destoante/i.test(t);
    const ia: Msg = comparar
      ? {
          id: base + 2,
          role: "ia",
          texto:
            "Aqui está o comparativo das oportunidades com maior destaque em volume financeiro, prazo e alertas de risco identificados no contexto.",
          cards: comparativo,
        }
      : {
          id: base + 2,
          role: "ia",
          texto:
            "Posso priorizar por valor, prazo, risco ou aderência ao seu perfil. Toque em um dos atalhos abaixo ou me diga o critério.",
        };
    setMsgs((m) => [...m, user, ia]);
    setInput("");
  }

  return (
    <div className="fixed inset-0 z-[70] flex bg-black/40">
      <div className="ml-auto flex h-full w-[min(1100px,94vw)] flex-col bg-[#F8FAFC] shadow-2xl">
        {/* header */}
        <div className="flex items-center gap-2 border-b border-borda bg-white px-6 py-4">
          <h2 className="font-display text-[15px] font-bold text-indigo-deep">
            Converse com Radar — Sentinela IA
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="ml-auto text-cinza hover:text-indigo-deep">
            <X size={20} />
          </button>
        </div>

        {/* mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-[820px] space-y-6">
            {msgs.map((m) =>
              m.role === "ia" ? (
                <div key={m.id}>
                  <div className="mb-1.5 font-display text-[13px] font-bold text-violeta">Sentinela IA</div>
                  <div className="border-l-2 border-violeta pl-4">
                    <p className="text-[14px] leading-relaxed text-ink">{m.texto}</p>
                    {m.cards && (
                      <div className="mt-4 space-y-3">
                        {m.cards.map((c) => (
                          <ComparativoCard key={c.titulo} c={c} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 pl-4 text-cinza">
                    <Copy size={15} className="cursor-pointer hover:text-violeta" />
                    <RefreshCw size={15} className="cursor-pointer hover:text-violeta" />
                    <ThumbsUp size={15} className="cursor-pointer hover:text-verde" />
                    <ThumbsDown size={15} className="cursor-pointer hover:text-vermelho" />
                  </div>
                </div>
              ) : (
                <div key={m.id}>
                  <div className="mb-1.5 font-display text-[13px] font-bold text-indigo-deep">Você</div>
                  <p className="text-[14px] leading-relaxed text-ink">{m.texto}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* rodapé: chips + input */}
        <div className="border-t border-borda bg-white px-6 py-4">
          <div className="mx-auto max-w-[820px]">
            <div className="mb-3 flex flex-wrap gap-2">
              {chips.map((c) => (
                <button
                  key={c}
                  onClick={() => enviar(c)}
                  className="rounded-full border border-borda bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-indigo-deep transition hover:border-violeta hover:text-violeta"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="rounded-xl border-[1.5px] border-borda bg-white focus-within:border-violeta">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(input);
                  }
                }}
                rows={2}
                placeholder="Escreva sua mensagem…"
                className="w-full resize-none bg-transparent px-4 pt-3 text-sm text-ink outline-none"
              />
              <div className="flex items-center gap-2 px-3 pb-2.5">
                <span className="text-[11px] text-cinza">Enter envia · Shift+Enter quebra linha</span>
                <div className="ml-auto flex items-center gap-2">
                  <button aria-label="Anexar" className="grid h-8 w-8 place-items-center rounded-lg border border-borda text-cinza hover:border-violeta">
                    <Paperclip size={15} />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModoAberto((v) => !v)}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-borda bg-white px-3 text-[12px] font-medium text-indigo-deep"
                    >
                      {modos.find((m) => m.id === modo)?.titulo}
                      <ChevronUp size={13} className="text-cinza" />
                    </button>
                    {modoAberto && (
                      <div className="absolute bottom-full right-0 z-10 mb-2 w-[270px] rounded-xl border border-borda bg-white p-1.5 shadow-xl">
                        {modos.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setModo(m.id);
                              setModoAberto(false);
                            }}
                            className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[#F5F3FF]"
                          >
                            <div className="flex-1">
                              <div className="font-display text-[13px] font-semibold text-indigo-deep">
                                {m.titulo}
                              </div>
                              <div className="text-[11.5px] text-cinza">{m.desc}</div>
                            </div>
                            {modo === m.id && <Check size={15} className="mt-0.5 shrink-0 text-violeta" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => enviar(input)}
                    aria-label="Enviar"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-laranja text-white transition hover:bg-laranja-hover"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 rounded-lg bg-[#FEF9E7] px-3 py-2 text-[11.5px] text-[#92660C]">
              <span>
                ⚠ O Converse com Radar está em beta e pode errar ou deixar passar oportunidades — revisão humana
                recomendada.
              </span>
              <button className="ml-auto font-semibold text-laranja">Enviar feedback</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparativoCard({ c }: { c: Comparativo }) {
  const h = hl[c.destaque];
  const Icon = h.Icon;
  const scoreCor = c.score >= 70 ? { bg: "#DCFCE7", fg: "#15803D" } : { bg: "#FEF3E2", fg: "#B45309" };

  return (
    <div className="rounded-xl border border-borda bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#FFE9D6] px-2.5 py-1 font-display text-[11px] font-semibold text-[#B45309]">
          {c.portal}
        </span>
        <span
          className="ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 font-display text-[11px] font-bold"
          style={{ background: scoreCor.bg, color: scoreCor.fg }}
        >
          <BarChart3 size={12} /> Score {c.score} · Bom
        </span>
        <Heart size={15} className="text-cinza" />
        <Share2 size={14} className="text-cinza" />
        <ExternalLink size={14} className="text-cinza" />
      </div>

      <h4 className="mt-2.5 font-display text-[13.5px] font-bold leading-snug text-indigo-deep">{c.titulo}</h4>

      {/* destaque (resumo executivo) */}
      <div className="mt-3 flex items-start gap-2.5 rounded-lg p-3" style={{ background: h.bg }}>
        <span className="mt-0.5 shrink-0" style={{ color: h.fg }}>
          <Icon size={16} />
        </span>
        <div>
          <div className="font-display text-[12.5px] font-bold" style={{ color: h.fg }}>
            {c.destaque}
          </div>
          <p className="mt-0.5 text-[12.5px]" style={{ color: h.fg }}>
            {c.insight}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-relaxed text-ink">{c.objeto}</p>
      <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Publicação" valor={c.publicacao} />
        <Meta label="Modo de disputa" valor={c.disputa} />
        <Meta label="Valor estimado" valor={c.valor} />
        <Meta label="Cidade" valor={c.cidade} />
      </div>

      <button className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-violeta">
        <ListTree size={13} /> Ver itens do edital
      </button>
    </div>
  );
}

function Meta({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-cinza">{label}</div>
      <div className="mt-0.5 font-display text-[12px] font-semibold text-indigo-deep">{valor}</div>
    </div>
  );
}
