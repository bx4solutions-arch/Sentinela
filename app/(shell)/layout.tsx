"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar, GitBranch, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { NotificationBell, MockBanner } from "@/components/sentinela";
import { NOTIFICATIONS } from "@/lib/mock";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/radar", label: "Radar", icon: Radar },
  { href: "/esteira", label: "Esteira", icon: GitBranch },
  { href: "/empresa", label: "Minha Empresa", icon: Building2 },
  { href: "/onboarding", label: "Onboarding", icon: Sparkles },
];

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Sentinela</p>
            <p className="text-[11px] text-sidebar-foreground/60">Inteligência de licitações</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                isActive(n.href) ? "bg-sidebar-accent font-medium text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
              )}>
              <n.icon className="size-4" />{n.label}
            </Link>
          ))}
        </nav>
        <p className="px-5 py-4 text-[11px] text-sidebar-foreground/40">Mock navegável · pré-F1</p>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-2.5 text-sidebar-foreground md:bg-card md:text-foreground">
          <div className="flex items-center gap-2 md:hidden">
            <ShieldCheck className="size-5" /><span className="font-semibold">Sentinela</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">Radar diário · 5–15 oportunidades curadas</div>
          <NotificationBell items={NOTIFICATIONS} />
        </header>
        <MockBanner />
        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:pb-8">{children}</main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(n.href) ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="size-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
