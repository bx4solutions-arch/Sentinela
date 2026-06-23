import { Sparkles, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { temIA } from "@/lib/ai-server";

export default async function ConfiguracoesPage() {
  const ligada = temIA();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> Inteligência Artificial</CardTitle>
          <p className="text-sm text-muted-foreground">
            A IA é <strong>inclusa</strong> no Sentinela — você <strong>não cadastra chave</strong>. O “Resumo Profundo” do edital e a análise já funcionam, sem configuração.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-sm" data-testid="config-ia">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            {ligada
              ? <Badge variant="secondary" data-testid="ia-status-on">IA inclusa · ligada</Badge>
              : <Badge variant="warning" data-testid="ia-status-off">temporariamente indisponível</Badge>}
          </div>
          <p className="text-muted-foreground">
            Determinístico primeiro (resumo do PNCP, checklist de habilitação, motor de preço) — a IA entra só onde agrega:
            a <strong>leitura profunda do edital</strong>. A extração é sob demanda e fica em <strong>cache</strong> (sem refazer custo).
          </p>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground" data-testid="config-seguranca">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            A chave de IA é <strong>gerenciada pela Sentinela no servidor</strong> — nunca trafega pelo seu navegador, nunca é exposta
            e nunca é commitada. Todas as chamadas à IA são <strong>server-side</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
