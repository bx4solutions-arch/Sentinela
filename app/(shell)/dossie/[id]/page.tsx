import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemand } from "@/lib/mock";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Separator } from "@/components/ui";
import { ImminenceBadge, ChanceScore, StageMiniRail, SourceLinks } from "@/components/sentinela";
import { brl, dataBR } from "@/lib/utils";
import {
  Building2, Clock, GitBranch, History, DollarSign, Users, Gavel, ClipboardCheck, ArrowLeft, Mail,
} from "lucide-react";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{title}</CardTitle></CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </Card>
  );
}
function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

export default async function DossiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDemand(id);
  if (!d) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/radar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />Voltar ao Radar</Link>

      {/* 1. Header + 2. Índices */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold leading-tight">{d.titulo}</h1>
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><Building2 className="size-3.5" />{d.org.nome} · {d.org.unidade} · {d.org.cidade}/{d.org.uf}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ImminenceBadge im={d.indices.iminencia} />
              <ChanceScore value={d.indices.chance} />
            </div>
          </div>
          {/* 3. Valor + janela */}
          <Separator />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="flex items-center gap-1.5 text-lg font-bold text-primary"><DollarSign className="size-4" />{brl(d.financeiro.valorPrevisto)}</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" />Janela provável: {dataBR(d.financeiro.janelaInicio)} – {dataBR(d.financeiro.janelaFim)}</span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Esteira (mini) */}
      <Section icon={GitBranch} title="Esteira do processo">
        <StageMiniRail demand={d} />
        <p className="mt-2 text-xs text-muted-foreground">Estágio atual: <strong className="text-foreground">{d.estagioAtual}</strong>. <Link href={`/esteira/${d.id}`} className="text-primary hover:underline">Ver linha do tempo completa →</Link></p>
      </Section>

      {/* 5. Incumbente & histórico */}
      <Section icon={History} title="Incumbente & histórico">
        <div className="space-y-2">
          {d.historico.map((h, i) => (
            <div key={i} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{h.ano} · {h.fornecedor}</span>
                <span className="font-semibold text-primary">{brl(h.valor)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Vigência {h.vigenciaMeses} meses · {h.aditivos} aditivo(s){h.aditivoPct ? ` (+${h.aditivoPct}%)` : ""}{h.nota ? ` · ${h.nota}` : ""}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Preço */}
      <Section icon={DollarSign} title="Preço">
        <Row label="Preço-alvo do órgão (ETP)" value={`${brl(d.preco.alvoMin)} – ${brl(d.preco.alvoMax)}`} strong />
        <Row label="Preço médio histórico pago" value={brl(d.preco.medioHistorico)} />
        <Row label="Menor preço (vencedor anterior)" value={brl(d.preco.menorVencedor)} />
        <Row label="Faixa de lances dos concorrentes" value={`${brl(d.preco.faixaLancesMin)} – ${brl(d.preco.faixaLancesMax)}`} />
        <Row label="Margem provável estimada" value={<Badge variant="secondary">{d.preco.margem}</Badge>} />
      </Section>

      {/* 7. Concorrência */}
      <Section icon={Users} title="Concorrência">
        <div className="flex flex-wrap gap-x-6">
          <Row label="Nº médio de participantes" value={d.concorrencia.participantesMedia} />
          <Row label="Gap 1º–2º" value={`${d.concorrencia.gap1e2Pct}%`} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{d.concorrencia.analise}</p>
        <p className="mt-1 text-xs text-muted-foreground">Incumbente: <strong className="text-foreground">{d.concorrencia.incumbente}</strong> · {d.concorrencia.incumbenteSancao ? "com sanção" : "sem sanção"} · ativo em {d.concorrencia.incumbenteOrgaosAtivos} órgãos.</p>
      </Section>

      {/* 8. Órgão */}
      <Section icon={Building2} title="Órgão">
        <Row label="Capacidade de pagamento" value={<Badge variant="secondary">{d.org.capacidadePagamento}</Badge>} />
        <Row label="Prazo médio de pagamento" value={`${d.org.prazoPagamentoDias} dias`} />
        <Row label="Recorrência" value={<span><Badge variant="muted">{d.org.recorrencia}</Badge> <span className="text-xs text-muted-foreground">{d.org.recorrenciaNota}</span></span>} />
      </Section>

      {/* 9. Decisores */}
      <Section icon={Gavel} title="Decisores (institucional)">
        {d.decisores.map((m, i) => (
          <div key={i} className="flex items-center justify-between py-1 text-sm">
            <span><strong>{m.funcao}</strong> · <span className="text-muted-foreground">{m.cargo}</span></span>
            <a href={`mailto:${m.emailInstitucional}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="size-3.5" />{m.emailInstitucional}</a>
          </div>
        ))}
        <p className="mt-1 text-xs text-muted-foreground">Só dado institucional (sem CPF/telefone pessoal — LGPD).</p>
      </Section>

      {/* 10. Plano de ação */}
      <Section icon={ClipboardCheck} title="Plano de ação">
        <p className="text-sm font-medium">Exigências para participar:</p>
        <ul className="mt-1 space-y-1 text-sm">
          {d.planoAcao.exigencias.map((e) => (<li key={e} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" />{e}</li>))}
        </ul>
        <p className="mt-2 text-sm">Suas certidões: <span className="text-muted-foreground">{d.planoAcao.minhasCertidoes}</span></p>
        <Button className="mt-3" size="sm">Montar kit da proposta</Button>
      </Section>

      {/* 11. Fontes */}
      <Section icon={History} title="Fontes">
        <SourceLinks />
        <p className="mt-2 text-xs text-muted-foreground">Cada dado exibe a fonte e o link oficial.</p>
      </Section>
    </div>
  );
}
