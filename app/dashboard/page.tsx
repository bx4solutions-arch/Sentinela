"use client";

import {
  PieChart,
  ClipboardList,
  Megaphone,
  Gavel,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Radar,
  FileWarning,
  Clock,
} from "lucide-react";
import { AlvoCard as Alvo } from "@/components/widgets/alvo-card";

export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="font-display text-[22px] font-bold text-indigo-deep">
          Página Inicial
        </h1>
        <p className="mt-1 max-w-[560px] text-[13.5px] text-cinza">
          Acompanhe os alvos quentes do mercado, seus processos em aberto e
          gerencie melhor os seus resultados.
        </p>
      </div>

      {/* LINHA 1: funil + agenda */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card icon={<PieChart size={17} />} title="Meu Funil" tint="violeta">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fase
              icon={<ClipboardList size={17} />}
              tint="#5B21B6"
              bg="#EDE7FB"
              name="Análise"
              cta="Analisar editais"
            />
            <Fase
              icon={<Megaphone size={17} />}
              tint="#FF6600"
              bg="#FFE9D6"
              name="Recebendo Proposta"
              cta="Gerenciar"
            />
            <Fase
              icon={<Gavel size={17} />}
              tint="#16A34A"
              bg="#DCFCE7"
              name="Fase de Lance"
              cta="Ver disputas"
            />
            <Fase
              icon={<Users size={17} />}
              tint="#2563EB"
              bg="#DBEAFE"
              name="Sessão Pública"
              cta="Monitorar"
            />
          </div>
        </Card>

        <div className="rounded-2xl border border-borda bg-white p-[22px]">
          <div className="mb-1 flex items-center gap-2.5">
            <button className="grid h-6 w-6 place-items-center rounded-md bg-[#F1F5F9] text-cinza">
              <ChevronLeft size={15} />
            </button>
            <button className="grid h-6 w-6 place-items-center rounded-md bg-[#F1F5F9] text-cinza">
              <ChevronRight size={15} />
            </button>
            <b className="font-display text-[13px] font-bold tracking-wide text-indigo-deep">
              SEGUNDA-FEIRA
            </b>
          </div>
          <p className="mb-7 text-xs text-cinza">29 de junho de 2026</p>
          <div className="flex flex-col items-center gap-3.5 py-5 text-cinza">
            <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#F1F5F9]">
              <CalendarDays size={24} className="text-[#94A3B8]" />
            </span>
            <span className="text-[13px]">
              Sem compromissos para o dia de hoje!
            </span>
          </div>
          <a
            href="#"
            className="block text-center text-[12.5px] font-semibold text-violeta"
          >
            + Criar Lembrete
          </a>
        </div>
      </div>

      {/* LINHA 2: alvos quentes (EXCLUSIVO) + documentos */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-[#EAD9F7] bg-white p-[22px]">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-[#FFE9D6] text-laranja">
              <Radar size={17} />
            </span>
            <h3 className="font-display text-[15px] font-semibold text-indigo-deep">
              Alvos Quentes da Semana
            </h3>
            <span className="ml-auto rounded-full border border-[#DDD0F7] bg-[#EDE7FB] px-2.5 py-[3px] font-display text-[10px] font-bold tracking-wide text-violeta">
              RAIO-X ★
            </span>
          </div>

          <Alvo
            cor="verde"
            orgao="Prefeitura de Cariacica — ES"
            texto={
              <>
                Emenda de <Hl>R$1,5M</Hl> carimbada na sua área, já empenhada e
                não gasta. Contrato similar vence em 4 meses.
              </>
            }
            scores={["Cap 82", "Ape 74", "Ace 68"]}
          />
          <Alvo
            cor="verde"
            orgao="Prefeitura de Linhares — ES"
            texto={
              <>
                Função-alvo executou <Hl>78%</Hl> do orçado no último ano,
                tendência de alta. Já comprou sua categoria 2x no PNCP.
              </>
            }
            scores={["Cap 76", "Ape 81", "Ace 70"]}
          />
          <Alvo
            cor="amarelo"
            orgao="Governo do Estado — ES (SESA)"
            texto={
              <>
                Caixa confortável, mas execução na sua função ainda baixa neste
                ciclo. <Hl>Investigue</Hl> antes de ir.
              </>
            }
            scores={["Cap 88", "Ape 52", "Ace 64"]}
            last
          />
        </div>

        <Card
          icon={<FileWarning size={17} />}
          title="Documentos a Vencer"
          tint="vermelho"
        >
          <Doc nome="Certidão FGTS" sub="vence em 6 dias" pill="04/07" danger />
          <Doc nome="CND Federal" sub="vence em 19 dias" pill="17/07" />
          <Doc nome="Certidão Trabalhista" sub="vence em 27 dias" pill="25/07" />
          <a
            href="#"
            className="mt-3.5 block text-center text-[12.5px] font-semibold text-violeta"
          >
            Ver Minha Empresa →
          </a>
        </Card>
      </div>

      {/* LICITAÇÕES RECENTES */}
      <div className="mt-5">
        <Card icon={<Clock size={17} />} title="Licitações Recentes" tint="laranja">
          <div className="flex flex-col items-center gap-3.5 py-9 text-cinza">
            <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-[#F1F5F9]">
              <Clock size={24} className="text-[#94A3B8]" />
            </span>
            <span className="text-[13px]">
              Nenhuma licitação ativa recentemente
            </span>
          </div>
        </Card>
      </div>

      {/* PROMO */}
      <div className="relative mt-5 flex items-center gap-6 overflow-hidden rounded-2xl bg-[linear-gradient(100deg,#5B21B6_0%,#6D28D9_45%,#1E1B4B_100%)] px-9 py-7">
        <div>
          <span className="mb-2.5 inline-block rounded-full border border-white/30 bg-white/[0.18] px-3 py-1 font-display text-[11px] font-bold text-white">
            EXCLUSIVO SENTINELA
          </span>
          <h2 className="font-display text-[23px] font-extrabold leading-[1.2] tracking-tight text-white">
            Saiba onde está o dinheiro <span className="text-laranja">antes</span>{" "}
            do edital existir.
          </h2>
          <p className="mt-1.5 max-w-[520px] text-sm text-[#D8D2F0]">
            Rode o Raio-X de qualquer órgão e descubra capacidade, apetite e
            acesso — com a fonte citada.
          </p>
        </div>
        <button className="ml-auto whitespace-nowrap rounded-[10px] bg-laranja px-[22px] py-3.5 font-display text-sm font-semibold text-white transition hover:bg-laranja-hover">
          Abrir Raio-X do Órgão →
        </button>
      </div>
    </>
  );
}

/* ---------- helpers ---------- */

const tints: Record<string, { bg: string; fg: string }> = {
  violeta: { bg: "#EDE7FB", fg: "#5B21B6" },
  laranja: { bg: "#FFE9D6", fg: "#FF6600" },
  vermelho: { bg: "#FDE7E7", fg: "#DC2626" },
};

function Card({
  icon,
  title,
  tint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tint: keyof typeof tints;
  children: React.ReactNode;
}) {
  const t = tints[tint];
  return (
    <div className="rounded-2xl border border-borda bg-white p-[22px]">
      <div className="mb-5 flex items-center gap-2.5">
        <span
          className="grid h-[30px] w-[30px] place-items-center rounded-lg"
          style={{ background: t.bg, color: t.fg }}
        >
          {icon}
        </span>
        <h3 className="font-display text-[15px] font-semibold text-indigo-deep">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Fase({
  icon,
  tint,
  bg,
  name,
  cta,
}: {
  icon: React.ReactNode;
  tint: string;
  bg: string;
  name: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-[34px] w-[34px] place-items-center rounded-[9px]"
          style={{ background: bg, color: tint }}
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-cinza">{name}</span>
      </div>
      <div className="mb-0.5 mt-1.5 font-display text-[26px] font-bold leading-none text-indigo-deep">
        0
      </div>
      <a href="#" className="text-xs font-semibold text-violeta">
        {cta}
      </a>
    </div>
  );
}

function Hl({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-laranja">{children}</span>;
}

// Alvo extraído para components/widgets/alvo-card.tsx (Fase A — widget da UI generativa)

function Doc({
  nome,
  sub,
  pill,
  danger,
}: {
  nome: string;
  sub: string;
  pill: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-borda py-2.5 last:border-b-0">
      <div className="flex-1">
        <div className="text-[13px] font-medium">{nome}</div>
        <div className="text-[11px] text-cinza">{sub}</div>
      </div>
      <span
        className={[
          "rounded-full px-2 py-[3px] font-display text-[10px] font-bold",
          danger ? "bg-[#FDE7E7] text-[#B91C1C]" : "bg-[#FEF3E2] text-[#B45309]",
        ].join(" ")}
      >
        {pill}
      </span>
    </div>
  );
}
