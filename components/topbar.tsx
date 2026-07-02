"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  MessageSquare,
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  LayoutGrid,
  FileText,
  KeyRound,
  PenLine,
  Lock,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menu: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "Minha Empresa", icon: Building2, href: "/dashboard/minha-empresa" },
  { label: "Catálogo", icon: LayoutGrid, href: "/dashboard/minha-empresa?aba=catalogo" },
  { label: "Documentos", icon: FileText, href: "/dashboard/minha-empresa?aba=documentos" },
  { label: "Portais", icon: KeyRound, href: "/dashboard/minha-empresa?aba=portais" },
  { label: "Assinaturas", icon: PenLine, href: "/dashboard/minha-empresa?aba=dados" },
  { label: "Meu acesso", icon: Lock, href: "/dashboard/organizacao" },
  { label: "Uso de IA", icon: Sparkles, href: "/dashboard/uso-ia" },
];

export function Topbar({ email = "", userId = "" }: { email?: string; userId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const iniciais = (email.slice(0, 2) || "SN").toUpperCase();
  const accountId = "SNT-" + (userId.replace(/-/g, "").slice(0, 6) || "000000").toUpperCase();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-5 border-b border-borda bg-white px-6">
      {/* seletor de empresa */}
      <button className="flex min-w-[230px] items-center gap-2.5 rounded-[30px] border border-borda py-1.5 pl-1.5 pr-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-deep font-display text-[13px] font-bold text-white">
          EM
        </span>
        <span className="text-left leading-tight">
          <small className="block text-[10px] text-cinza">Empresa Selecionada</small>
          <b className="font-display text-[13px] font-semibold">Minha Empresa</b>
        </span>
        <ChevronDown size={16} className="ml-auto text-cinza" />
      </button>

      {/* busca global */}
      <div className="mx-auto flex h-[42px] max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] border border-borda bg-[#F1F5F9] px-3.5 text-cinza">
        <Search size={17} />
        <input placeholder="Buscar na Sentinela" className="flex-1 bg-transparent text-sm outline-none" />
        <span className="rounded-[5px] border border-borda bg-white px-1.5 py-0.5 text-[11px]">⌘K</span>
      </div>

      {/* direita */}
      <div className="ml-auto flex items-center gap-4">
        <button className="flex items-center gap-1.5 rounded-[9px] bg-violeta px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-roxo">
          <Sparkles size={15} /> AJUDA
        </button>
        <MessageSquare size={20} className="cursor-pointer text-cinza" />
        <Bell size={20} className="cursor-pointer text-cinza" />

        {/* perfil */}
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5">
            <span className="hidden text-right leading-tight sm:block">
              <b className="block max-w-[180px] truncate font-display text-[12px] font-semibold">
                {email || "Conta"}
              </b>
              <small className="text-[11px] text-cinza">{accountId}</small>
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-violeta font-display text-[12px] font-bold text-white">
              {iniciais}
            </span>
          </button>

          {open && (
            <>
              <button
                aria-hidden
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[55] cursor-default"
              />
              <div className="absolute right-0 top-[calc(100%+10px)] z-[60] w-[250px] overflow-hidden rounded-2xl border border-borda bg-white shadow-2xl">
                {/* cabeçalho do perfil */}
                <div className="flex items-center gap-3 border-b border-borda px-4 py-3.5">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-violeta font-display text-[14px] font-bold text-white">
                    {iniciais}
                  </span>
                  <div className="min-w-0">
                    <b className="block truncate font-display text-[13px] font-semibold text-indigo-deep">
                      {email || "Conta"}
                    </b>
                    <span className="rounded-full bg-[#EDE7FB] px-2 py-0.5 font-display text-[10px] font-bold text-violeta">
                      ID {accountId}
                    </span>
                  </div>
                </div>

                {/* itens */}
                <div className="py-1.5">
                  {menu.map((m) => {
                    const Icon = m.icon;
                    return (
                      <Link
                        key={m.label}
                        href={m.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-indigo-deep transition hover:bg-[#F5F3FF]"
                      >
                        <Icon size={17} className="text-cinza" />
                        {m.label}
                      </Link>
                    );
                  })}

                  {/* tema escuro (em breve) */}
                  <div className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-cinza">
                    <Moon size={17} className="text-cinza" />
                    Tema escuro
                    <span className="ml-auto rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-semibold text-cinza">
                      em breve
                    </span>
                  </div>
                </div>

                <div className="border-t border-borda py-1.5">
                  <button
                    onClick={sair}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-vermelho transition hover:bg-[#FDF2F2]"
                  >
                    <LogOut size={17} /> Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
