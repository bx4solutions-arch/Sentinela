"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Cpu, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Input, Label, Select, Badge } from "@/components/ui";
import { PROVIDERS, type Provider } from "@/lib/llm";
import { saveAiConfig, type AiConfigView } from "./actions";

function SalvarBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
      {pending ? "Salvando…" : "Salvar configuração"}
    </Button>
  );
}

export function ConfigForm({ initial }: { initial: AiConfigView | null }) {
  const [provider, setProvider] = useState<Provider>((initial?.provider as Provider) ?? "anthropic");
  const list = PROVIDERS.find((p) => p.key === provider)?.models ?? [];
  const initialModelInList = initial && list.includes(initial.model);
  const [model, setModel] = useState(initialModelInList ? initial!.model : "__custom__");
  const [custom, setCustom] = useState(initial && !initialModelInList ? initial.model : "");

  return (
    <form action={saveAiConfig} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="provider" className="flex items-center gap-1.5"><Cpu className="size-4" /> Provedor</Label>
        <Select id="provider" name="provider" value={provider}
          onChange={(e) => { const p = e.target.value as Provider; setProvider(p); setModel((PROVIDERS.find((x) => x.key === p)?.models[0]) ?? "__custom__"); }}>
          {PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="model">Modelo</Label>
        <Select id="model" name="model" value={model} onChange={(e) => setModel(e.target.value)}>
          {list.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="__custom__">Outro… (digitar id do modelo)</option>
        </Select>
        {model === "__custom__" && (
          <Input name="model_custom" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ex.: gpt-5, claude-..., gemini-..." className="mt-2" required />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="apiKey" className="flex items-center gap-1.5"><KeyRound className="size-4" /> Sua API key (BYOK)</Label>
        <Input id="apiKey" name="apiKey" type="password" autoComplete="off"
          placeholder={initial?.hasKey ? "•••••••••• (já configurada — deixe em branco p/ manter)" : "cole a chave do provedor"} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Guardada <strong>criptografada</strong> por conta. Nunca exposta no navegador nem em logs — as chamadas saem do servidor.</span>
          {initial?.hasKey && <Badge variant="success">chave configurada</Badge>}
        </div>
      </div>

      <SalvarBtn />
    </form>
  );
}
