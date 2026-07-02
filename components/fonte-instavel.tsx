import { CloudOff, RefreshCw } from "lucide-react";

/** Estado padrão para quando uma consulta falha / a fonte pública está fora do ar. */
export function FonteInstavel({
  onTentar,
  fonte,
}: {
  onTentar?: () => void;
  fonte?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#FCD9B6] bg-[#FFF4E8] py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FDE6CC] text-[#B45309]">
        <CloudOff size={24} />
      </span>
      <p className="font-display text-[14px] font-semibold text-[#B45309]">
        As APIs das fontes públicas{fonte ? ` (${fonte})` : ""} estão instáveis no momento
      </p>
      <p className="max-w-[420px] text-[13px] text-[#92660C]">
        Não foi possível carregar os dados agora. Tente novamente em alguns minutos.
      </p>
      {onTentar && (
        <button
          onClick={onTentar}
          className="mt-2 flex items-center gap-2 rounded-lg bg-laranja px-4 py-2.5 font-display text-[13px] font-semibold text-white transition hover:bg-laranja-hover"
        >
          <RefreshCw size={15} /> Tentar novamente
        </button>
      )}
    </div>
  );
}
