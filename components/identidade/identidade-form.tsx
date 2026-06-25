"use client";

// Identidade Visual da empresa — form (esquerda) + pré-visualização ao vivo (direita).
// A marca/cabeçalho/assinante saem assim nas propostas e documentos gerados.
import { useState } from "react";
import { Palette, Heading, Signature, FileText, Upload, Save, Eye } from "lucide-react";
import { Card, CardContent, Button, Input, Label, Select, Switch } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { salvarIdentidade } from "@/app/(shell)/configuracoes/actions";

type Company = {
  razao_social: string | null; cnpj: string | null; municipio: string | null; uf: string | null;
  logo_url: string | null; cor_primaria: string | null; cor_secundaria: string | null; cor_texto: string | null;
  tipografia: string | null;
  cabecalho_linha1: string | null; cabecalho_linha2: string | null; cabecalho_linha3: string | null; cabecalho_linha4: string | null;
  usar_logo_no_cabecalho: boolean | null; rodape_padrao: string | null; rodape_texto_extra: string | null; rodape_mostrar_gerado: boolean | null;
  papel: string | null; numeracao_formato: string | null; formato_data: string | null;
  assinante_padrao_nome: string | null; assinante_padrao_cargo: string | null;
  responsavel_nome: string | null; responsavel_cargo: string | null; responsavel_email: string | null; responsavel_telefone: string | null;
};

const PALETAS = [
  { nome: "Verde Sentinela", v: "#1d9e75" },
  { nome: "Azul institucional", v: "#185fa5" },
  { nome: "Vermelho", v: "#a32d2d" },
  { nome: "Roxo", v: "#534ab7" },
];

export function IdentidadeForm({ company }: { company: Company }) {
  const c = company;
  const [primaria, setPrimaria] = useState(c.cor_primaria ?? "#1d9e75");
  const [texto] = useState(c.cor_texto ?? "#1a1a1a");
  const [l1, setL1] = useState(c.cabecalho_linha1 ?? c.razao_social ?? "");
  const [l2, setL2] = useState(c.cabecalho_linha2 ?? (c.cnpj ? `CNPJ ${c.cnpj}` : ""));
  const [l3, setL3] = useState(c.cabecalho_linha3 ?? [c.municipio, c.uf].filter(Boolean).join("/"));
  const [assinante, setAssinante] = useState(c.assinante_padrao_nome ?? "");
  const [assinanteCargo, setAssinanteCargo] = useState(c.assinante_padrao_cargo ?? "");
  const [numeracao, setNumeracao] = useState(c.numeracao_formato ?? "PROP/{seq}/{ano}");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState(c.logo_url ?? "");
  const [uploadMsg, setUploadMsg] = useState("");

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file)); // preview imediato (sem depender de signed URL)
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setUploadMsg("entre para enviar o logo"); return; }
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/logo.${ext}`;
      const { error } = await sb.storage.from("company-assets").upload(path, file, { upsert: true });
      if (error) { setUploadMsg("logo só na pré-visualização (upload: " + error.message + ")"); return; }
      setLogoPath(path); setUploadMsg("logo enviado ✓");
    } catch { setUploadMsg("logo só na pré-visualização"); }
  }

  const iniciais = (c.razao_social ?? "E").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <form action={salvarIdentidade} data-testid="identidade-form" className="grid gap-4 lg:grid-cols-2">
      {/* ---------- Coluna do form ---------- */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4 text-primary" /> Cor da marca</p>
            <div className="flex flex-wrap items-center gap-2">
              {PALETAS.map((p) => (
                <button type="button" key={p.v} title={p.nome} onClick={() => setPrimaria(p.v)}
                  className="size-7 rounded-md border" style={{ background: p.v, outline: primaria === p.v ? "2px solid var(--ring)" : "none", outlineOffset: 2 }} />
              ))}
              <input type="color" aria-label="Cor primária" data-testid="if-cor-primaria" name="cor_primaria"
                value={primaria} onChange={(e) => setPrimaria(e.target.value)} className="h-7 w-12 cursor-pointer rounded border" />
              <input type="hidden" name="cor_texto" value={texto} />
              <input type="hidden" name="cor_secundaria" value={c.cor_secundaria ?? ""} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Logo da empresa</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground hover:bg-accent">
                <Upload className="size-4" /> {logoPreview ? "trocar logo" : "enviar logo (PNG/JPG)"}
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="if-logo" />
              </label>
              <input type="hidden" name="logo_url" value={logoPath} />
              {uploadMsg && <p className="mt-1 text-[11px] text-muted-foreground">{uploadMsg}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Heading className="size-4 text-primary" /> Cabeçalho do documento</p>
            <Input name="cabecalho_linha1" value={l1} onChange={(e) => setL1(e.target.value)} data-testid="if-cabecalho1" placeholder="Razão social" />
            <Input name="cabecalho_linha2" value={l2} onChange={(e) => setL2(e.target.value)} placeholder="CNPJ" />
            <Input name="cabecalho_linha3" value={l3} onChange={(e) => setL3(e.target.value)} placeholder="Cidade/UF · segmento" />
            <Input name="cabecalho_linha4" defaultValue={c.cabecalho_linha4 ?? ""} placeholder="linha extra (opcional)" />
            <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Switch name="usar_logo_no_cabecalho" defaultChecked={c.usar_logo_no_cabecalho ?? true} /> mostrar logo no cabeçalho
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Signature className="size-4 text-primary" /> Assinante das propostas</p>
            <Input name="assinante_padrao_nome" value={assinante} onChange={(e) => setAssinante(e.target.value)} data-testid="if-assinante" placeholder="Nome de quem assina" />
            <Input name="assinante_padrao_cargo" value={assinanteCargo} onChange={(e) => setAssinanteCargo(e.target.value)} placeholder="Cargo (ex.: Responsável Técnico — CRBio)" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Input name="responsavel_email" defaultValue={c.responsavel_email ?? ""} placeholder="E-mail de contato" />
              <Input name="responsavel_telefone" defaultValue={c.responsavel_telefone ?? ""} placeholder="Telefone" />
            </div>
            <input type="hidden" name="responsavel_nome" value={assinante} />
            <input type="hidden" name="responsavel_cargo" value={assinanteCargo} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-primary" /> Numeração e papel</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Numeração</Label>
                <Input name="numeracao_formato" value={numeracao} onChange={(e) => setNumeracao(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1 block text-xs text-muted-foreground">Papel</Label>
                <Select name="papel" defaultValue={c.papel ?? "a4"}><option value="a4">A4</option><option value="oficio">Ofício</option></Select>
              </div>
            </div>
            <input type="hidden" name="tipografia" value={c.tipografia ?? "Arial"} />
            <input type="hidden" name="formato_data" value={c.formato_data ?? "dd/MM/yyyy"} />
            <input type="hidden" name="rodape_padrao" value={c.rodape_padrao ?? ""} />
            <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Switch name="rodape_mostrar_gerado" defaultChecked={c.rodape_mostrar_gerado ?? true} /> mostrar “gerado pelo Sentinela” no rodapé
            </label>
          </CardContent>
        </Card>

        <Button type="submit" data-testid="identidade-salvar"><Save className="size-4" /> Salvar identidade</Button>
      </div>

      {/* ---------- Coluna da pré-visualização ao vivo ---------- */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="size-3.5" /> Pré-visualização — sai assim na proposta e nos documentos</p>
        <div className="rounded-lg border bg-white p-4" data-testid="identidade-preview">
          <div className="flex items-center gap-3 pb-2.5" style={{ borderBottom: `2px solid ${primaria}` }}>
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="size-10 rounded object-contain" />
              : <div className="grid size-10 place-items-center rounded text-xs font-semibold text-white" style={{ background: primaria }}>{iniciais}</div>}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold" style={{ color: primaria }}>{l1 || "Razão social da empresa"}</p>
              <p className="truncate text-[11px] text-neutral-500">{[l2, l3].filter(Boolean).join(" — ")}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] font-semibold" style={{ color: texto }}>
            PROPOSTA COMERCIAL Nº {numeracao.replace("{seq}", "001").replace("{ano}", "2026")}
          </p>
          <p className="mb-2 text-center text-[11px] text-neutral-500">Pregão Eletrônico — órgão público</p>
          <div className="my-1.5 h-1.5 rounded bg-neutral-100" />
          <div className="my-1.5 h-1.5 w-5/6 rounded bg-neutral-100" />
          <div className="my-1.5 h-1.5 w-2/3 rounded bg-neutral-100" />
          <div className="mt-6 text-right text-[11px]">
            <span className="inline-block border-t border-neutral-400 pt-1 text-neutral-800">
              {assinante || "Nome do assinante"}<br /><span className="text-neutral-500">{assinanteCargo || "Cargo"}</span>
            </span>
          </div>
          <p className="mt-3 border-t border-neutral-100 pt-1.5 text-center text-[9px] text-neutral-400">
            {(c.razao_social ?? "Empresa")} — página 1 — gerado pelo Sentinela
          </p>
        </div>
      </div>
    </form>
  );
}
