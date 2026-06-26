"use client";

import { useEffect, useState } from "react";
import { MapPin, Building2, Plus, Trash2, Layers } from "lucide-react";
import { Button, Select, Badge, Card, CardContent } from "@/components/ui";
import { SEGMENTOS, SEG_LABEL } from "@/lib/segmentos";
import { monitorarEscopo, removerEscopo } from "@/app/(shell)/radar/actions";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export type CelulaEscopo = {
  id: string; nivel: string; codigo_ibge: string | null;
  municipio: string | null; uf: string | null; segmentos: string[];
};

/** Onde o cliente DEFINE o escopo: região (cidade ou estado) × segmento(s). O filtro é obrigatório. */
export function MonitoramentoPainel({ ufEmpresa, segmentosSugeridos, celulas }: {
  ufEmpresa: string; segmentosSugeridos: string[]; celulas: CelulaEscopo[];
}) {
  const [nivel, setNivel] = useState<"municipio" | "estado">("municipio");
  const [uf, setUf] = useState(ufEmpresa || "SP");
  const [municipios, setMunicipios] = useState<{ codigo_ibge: string; nome: string }[]>([]);
  const [codigoIbge, setCodigoIbge] = useState("");
  const [segs, setSegs] = useState<string[]>(segmentosSugeridos?.filter(Boolean) ?? []);
  const [carregando, setCarregando] = useState(false);

  // carrega municípios da UF (só no nível cidade)
  useEffect(() => {
    if (nivel !== "municipio" || !uf) { setMunicipios([]); return; }
    setCarregando(true);
    setCodigoIbge("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: { id: number; nome: string }[]) =>
        setMunicipios(d.map((m) => ({ codigo_ibge: String(m.id), nome: m.nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))))
      .catch(() => setMunicipios([]))
      .finally(() => setCarregando(false));
  }, [nivel, uf]);

  const municipio = municipios.find((m) => m.codigo_ibge === codigoIbge)?.nome ?? "";
  const valido = !!uf && segs.length > 0 && (nivel === "estado" || !!codigoIbge);

  const toggleSeg = (k: string) =>
    setSegs((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  return (
    <div className="mx-auto max-w-2xl space-y-5" data-testid="monitoramento-aba">
      {/* ---- Form: definir um novo escopo ---- */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold">Onde você quer licitação?</p>
            <p className="text-xs text-muted-foreground">
              Defina o escopo do seu monitoramento. O sistema só traz licitações da <strong>região</strong> e do(s)
              <strong> segmento(s)</strong> que você escolher.
            </p>
          </div>

          <form action={monitorarEscopo} className="space-y-4">
            {/* nível: cidade ou estado */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setNivel("municipio")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${nivel === "municipio" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <MapPin className="size-4" /> Cidade
              </button>
              <button type="button" onClick={() => setNivel("estado")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${nivel === "estado" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                <Building2 className="size-4" /> Estado inteiro
              </button>
            </div>
            <input type="hidden" name="nivel" value={nivel} />

            {/* região */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Estado (UF)</span>
                <Select name="uf" value={uf} onChange={(e) => setUf(e.target.value)} className="h-9">
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </Select>
              </label>
              {nivel === "municipio" && (
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Cidade</span>
                  <Select name="codigo_ibge" value={codigoIbge} onChange={(e) => setCodigoIbge(e.target.value)} className="h-9" disabled={carregando}>
                    <option value="" disabled>{carregando ? "Carregando…" : "Selecione a cidade"}</option>
                    {municipios.map((m) => <option key={m.codigo_ibge} value={m.codigo_ibge}>{m.nome}</option>)}
                  </Select>
                </label>
              )}
            </div>
            <input type="hidden" name="municipio" value={municipio} />

            {/* segmentos (obrigatório ≥1) */}
            <div className="space-y-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Layers className="size-3.5" /> Segmento(s) — escolha ao menos um
              </span>
              <div className="flex flex-wrap gap-2">
                {SEGMENTOS.map((s) => {
                  const on = segs.includes(s.key);
                  return (
                    <label key={s.key}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                      <input type="checkbox" name="segmentos" value={s.key} checked={on} onChange={() => toggleSeg(s.key)} className="sr-only" />
                      {s.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <Button type="submit" disabled={!valido} className="w-full" data-testid="salvar-escopo">
              <Plus className="size-4" /> Monitorar este escopo
            </Button>
            {!valido && (
              <p className="text-center text-[11px] text-muted-foreground">
                {nivel === "municipio" && !codigoIbge ? "Selecione a cidade. " : ""}
                {segs.length === 0 ? "Selecione ao menos um segmento." : ""}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ---- Escopos atuais ---- */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Seus escopos monitorados</p>
        {celulas.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-xs text-muted-foreground">
              Nenhum escopo ainda. Defina acima onde você quer licitação.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2" data-testid="lista-escopos">
            {celulas.map((c) => (
              <li key={c.id}>
                <Card><CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {c.nivel === "estado" ? <Building2 className="size-3.5 text-primary" /> : <MapPin className="size-3.5 text-primary" />}
                      {c.nivel === "estado" ? `${c.uf} (estado inteiro)` : `${c.municipio} · ${c.uf}`}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(c.segmentos?.length ? c.segmentos : ["(todos)"]).map((s) =>
                        <Badge key={s} variant="muted" className="text-[9px]">{SEG_LABEL[s] ?? s}</Badge>)}
                    </div>
                  </div>
                  <form action={removerEscopo}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label="Remover escopo"><Trash2 className="size-4" /></Button>
                  </form>
                </CardContent></Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
