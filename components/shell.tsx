"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Radar, KanbanSquare, Building2, Settings,
  ShieldCheck, Search, HelpCircle, LogOut, Bell, Boxes,
} from "lucide-react";
import { Progress } from "@/components/ui";
import { signOut } from "@/app/(auth)/login/actions";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; roadmap?: boolean };

// Menu alinhado ao v2 "5 Telas Conectadas": Dashboard · Radar · Licitações(Space) · Minha Empresa · Kanban.
// Pesquisa (fundida na busca do Radar) e Consultor (vai pro Space na Etapa 3) saíram do menu — as rotas
// seguem vivas até serem reabsorvidas/deletadas no cleanup final. + Configurações (utilitário).
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/space", label: "Licitações", icon: Boxes },
  { href: "/empresa", label: "Minha Empresa", icon: Building2 },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const TITLES: { test: (p: string) => boolean; title: string; sub: string }[] = [
  { test: (p) => p.startsWith("/dashboard"), title: "Dashboard Sentinela", sub: "Inteligência antecipada de oportunidades públicas" },
  { test: (p) => p.startsWith("/radar"), title: "Radar de Sinais", sub: "Sinais multi-fonte priorizados — 5 a 15 por dia" },
  { test: (p) => p.startsWith("/space"), title: "Espaço Inteligente", sub: "As licitações que você acompanha — cada uma abre o seu Space" },
  { test: (p) => p.startsWith("/pesquisa"), title: "Pesquisa livre", sub: "Por órgão · item + cidade · concorrente por CNPJ" },
  { test: (p) => p.startsWith("/kanban"), title: "Kanban Comercial", sub: "Seu funil de oportunidades — da monitoração ao resultado" },
  { test: (p) => p.startsWith("/licitacao"), title: "Pasta Inteligente da Licitação", sub: "Documentos, análise e decisão num só lugar" },
  { test: (p) => p.startsWith("/consultor"), title: "Consultor IA", sub: "Converse sobre cada licitação com o contexto da pasta" },
  { test: (p) => p.startsWith("/configuracoes"), title: "Configurações", sub: "Inteligência Artificial inclusa (gerenciada pela Sentinela)" },
  { test: (p) => p.startsWith("/empresa"), title: "Minha Empresa", sub: "Raio-X por CNPJ, certidões e Vigia de Documentos" },
  { test: (p) => p.startsWith("/onboarding"), title: "Configurar empresa", sub: "Raio-X por CNPJ" },
  { test: (p) => p.startsWith("/roadmap"), title: "Em breve", sub: "Funcionalidade no roadmap" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition",
        active ? "bg-sidebar-accent font-medium text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}>
      <item.icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.roadmap && <span className="rounded bg-sidebar-foreground/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-sidebar-foreground/50">soon</span>}
    </Link>
  );
}

export function Shell({
  children,
  userEmail,
  companyName,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  companyName: string | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/roadmap" && pathname.startsWith(href + "/"));
  const meta = TITLES.find((t) => t.test(pathname)) ?? { title: "Sentinela", sub: "" };
  const display = companyName ?? "Configure sua empresa";
  const initials = (companyName ?? userEmail ?? "S")
    .split(/\s|@/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="size-5" /></div>
          <div className="leading-tight"><p className="font-semibold">Sentinela</p><p className="text-[10px] text-sidebar-foreground/60">Inteligência Comercial</p></div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1">
          {NAV.map((n, i) => <NavLink key={i} item={n} active={isActive(n.href) && !n.roadmap} />)}
        </nav>

        {/* Card de plano */}
        <div className="mx-3 mb-3 rounded-lg bg-sidebar-accent/50 p-3 text-xs">
          <p className="font-semibold text-sidebar-foreground">Plano Profissional</p>
          <p className="text-sidebar-foreground/60">Válido até 12/06/2026</p>
          <Progress value={82} className="mt-2 bg-sidebar-foreground/15" />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-sidebar-foreground/60">82% de uso</span>
            <Link href="/roadmap" className="font-medium text-sidebar-foreground/90 hover:underline">Ver planos</Link>
          </div>
        </div>

        {/* Perfil + logout */}
        <div className="flex items-center gap-2 border-t border-sidebar-border/50 px-4 py-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{initials}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{display}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/60">{userEmail ?? ""}</p>
          </div>
          <form action={signOut}>
            <button type="submit" aria-label="Sair" title="Sair"
              className="grid size-8 place-items-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-2.5">
          <div className="min-w-0 md:hidden"><span className="font-semibold">Sentinela</span></div>
          <div className="hidden min-w-0 md:block">
            <h1 className="truncate text-base font-bold leading-tight">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.sub}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground lg:flex">
              <Search className="size-4" />
              <input placeholder="Buscar órgãos, objetos, cidades…" className="w-56 bg-transparent outline-none" />
            </div>
            <button className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Notificações" title="Notificações"><Bell className="size-5" /></button>
            <button className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Ajuda"><HelpCircle className="size-5" /></button>
            <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</div>
          </div>
        </header>
        {/* Banner "mock" só nas telas que ainda usam dado ilustrativo. Rotas com dado real não mostram. */}
        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:pb-8">{children}</main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden">
        {[NAV[0], NAV[1], NAV[2], NAV[3]].map((n, i) => (
          <Link key={i} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(n.href) ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="size-5" />{n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
