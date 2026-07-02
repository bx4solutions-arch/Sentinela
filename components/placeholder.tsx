import type { LucideIcon } from "lucide-react";

/** Página-esqueleto de um módulo ainda não construído (navegável, não-404). */
export function EmConstrucao({
  titulo,
  descricao,
  Icon,
  destaque,
}: {
  titulo: string;
  descricao: string;
  Icon: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 font-display text-[22px] font-bold text-indigo-deep">
          {titulo}
          {destaque && (
            <span className="rounded-full border border-[#DDD0F7] bg-[#EDE7FB] px-2.5 py-[3px] font-display text-[10px] font-bold tracking-wide text-violeta">
              ★ DIFERENCIAL
            </span>
          )}
        </h1>
        <p className="mt-1 max-w-[560px] text-[13.5px] text-cinza">{descricao}</p>
      </div>

      <div className="mt-7 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-borda bg-white py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#EDE7FB] text-violeta">
          <Icon size={28} />
        </span>
        <div>
          <p className="font-display text-[15px] font-semibold text-indigo-deep">
            Em construção
          </p>
          <p className="mx-auto mt-1 max-w-[360px] text-[13px] text-cinza">
            Este módulo entra em breve nesta fase do MVP. A navegação e o acesso
            já estão funcionando.
          </p>
        </div>
      </div>
    </>
  );
}
