"use client";

import { useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { FileDown, Check, CircleAlert, FileText, Sparkles, ArrowUp, ArrowDown, Plus, Trash2, FileType, Package } from "lucide-react";
import { Card, CardContent, Badge, Button, Input } from "@/components/ui";
import type { SecaoProposta } from "@/lib/proposta";
import { melhorarSecaoProposta } from "./actions";

type Decl = { id: string; titulo: string; texto: string };
type MatrizItem = { id: string; tipo: "certidao" | "declaracao"; label: string; exigencia: string; atendido: boolean; evidencia: string; declId?: string };
type Timbre = { razao: string | null; cnpj: string | null; municipio: string | null; uf: string | null };
type KitItem = { ordem: number; nome: string; status: string };
type SecaoEdit = SecaoProposta & { _ia?: string | null };
type Linha = { h?: string; p?: string; b?: boolean };

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export function PropostaGerador({ secoes: secoesIniciais, declaracoes, matriz, proponente, objeto = null, orgao = null, timbre, kit = [] }: {
  secoes: SecaoProposta[]; declaracoes: Decl[]; matriz: MatrizItem[]; proponente: string; objeto?: string | null; orgao?: string | null;
  timbre?: Timbre; kit?: KitItem[];
}) {
  const [secoes, setSecoes] = useState<SecaoEdit[]>(secoesIniciais.map((s) => ({ ...s })));
  const [confirmadas, setConfirmadas] = useState<Set<string>>(new Set(secoesIniciais.map((s) => s.id)));
  const [declSel, setDeclSel] = useState<Set<string>>(new Set(declaracoes.map((d) => d.id)));
  const [preco, setPreco] = useState("");
  const [gerado, setGerado] = useState(false);
  const [pdfGerado, setPdfGerado] = useState(false);
  const [kitGerado, setKitGerado] = useState(false);
  const [iaLoad, setIaLoad] = useState<string | null>(null);
  const [novoN, setNovoN] = useState(0);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    setter(n);
  };
  const patch = (id: string, p: Partial<SecaoEdit>) => setSecoes((arr) => arr.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const mover = (i: number, dir: -1 | 1) => setSecoes((arr) => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const n = [...arr];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const remover = (id: string) => { setSecoes((arr) => arr.filter((s) => s.id !== id)); toggle(confirmadas, id, setConfirmadas); };
  const adicionar = () => {
    const id = `nova-${novoN}`;
    setNovoN((n) => n + 1);
    setSecoes((arr) => [...arr, { id, titulo: "Nova seção", conteudo: "" }]);
    setConfirmadas((c) => new Set(c).add(id));
  };

  async function melhorar(s: SecaoEdit) {
    setIaLoad(s.id);
    try {
      const r = await melhorarSecaoProposta({ titulo: s.titulo, conteudo: s.conteudo, objeto, orgao });
      if (r.ok && r.texto) patch(s.id, { conteudo: r.texto, _ia: "melhorado com IA ✓" });
      else patch(s.id, { _ia: r.motivo ?? "IA indisponível — em ingestão." });
    } catch (e) {
      patch(s.id, { _ia: `falha na IA: ${String(e instanceof Error ? e.message : e).slice(0, 60)}` });
    } finally {
      setIaLoad(null);
    }
  }

  // Montagem única do documento (timbre + seções confirmadas + declarações) — usada por DOCX e PDF.
  function montarLinhas(): Linha[] {
    const out: Linha[] = [];
    out.push({ p: timbre?.razao ?? proponente, b: true });
    const ident = [timbre?.cnpj ? `CNPJ ${timbre.cnpj}` : null, [timbre?.municipio, timbre?.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
    if (ident) out.push({ p: ident });
    out.push({ p: "" });
    for (const s of secoes) {
      if (!confirmadas.has(s.id)) continue;
      out.push({ h: s.titulo });
      for (const linha of s.conteudo.split("\n")) out.push({ p: linha });
      if (s.precoEditavel && preco.trim()) out.push({ p: `Valor da proposta: ${preco.trim()} (definido pela empresa).` });
    }
    const decls = declaracoes.filter((d) => declSel.has(d.id));
    if (decls.length) { out.push({ h: "Declarações" }); for (const d of decls) { out.push({ p: `${d.titulo}:`, b: true }); out.push({ p: d.texto }); } }
    out.push({ p: "" });
    out.push({ p: proponente, b: true });
    out.push({ p: "Documento gerado pelo Sentinela — referência operacional; revise antes de protocolar. Não inclui peça processual." });
    return out;
  }

  async function docxBlob(): Promise<Blob> {
    const kids: Paragraph[] = [];
    for (const l of montarLinhas()) {
      if (l.h) kids.push(new Paragraph({ text: l.h, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } }));
      else kids.push(new Paragraph({ children: [new TextRun({ text: l.p ?? "", bold: !!l.b })], spacing: { after: 60 } }));
    }
    const doc = new Document({ sections: [{ children: kids }] });
    return Packer.toBlob(doc);
  }

  async function gerarDocx() { baixar(await docxBlob(), "proposta-sentinela.docx"); setGerado(true); }

  function gerarPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const M = 48, W = 595 - M * 2; let y = M;
    const escreve = (txt: string, size: number, bold: boolean, gap: number) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      for (const pt of doc.splitTextToSize(txt || " ", W) as string[]) {
        if (y > 790) { doc.addPage(); y = M; }
        doc.text(pt, M, y); y += size + gap;
      }
    };
    for (const l of montarLinhas()) { if (l.h) { y += 6; escreve(l.h, 13, true, 6); } else escreve(l.p ?? "", 11, !!l.b, 4); }
    doc.save("proposta-sentinela.pdf");
    setPdfGerado(true);
  }

  async function baixarKit() {
    const zip = new JSZip();
    const idx = [
      "KIT DE HABILITAÇÃO — índice (ordem do edital)",
      `Proponente: ${timbre?.razao ?? proponente}${timbre?.cnpj ? ` · CNPJ ${timbre.cnpj}` : ""}`,
      "",
      ...(kit.length ? kit.map((k) => `${String(k.ordem).padStart(2, "0")}. ${k.nome} — [${k.status}]`) : ["(checklist indisponível)"]),
      "",
      "Anexe os documentos do seu cofre NESTA ORDEM. Itens marcados como falta/ausente devem ser providenciados antes do protocolo.",
      "Documento operacional — revise antes de protocolar. Não inclui peça processual (impugnação/recurso).",
    ].join("\n");
    zip.file("00-INDICE.txt", idx);
    zip.file("01-proposta.docx", await docxBlob());
    zip.file("LEIA-ME.txt", "Gerado pelo Sentinela. Confira cada item do índice e anexe as evidências na ordem indicada. A ordem segue o edital. Peça processual não incluída.");
    baixar(await zip.generateAsync({ type: "blob" }), "kit-habilitacao-sentinela.zip");
    setKitGerado(true);
  }

  return (
    <div className="space-y-3" data-testid="proposta-gerador">
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-sm font-semibold">Gerador de Proposta — seção por seção</p></div>
        <p className="mt-1 text-xs text-muted-foreground">Cada seção é pré-preenchida com seus dados reais. <strong>Edite</strong>, use <strong>“melhorar com IA”</strong>, <strong>reordene</strong> ou <strong>adicione</strong> seções. <strong>Confirme</strong> as que entram → gere <strong>DOCX/PDF no timbre</strong> ou baixe o <strong>Kit de Habilitação (ZIP)</strong>. O <strong>preço é você quem define</strong>. Peça processual não é gerada.</p>
        {timbre?.razao && <p className="mt-2 rounded border bg-muted/40 px-2 py-1 text-xs text-foreground" data-testid="timbre-preview">Timbre: <strong>{timbre.razao}</strong>{timbre.cnpj ? ` · CNPJ ${timbre.cnpj}` : ""}{timbre.municipio ? ` · ${timbre.municipio}${timbre.uf ? `/${timbre.uf}` : ""}` : ""}</p>}
      </CardContent></Card>

      {secoes.map((s, i) => {
        const on = confirmadas.has(s.id);
        return (
          <Card key={s.id} data-testid="secao-proposta" className={on ? "border-primary/40" : "opacity-70"}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 text-sm font-semibold">{s.titulo}</p>
                <Button type="button" size="sm" variant="ghost" data-testid="mover-cima" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp className="size-4" /></Button>
                <Button type="button" size="sm" variant="ghost" data-testid="mover-baixo" aria-label="Descer" disabled={i === secoes.length - 1} onClick={() => mover(i, 1)}><ArrowDown className="size-4" /></Button>
                <Button type="button" size="sm" variant="ghost" data-testid="melhorar-ia" disabled={iaLoad === s.id} onClick={() => melhorar(s)}><Sparkles className="size-4" /> {iaLoad === s.id ? "Melhorando…" : "Melhorar com IA"}</Button>
                <Button type="button" size="sm" variant="ghost" data-testid="remover-secao" aria-label="Remover" onClick={() => remover(s.id)}><Trash2 className="size-4" /></Button>
                <Button type="button" size="sm" variant={on ? "outline" : "ghost"} data-testid="confirmar-secao" onClick={() => toggle(confirmadas, s.id, setConfirmadas)}>
                  {on ? <><Check className="size-4" /> Confirmada</> : "Incluir"}
                </Button>
              </div>
              <textarea
                value={s.conteudo}
                onChange={(e) => patch(s.id, { conteudo: e.target.value, _ia: null })}
                data-testid="secao-textarea"
                rows={Math.min(8, Math.max(2, s.conteudo.split("\n").length))}
                className="mt-2 w-full resize-y rounded-md border bg-background p-2 text-sm text-foreground"
              />
              {s._ia && <p className="mt-1 text-xs text-muted-foreground" data-testid="ia-status">{s._ia}</p>}
              {s.precoEditavel && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-muted-foreground">Valor da proposta (você define)</label>
                  <Input value={preco} onChange={(e) => setPreco(e.target.value)} data-testid="input-preco" placeholder="ex.: R$ 120.000,00" className="max-w-xs" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button type="button" variant="outline" size="sm" data-testid="add-secao" onClick={adicionar}><Plus className="size-4" /> Nova seção</Button>

      {/* Declarações */}
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold">Declarações (típicas — as exigidas no edital entram com o texto)</p>
        <ul className="space-y-1.5">
          {declaracoes.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <Button type="button" size="sm" variant={declSel.has(d.id) ? "outline" : "ghost"} onClick={() => toggle(declSel, d.id, setDeclSel)} data-testid="toggle-decl">
                {declSel.has(d.id) ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
              </Button>
              <span className="flex-1">{d.titulo}</span>
            </li>
          ))}
        </ul>
      </CardContent></Card>

      {/* Matriz de atendimento — amarra checklist → habilitação; declaração exigida → [Gerar] no documento */}
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold">Matriz de atendimento (item → evidência → status)</p>
        <ul className="divide-y rounded-md border" data-testid="matriz-atendimento">
          {matriz.map((m) => {
            const isDecl = m.tipo === "declaracao" && !!m.declId;
            const atende = isDecl ? declSel.has(m.declId as string) : m.atendido;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-2 p-2.5 text-sm" data-testid="matriz-item" data-tipo={m.tipo}>
                <Badge variant={atende ? "success" : "destructive"} data-testid="matriz-status">{atende ? "✓ atende" : "❌ falta"}</Badge>
                <span className="min-w-0 flex-1">{m.label}</span>
                {isDecl
                  ? (atende
                      ? <span className="text-xs text-muted-foreground" data-testid="matriz-no-doc">no documento ✓</span>
                      : <Button type="button" size="sm" variant="outline" data-testid="matriz-gerar" onClick={() => setDeclSel((s) => new Set(s).add(m.declId as string))}><FileDown className="size-4" /> Gerar</Button>)
                  : (m.atendido
                      ? <span className="text-xs text-muted-foreground">{m.evidencia}</span>
                      : <Button asChild size="sm" variant="outline" data-testid="matriz-anexar"><a href="/empresa">Anexar no cofre</a></Button>)}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Declaração exigida → <strong>Gerar</strong> inclui o texto no documento. Certidão que falta → <strong>Anexar no cofre</strong> (não fabricamos certidão).</p>
      </CardContent></Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={gerarDocx} data-testid="gerar-docx"><FileDown className="size-4" /> Gerar proposta (DOCX)</Button>
        <Button type="button" variant="outline" onClick={gerarPdf} data-testid="gerar-pdf"><FileType className="size-4" /> Gerar PDF</Button>
        <Button type="button" variant="outline" onClick={baixarKit} data-testid="baixar-kit"><Package className="size-4" /> Kit de Habilitação (ZIP)</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {gerado && <span className="text-xs text-muted-foreground" data-testid="docx-gerado">DOCX gerado e baixado ✓</span>}
        {pdfGerado && <span className="text-xs text-muted-foreground" data-testid="pdf-gerado">PDF gerado e baixado ✓</span>}
        {kitGerado && <span className="text-xs text-muted-foreground" data-testid="kit-gerado">Kit (ZIP) gerado e baixado ✓</span>}
      </div>
      <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Documento operacional — <strong>revise antes de protocolar</strong>. Não é peça jurídica; impugnação/recurso ficam travados. A IA <strong>melhora a redação, não inventa fato</strong>; sem chave configurada fica “em ingestão”.</p>
    </div>
  );
}
