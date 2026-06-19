import { DEMANDS } from "@/lib/mock";
import { StageKanban } from "@/components/sentinela";

export default function EsteiraBoardPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Esteira · board</h1>
        <p className="text-sm text-muted-foreground">
          Todos os processos monitorados, por estágio (PCA → … → Vigência). Clique num card para a linha do tempo do processo.
        </p>
      </div>
      <StageKanban demands={DEMANDS} />
    </div>
  );
}
