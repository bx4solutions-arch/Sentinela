import { Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getAiConfig } from "./actions";
import { ConfigForm } from "./config-form";

export default async function ConfiguracoesPage() {
  const cfg = await getAiConfig();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> Inteligência Artificial (BYOK)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Escolha o provedor e o modelo e use a <strong>sua própria chave</strong>. Com isso ligado, o botão
            “Analisar com IA” na Pasta da Licitação passa a funcionar com o modelo escolhido.
          </p>
        </CardHeader>
        <CardContent>
          <ConfigForm initial={cfg} />
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <p>
            Sua chave é criptografada (AES-256-GCM) e isolada por conta. O Sentinela não contrata nada por você —
            o custo das chamadas é do seu provedor, sob a sua chave. Você troca de modelo/provedor quando quiser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
