"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radar,
  Search,
  Rss,
  ClipboardList,
  Building2,
  CalendarDays,
  Coins,
  BarChart3,
  FileText,
  FileCheck2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  star?: boolean;
};

// Ordem oficial da sidebar (PRD v1.1). Disputa de Lances e
// Monitoramento ficam fora do MVP.
const items: Item[] = [
  { label: "Página Inicial", href: "/dashboard", icon: Home },
  { label: "Raio-X do Órgão", href: "/dashboard/raio-x", icon: Radar, star: true },
  { label: "Pesquisar Licitações", href: "/dashboard/pesquisar-licitacoes", icon: Search },
  { label: "Radar de Licitações", href: "/dashboard/radar", icon: Rss },
  { label: "Minhas Licitações", href: "/dashboard/minhas-licitacoes", icon: ClipboardList },
  { label: "Minha Empresa", href: "/dashboard/minha-empresa", icon: Building2 },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Pesquisa de Preços", href: "/dashboard/pesquisa-precos", icon: Coins },
  { label: "Análise de Concorrente", href: "/dashboard/analise-concorrente", icon: BarChart3 },
  { label: "PCA", href: "/dashboard/pca", icon: FileText },
  { label: "Contratos e Atas", href: "/dashboard/contratos-atas", icon: FileCheck2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="group fixed inset-y-0 left-0 z-50 flex w-16 flex-col overflow-hidden bg-gradient-to-b from-indigo-deep to-indigo-2 py-3.5 transition-[width] duration-200 ease-out hover:w-[248px] hover:shadow-[8px_0_40px_rgba(15,12,40,.35)]">
      <div className="mb-3.5 flex h-[46px] items-center gap-3 px-[18px]">
        <BrandMark size={30} variant="outline" className="shrink-0" />
        <span className="font-display text-xl font-extrabold tracking-tight text-white opacity-0 transition-opacity group-hover:opacity-100">
          Sentinela
        </span>
      </div>

      <nav className="flex flex-col gap-[3px] px-2.5">
        {items.map((it) => (
          <NavLink key={it.href} item={it} pathname={pathname} />
        ))}

        <div className="mx-[11px] my-2 h-px bg-white/[0.07]" />
        <NavLink
          item={{ label: "Organização", href: "/dashboard/organizacao", icon: Users }}
          pathname={pathname}
        />
      </nav>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: Item; pathname: string }) {
  const Icon = item.icon;
  const active =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={[
        "relative flex h-11 items-center gap-3.5 whitespace-nowrap rounded-[10px] px-[11px]",
        active
          ? "bg-violeta font-semibold text-white"
          : "text-[#B9B4D9] hover:bg-roxo/[0.16] hover:text-white",
      ].join(" ")}
    >
      <span
        className={[
          "flex w-[22px] shrink-0 items-center justify-center",
          active ? "text-laranja" : "",
        ].join(" ")}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100">
        {item.label}
      </span>
      {item.star && (
        <span className="ml-auto text-[13px] text-laranja opacity-0 transition-opacity group-hover:opacity-100">
          ★
        </span>
      )}
    </Link>
  );
}
