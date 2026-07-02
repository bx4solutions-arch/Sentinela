"use client";

import { useState } from "react";
import {
  Radar,
  Search,
  MapPin,
  User2,
  CalendarClock,
  Users2,
  Quote,
  Phone,
  Mail,
  ExternalLink,
  Contact,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import { banda, Gauge, SubScore, EixoReal } from "@/components/widgets/score-semaforo";
import { MetricCard as Meta } from "@/components/widgets/metric-card";

/* banda/Gauge/SubScore/EixoReal extraídos para components/widgets/score-semaforo.tsx (Fase A) */

/* ---------- dado de exemplo (PRD — Seção 7), mostrado até o usuário rodar uma busca real ---------- */
const exemplo = {
  orgao: "Prefeitura de Cariacica",
  uf: "ES",
  esfera: "Municipal",
  prefeito: "Fulano de Tal",
  mandato: "2º mandato · 2º ano",
  populacao: "383.917 hab.",
  scores: { capacidade: 82, apetite: 74, acesso: 68 },
  resumo:
    "Receita per capita acima da média do estado e folga fiscal confortável. Na sua área (saúde), orçado em R$3,2M, com execução de 78% no último ano e tendência de alta — já comprou sua categoria 2x no PNCP, e o último contrato vence em 4 meses. A Prefeitura recebeu uma emenda de R$1,5M do Dep. Fulano de Tal (Partido X), destinada à sua área em março/2025 — já empenhada e ainda não gasta.",
  porta: "Secretário de Saúde — mesma secretaria que já comprou sua categoria 2x.",
  drivers: {
    capacidade: [
      ["Folga fiscal", "Confortável (RCL − pessoal − dívida)"],
      ["Receita per capita", "Acima da média do ES"],
      ["CAPAG", "B"],
      ["Dependência de FPM", "Baixa"],
    ],
    apetite: [
      ["Execução da função-alvo", "78% do orçado (R$3,2M)"],
      ["Tendência 3 anos", "Em alta"],
      ["Reforço orçamentário via emenda", "+R$1,5M — empenhada, ainda não paga"],
    ],
    acesso: [
      ["Recompra no PNCP", "2x — contrato vence em 4 meses"],
      ["Prazo de execução da emenda", "Vence em 5 meses"],
    ],
  },
};

/* ---------- contatos estratégicos (estrutura que o harvester vai preencher — hoje só existe no modo exemplo) ---------- */
type FonteContato = "TSE" | "Edital" | "PNCP" | "CNPJ" | "Curado";
type ContatoOrgao = {
  nome: string;
  cargo: string;
  secretaria?: string;
  telefone?: string;
  email?: string;
  link?: string;
  fonte: FonteContato;
  origem: string;
  data: string;
};

const contatosExemplo: ContatoOrgao[] = [
  {
    nome: "Fulano de Tal",
    cargo: "Prefeito",
    telefone: "(27) 3354-0000",
    email: "gabinete@cariacica.es.gov.br",
    link: "https://www.cariacica.es.gov.br",
    fonte: "TSE",
    origem: "TSE — eleitos 2024",
    data: "atualizado em 01/2025",
  },
  {
    nome: "Dra. Maria da Silva",
    cargo: "Secretária de Saúde",
    secretaria: "Secretaria Municipal de Saúde",
    telefone: "(27) 3354-0100",
    email: "saude@cariacica.es.gov.br",
    fonte: "Curado",
    origem: "Curadoria BX4 + Querido Diário",
    data: "atualizado em 06/2026",
  },
  {
    nome: "Beltrano de Souza",
    cargo: "Pregoeiro / Agente de contratação",
    telefone: "(27) 3354-0200",
    email: "licitacao@cariacica.es.gov.br",
    fonte: "Edital",
    origem: "Edital PE 90014/2026",
    data: "visto em 12/06/2026",
  },
  {
    nome: "Setor de Compras",
    cargo: "Unidade compradora",
    secretaria: "Secretaria de Administração",
    telefone: "(27) 3354-0300",
    email: "compras@cariacica.es.gov.br",
    fonte: "PNCP",
    origem: "PNCP — unidade compradora",
    data: "atualizado em 06/2026",
  },
];

const fonteCor: Record<FonteContato, { bg: string; fg: string }> = {
  TSE: { bg: "#DBEAFE", fg: "#1E40AF" },
  Edital: { bg: "#EDE7FB", fg: "#5B21B6" },
  PNCP: { bg: "#E0F2FE", fg: "#0369A1" },
  CNPJ: { bg: "#F1F5F9", fg: "#475569" },
  Curado: { bg: "#FEF3E2", fg: "#B45309" },
};

/* ---------- dado real ---------- */
type OrgaoRow = Database["public"]["Tables"]["orgaos"]["Row"];
type FiscalRow = Database["public"]["Tables"]["orgao_fiscal"]["Row"];
type ScoreRow = Database["public"]["Tables"]["orgao_score"]["Row"];
type EmendaRow = Database["public"]["Tables"]["emendas"]["Row"];

type ResultadoReal = {
  orgao: OrgaoRow;
  fiscal: FiscalRow | null;
  totalLicitacoes: number;
  licitacoes12m: number;
  temExecucaoFuncao: boolean;
  emendas: EmendaRow[];
  score: ScoreRow | null;
};

function formatBRL(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const esferaLabel: Record<string, string> = { M: "Municipal", E: "Estadual", F: "Federal" };
const poderLabel: Record<string, string> = { E: "Executivo", L: "Legislativo", J: "Judiciário" };

export default function RaioXPage() {
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"exemplo" | "real">("exemplo");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [real, setReal] = useState<ResultadoReal | null>(null);

  async function rodarBusca(e: React.FormEvent) {
    e.preventDefault();
    const termo = busca.trim();
    if (!termo) {
      setModo("exemplo");
      return;
    }

    setModo("real");
    setLoading(true);
    setErro(null);
    setReal(null);

    const supabase = createClient();

    const { data: orgaosEncontrados, error: erroOrgao } = await supabase
      .from("orgaos")
      .select<"*", OrgaoRow>("*")
      .or(`nome.ilike.%${termo}%,codigo_ibge.eq.${termo},cnpj.eq.${termo}`)
      .limit(5);

    if (erroOrgao || !orgaosEncontrados || orgaosEncontrados.length === 0) {
      setErro(
        `Nenhum órgão encontrado para "${termo}". O piloto real hoje cobre Teresina/PI — outros municípios entram conforme o harvester é escopado pra eles.`
      );
      setLoading(false);
      return;
    }

    const orgao = orgaosEncontrados[0];

    // Licitações são publicadas por "órgãos participantes" (secretaria/fundação,
    // CNPJ próprio) — não pela linha canônica do ente federativo que aparece
    // aqui (mesma separação de conceitos corrigida no siconfi-harvester, ver
    // sentinela-siconfi na memória do projeto). Por isso o sinal de acesso
    // institucional é filtrado por município/UF, não por orgao_id: contar só
    // pelo orgao_id da linha canônica sempre daria 0, mesmo com licitações
    // reais publicadas por secretarias daquele município.
    let licitacoesBase = supabase.from("licitacoes").select("*", { count: "exact", head: true });
    if (orgao.uf) licitacoesBase = licitacoesBase.eq("uf", orgao.uf);
    licitacoesBase = licitacoesBase.ilike("municipio", `%${termo}%`);

    let licitacoes12mBase = supabase.from("licitacoes").select("*", { count: "exact", head: true });
    if (orgao.uf) licitacoes12mBase = licitacoes12mBase.eq("uf", orgao.uf);
    licitacoes12mBase = licitacoes12mBase
      .ilike("municipio", `%${termo}%`)
      .gte("data_publicacao", new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString());

    const [
      { data: fiscalRows },
      { count: totalLicitacoes },
      { count: licitacoes12m },
      { count: execucaoCount },
      { data: emendasRows },
      { data: scoreRow },
    ] = await Promise.all([
      supabase.from("orgao_fiscal").select("*").eq("orgao_id", orgao.id).order("ano", { ascending: false }).limit(1),
      licitacoesBase,
      licitacoes12mBase,
      supabase.from("orgao_execucao_funcao").select("*", { count: "exact", head: true }).eq("orgao_id", orgao.id),
      supabase.from("emendas").select("*").eq("orgao_id", orgao.id),
      supabase.from("orgao_score").select("*").eq("orgao_id", orgao.id).maybeSingle(),
    ]);

    setReal({
      orgao,
      fiscal: fiscalRows?.[0] ?? null,
      totalLicitacoes: totalLicitacoes ?? 0,
      licitacoes12m: licitacoes12m ?? 0,
      temExecucaoFuncao: (execucaoCount ?? 0) > 0,
      emendas: emendasRows ?? [],
      score: scoreRow ?? null,
    });
    setLoading(false);
  }

  return (
    <>
      {/* cabeçalho */}
      <div>
        <h1 className="flex items-center gap-2 font-display text-[22px] font-bold text-indigo-deep">
          Raio-X do Órgão
          <span className="rounded-full border border-[#DDD0F7] bg-[#EDE7FB] px-2.5 py-[3px] font-display text-[10px] font-bold tracking-wide text-violeta">
            ★ DIFERENCIAL
          </span>
        </h1>
        <p className="mt-1 max-w-[620px] text-[13.5px] text-cinza">
          Descubra, antes do edital existir, se o órgão tem dinheiro, gasta na sua
          área e se você consegue entrar. O semáforo é o <b>menor</b> dos três eixos.
        </p>
      </div>

      {/* busca */}
      <form onSubmit={rodarBusca} className="mt-5 flex gap-3">
        <div className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-borda bg-white px-4 text-cinza focus-within:border-violeta">
          <Search size={18} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite o município, órgão, CNPJ ou código IBGE (ex.: Teresina)"
            className="flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-laranja px-5 font-display text-sm font-semibold text-white transition hover:bg-laranja-hover">
          <Radar size={17} /> Rodar Raio-X
        </button>
      </form>

      {modo === "exemplo" && <RaioXExemplo />}

      {modo === "real" && loading && (
        <div className="mt-8 flex flex-col items-center gap-3 py-14 text-cinza">
          <Loader2 size={26} className="animate-spin text-violeta" />
          <span className="text-[13px]">Consultando dado real…</span>
        </div>
      )}

      {modo === "real" && !loading && erro && (
        <div className="mt-5 rounded-2xl border border-[#FBD5D5] bg-[#FDE7E7] p-5 text-[13.5px] text-[#B91C1C]">
          {erro}
        </div>
      )}

      {modo === "real" && !loading && real && <RaioXReal r={real} />}
    </>
  );
}

/* ---------- bloco: exemplo ilustrativo (comportamento original, intocado) ---------- */
function RaioXExemplo() {
  const s = exemplo.scores;
  const final = Math.min(s.capacidade, s.apetite, s.acesso);
  const bandaFinal = banda(final);

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-col gap-5 rounded-2xl border border-borda bg-white p-[22px] lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[20px] font-bold text-indigo-deep">
              {exemplo.orgao} — {exemplo.uf}
            </h2>
            <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-cinza">
              exemplo ilustrativo
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Meta icon={<User2 size={14} />} label="Gestor" valor={exemplo.prefeito} />
            <Meta icon={<CalendarClock size={14} />} label="Mandato" valor={exemplo.mandato} />
            <Meta icon={<Users2 size={14} />} label="População" valor={exemplo.populacao} />
            <Meta icon={<MapPin size={14} />} label="Esfera" valor={exemplo.esfera} />
          </div>
        </div>

        <div
          className="flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-8 py-5 lg:w-[230px]"
          style={{ background: bandaFinal.bg }}
        >
          <span className="font-display text-[11px] font-bold uppercase tracking-wide" style={{ color: bandaFinal.texto }}>
            Semáforo final
          </span>
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-4 rounded-full" style={{ background: bandaFinal.hex }} />
            <span className="font-display text-[26px] font-extrabold" style={{ color: bandaFinal.texto }}>
              {bandaFinal.label}
            </span>
          </div>
          <span className="text-[12px] font-medium" style={{ color: bandaFinal.texto }}>
            {final >= 66 ? "Alvo quente — vá" : final >= 45 ? "Investigue antes de ir" : "Não vá"}
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <SubScore titulo="Capacidade" pergunta="Tem dinheiro?" score={s.capacidade} drivers={exemplo.drivers.capacidade} />
        <SubScore
          titulo="Apetite"
          pergunta="Gasta na minha área?"
          score={s.apetite}
          drivers={exemplo.drivers.apetite}
          pesaMais
        />
        <SubScore titulo="Acesso" pergunta="Consigo entrar?" score={s.acesso} drivers={exemplo.drivers.acesso} />
      </div>

      <div className="overflow-hidden rounded-2xl bg-[linear-gradient(110deg,#1E1B4B_0%,#2A2568_55%,#5B21B6_100%)] p-[26px] text-white">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
            <Quote size={16} />
          </span>
          <h3 className="font-display text-[15px] font-semibold">Resumo executivo</h3>
          <span className="ml-auto rounded-full bg-white/15 px-2.5 py-1 font-display text-[10px] font-bold tracking-wide">
            GERADO POR IA · FONTE CITADA
          </span>
        </div>
        <p className="text-[14px] leading-relaxed text-[#E7E3FA]">{exemplo.resumo}</p>
        <div className="mt-4 rounded-xl border border-laranja/40 bg-laranja/10 p-3.5">
          <span className="font-display text-[11px] font-bold uppercase tracking-wide text-laranja">Porta de entrada</span>
          <p className="mt-1 text-[14px] font-medium text-white">{exemplo.porta}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-borda bg-white p-[22px]">
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
            <Contact size={16} />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Contatos Estratégicos</h3>
          <span className="ml-auto rounded-full border border-borda bg-[#F8FAFC] px-2.5 py-1 text-[11px] text-cinza">
            preenchido automaticamente a partir dos editais
          </span>
        </div>
        <p className="mb-4 text-[12.5px] text-cinza">
          Quem decide e por onde falar. Cada contato traz a fonte e a data — a base se
          atualiza a cada novo edital do órgão.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {contatosExemplo.map((c) => (
            <ContatoCard key={c.cargo} c={c} />
          ))}
        </div>
        <p className="mt-3.5 text-[11.5px] text-cinza">
          Use canais institucionais (LGPD). Campos vazios são completados pela curadoria
          da BX4 — revisão humana obrigatória.
        </p>
      </div>

      <p className="text-center text-[12px] text-cinza">
        Dados de exemplo. Digite um município real (ex.: &quot;Teresina&quot;) na busca acima
        pra ver o Raio-X com dado real do piloto. Copiloto, nunca piloto — revisão humana
        obrigatória.
      </p>
    </div>
  );
}

/* ---------- bloco: resultado real (nunca fabrica o que não foi coletado) ---------- */
function RaioXReal({ r }: { r: ResultadoReal }) {
  const o = r.orgao;
  const temPontuacao = !!r.score;

  const bandaFinal = temPontuacao ? banda(r.score!.semaforo === "verde" ? 66 : r.score!.semaforo === "amarelo" ? 45 : 0) : null;

  const emendasAbertas = r.emendas.filter((e) => (e.valor_empenhado ?? 0) > (e.valor_pago ?? 0));

  return (
    <div className="mt-5 space-y-5">
      {/* identificação + veredito */}
      <div className="flex flex-col gap-5 rounded-2xl border border-borda bg-white p-[22px] lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[20px] font-bold text-indigo-deep">
              {o.nome}
              {o.uf ? ` — ${o.uf}` : ""}
            </h2>
            <span className="rounded-full border border-[#BBF0D2] bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">
              dado real
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Meta icon={<User2 size={14} />} label="Gestor" valor={o.prefeito ?? "ainda não coletado"} />
            <Meta
              icon={<CalendarClock size={14} />}
              label="Mandato"
              valor={o.mandato ? JSON.stringify(o.mandato) : "ainda não coletado"}
            />
            <Meta
              icon={<Users2 size={14} />}
              label="População"
              valor={o.populacao ? `${o.populacao.toLocaleString("pt-BR")} hab.` : "ainda não coletado"}
            />
            <Meta icon={<MapPin size={14} />} label="Esfera" valor={o.esfera ? esferaLabel[o.esfera] ?? o.esfera : "—"} />
          </div>
        </div>

        {temPontuacao ? (
          <div
            className="flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-8 py-5 lg:w-[230px]"
            style={{ background: bandaFinal!.bg }}
          >
            <span className="font-display text-[11px] font-bold uppercase tracking-wide" style={{ color: bandaFinal!.texto }}>
              Semáforo final
            </span>
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-4 rounded-full" style={{ background: bandaFinal!.hex }} />
              <span className="font-display text-[26px] font-extrabold" style={{ color: bandaFinal!.texto }}>
                {bandaFinal!.label}
              </span>
            </div>
            <span className="text-[11px] font-medium" style={{ color: bandaFinal!.texto }}>
              {bandaFinal!.label === "Verde" ? "Alvo quente — vá" : bandaFinal!.label === "Amarelo" ? "Investigue antes de ir" : "Não vá"}
            </span>
          </div>
        ) : (
          <div className="flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-borda bg-[#F8FAFC] px-8 py-5 text-center lg:w-[230px]">
            <span className="font-display text-[11px] font-bold uppercase tracking-wide text-cinza">Semáforo final</span>
            <span className="font-display text-[15px] font-bold text-indigo-deep">Ainda não pontuado</span>
            <span className="text-[11.5px] text-cinza">
              O menor dos 3 eixos vira o veredito: verde = alvo quente, amarelo = investigue,
              vermelho = não vá.
            </span>
          </div>
        )}
      </div>

      {/* três eixos, com dado real e drivers ausentes marcados honestamente */}
      <div className="grid gap-5 md:grid-cols-3">
        <EixoReal
          titulo="Capacidade"
          pergunta="Tem dinheiro?"
          explicacao="Saúde fiscal do órgão: quanto arrecada e quanta folga tem no caixa."
          score={r.score?.score_capacidade ?? null}
          drivers={[
            ["RCL (receita corrente líquida)", r.fiscal ? `${formatBRL(r.fiscal.rcl)} (${r.fiscal.ano})` : "ainda não coletado"],
            [
              "Receita per capita",
              r.fiscal ? `${formatBRL(r.fiscal.receita_per_capita)}/hab. (${r.fiscal.ano})` : "ainda não coletado",
            ],
            ["CAPAG", r.fiscal?.capag ?? "não disponível — API RGF da STN sem retorno pra este ente"],
            ["Despesa com pessoal", r.fiscal?.despesa_pessoal ? formatBRL(r.fiscal.despesa_pessoal)! : "ainda não coletado"],
          ]}
        />
        <EixoReal
          titulo="Apetite"
          pergunta="Gasta na minha área?"
          explicacao="Quanto o órgão prioriza e executa orçamento na sua categoria específica."
          pesaMais
          score={r.score?.score_apetite ?? null}
          drivers={[
            [
              "Execução orçamentária por função",
              r.temExecucaoFuncao ? "dado disponível" : "ainda não coletado — harvester de execução por função é próximo passo",
            ],
            ...(emendasAbertas.length > 0
              ? emendasAbertas.map(
                  (e) =>
                    [
                      "Reforço orçamentário via emenda",
                      `${formatBRL(e.valor_empenhado)} — ${e.autor_nome ?? "autor não identificado"} — empenhada, ${
                        (e.valor_pago ?? 0) > 0 ? "parcialmente paga" : "ainda não paga"
                      }`,
                    ] as [string, string]
                )
              : ([["Emendas parlamentares", "ainda não coletado — aguardando token da API CGU"]] as [string, string][])),
          ]}
        />
        <EixoReal
          titulo="Acesso"
          pergunta="Consigo entrar?"
          explicacao="Barreiras práticas: histórico de compras, habilitação e concorrência."
          score={r.score?.score_acesso ?? null}
          drivers={[
            [
              "Licitações publicadas no PNCP (município, todas as secretarias)",
              `${r.totalLicitacoes} no total · ${r.licitacoes12m} nos últimos 12 meses`,
            ],
            ["Recompra na sua categoria específica", "ainda não calculado — falta matching por CNAE/objeto"],
          ]}
        />
      </div>

      {/* resumo objetivo — nunca fabrica interpretação, só recita dado real */}
      <div className="overflow-hidden rounded-2xl bg-[linear-gradient(110deg,#1E1B4B_0%,#2A2568_55%,#5B21B6_100%)] p-[26px] text-white">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
            <Quote size={16} />
          </span>
          <h3 className="font-display text-[15px] font-semibold">Resumo</h3>
          <span className="ml-auto rounded-full bg-white/15 px-2.5 py-1 font-display text-[10px] font-bold tracking-wide">
            {r.score?.resumo_executivo ? "REVISADO PELA BX4" : "DADOS BRUTOS · SEM INTERPRETAÇÃO"}
          </span>
        </div>
        <p className="text-[14px] leading-relaxed text-[#E7E3FA]">
          {r.score?.resumo_executivo ??
            [
              r.fiscal
                ? `RCL de ${formatBRL(r.fiscal.rcl)} e receita per capita de ${formatBRL(r.fiscal.receita_per_capita)}/hab. em ${r.fiscal.ano}.`
                : "Dado fiscal (SICONFI) ainda não coletado para este órgão.",
              `${r.totalLicitacoes} licitações publicadas no PNCP no município (todas as secretarias) no total, ${r.licitacoes12m} nos últimos 12 meses.`,
              emendasAbertas.length > 0
                ? `${emendasAbertas.length} emenda(s) parlamentar(es) empenhada(s) e ainda não totalmente paga(s).`
                : "Nenhuma emenda parlamentar coletada ainda para este órgão.",
            ].join(" ")}
        </p>
      </div>

      {/* contatos — honesto: ainda não existe coleta real */}
      <div className="rounded-2xl border border-borda bg-white p-[22px]">
        <div className="mb-1 flex flex-wrap items-center gap-2.5">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
            <Contact size={16} />
          </span>
          <h3 className="font-display text-[15px] font-semibold text-indigo-deep">Contatos Estratégicos</h3>
        </div>
        <p className="text-[13px] text-cinza">
          Nenhum contato coletado ainda para este órgão. Contatos institucionais entram na
          Fase 0 (curadoria manual) ou via leitura automática de editais publicados.
        </p>
      </div>

      <p className="text-center text-[12px] text-cinza">
        Dado real (piloto Teresina/PI). Pontuação comparativa (0–100) ainda não calculada
        automaticamente — Fase 0 é validação manual antes de automatizar o score.
      </p>
    </div>
  );
}

/* ---------- componentes ---------- */

function ContatoCard({ c }: { c: ContatoOrgao }) {
  const temNome = c.nome && c.nome !== "—";
  const inic = temNome
    ? c.nome
        .split(" ")
        .filter((w) => w.length > 2)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";
  const cor = fonteCor[c.fonte];

  return (
    <div className="rounded-xl border border-borda p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-deep font-display text-[12px] font-bold text-white">
          {inic}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-semibold text-indigo-deep">{c.cargo}</div>
          <div className="truncate text-[12px] text-cinza">
            {temNome ? c.nome : "nome a confirmar"}
            {c.secretaria ? ` · ${c.secretaria}` : ""}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 font-display text-[10px] font-bold"
          style={{ background: cor.bg, color: cor.fg }}
        >
          {c.fonte}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {c.telefone && (
          <ContatoLinha icon={<Phone size={13} />} href={`tel:${c.telefone.replace(/\D/g, "")}`} texto={c.telefone} />
        )}
        {c.email && <ContatoLinha icon={<Mail size={13} />} href={`mailto:${c.email}`} texto={c.email} />}
        {c.link && <ContatoLinha icon={<ExternalLink size={13} />} href={c.link} texto="Página oficial" />}
      </div>

      <div className="mt-2.5 border-t border-borda pt-2 text-[11px] text-cinza">
        {c.origem} · {c.data}
      </div>
    </div>
  );
}

function ContatoLinha({ icon, href, texto }: { icon: React.ReactNode; href: string; texto: string }) {
  return (
    <a href={href} className="flex items-center gap-2 text-[12.5px] text-cinza transition hover:text-violeta">
      <span className="text-cinza">{icon}</span>
      <span className="truncate">{texto}</span>
    </a>
  );
}

