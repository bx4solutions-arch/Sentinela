"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { monitorarCidade } from "./actions";
import type { Municipio } from "@/lib/ibge";

/** Adiciona uma cidade ao monitoramento (UF da empresa). Enfileira a coleta se for nova. */
export function CityPicker({ uf, municipios }: { uf: string; municipios: Municipio[] }) {
  const [sel, setSel] = useState("");
  const m = municipios.find((x) => x.codigo_ibge === sel);
  return (
    <form action={monitorarCidade} className="flex items-center gap-2">
      <input type="hidden" name="uf" value={uf} />
      <input type="hidden" name="codigo_ibge" value={sel} />
      <input type="hidden" name="municipio" value={m?.nome ?? ""} />
      <Select value={sel} onChange={(e) => setSel(e.target.value)} className="h-8 w-48 text-xs" aria-label="Adicionar cidade">
        <option value="" disabled>Adicionar cidade ({uf})…</option>
        {municipios.map((x) => <option key={x.codigo_ibge} value={x.codigo_ibge}>{x.nome}</option>)}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={!sel}><Plus className="size-4" /> Monitorar</Button>
    </form>
  );
}
