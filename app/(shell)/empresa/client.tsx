"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
import {
  Button, Input, Label, Select,
  Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui";
import { addDocumento } from "./actions";

/** Form de documento com sugestões + opção "Outro…" (tipo livre). */
export function AddDocForm({ tipos }: { tipos: { key: string; label: string }[] }) {
  const [tipo, setTipo] = useState("");
  const isOutro = tipo === "__outro__";

  return (
    <form action={addDocumento} className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-4">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="tipo-extra">Tipo de documento</Label>
        <Select id="tipo-extra" name="tipo" required value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="" disabled>Selecione…</option>
          {tipos.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          <option value="__outro__">Outro… (digitar)</option>
        </Select>
        {isOutro && (
          <Input name="tipo_custom" required placeholder="Ex.: Registro CRQ, Declaração ME/EPP…" className="mt-2" />
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="venc-extra">Vencimento</Label>
        <Input id="venc-extra" name="vencimento" type="date" required />
      </div>
      <div className="flex items-end">
        <Button type="submit" className="w-full"><Plus className="size-4" /> Adicionar</Button>
      </div>
    </form>
  );
}

/** Botão "Trocar empresa" com modal de aviso forte (ação deliberada). */
export function TrocarEmpresaButton() {
  const router = useRouter();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">Trocar empresa</Button>
      </DialogTrigger>
      <DialogContent>
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <DialogTitle>Trocar a empresa monitorada?</DialogTitle>
            <DialogDescription className="mt-2">
              Tudo que conhecemos da empresa atual — serviços, sócios, certidões cadastradas, órgãos
              monitorados e histórico — será <strong className="text-foreground">perdido</strong>, e o
              monitoramento <strong className="text-foreground">recomeça do zero</strong> para o novo CNPJ.
              Tem certeza?
            </DialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button size="sm" variant="destructive" onClick={() => router.push("/onboarding?trocar=1")}>
            Sim, trocar empresa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
