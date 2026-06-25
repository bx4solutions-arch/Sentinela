"use client";

import { useState } from "react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { FileDown, Check, CircleAlert, FileText, Sparkles, ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, Badge, Button, Input } from "@/components/ui";
import type { SecaoProposta } from "@/lib/proposta";
import { melhorarSecaoProposta } from "./actions";

type Decl = { id: string; titulo: string; texto: string };
type MatrizItem = { label: string; exigencia: string; atendido: boolean; evidencia: string };
type SecaoEdit = SecaoProposta & { _ia?: string | null };

export function PropostaGerador({ secoes: secoesIniciais, declaracoes, matriz, proponente, objeto = null, orgao = null }: {
  secoes: SecaoProposta[]; declaracoes: Decl[]; matriz: MatrizItem[]; proponente: string; objeto?: string | null; orgao?: string | null;
}) {
  const [secoes, setSecoes] = useState<SecaoEdit[]>(secoesIniciais.map((s) => ({ ...s })));
  const [confirmadas, setConfirmadas] = useState<Set<string>>(new Set(secoesIniciais.map((s) => s.id)));
  const [declSel, setDeclSel] = useState<Set<string>>(new Set(declaracoes.map((d) => d.id)));
  const [preco, setPreco] = useState("");
  const [gerado, setGerado] = useState(false);
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

  async function gerarDocx() {
    const kids: Paragraph[] = [];
    const H = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } });
    const P = (t: string) => new Paragraph({ children: [new TextRun(t)], spacing: { after: 60 } });
    for (const s of secoes) {
      if (!confirmadas.has(s.id)) continue;
      kids.push(H(s.titulo));
      for (const linha of s.conteudo.split("\n")) kids.push(P(linha));
      if (s.precoEditavel && preco.trim()) kids.push(P(`Valor da proposta: ${preco.trim()} (definido pela empresa).`));
    }
    const decls = declaracoes.filter((d) => declSel.has(d.id));
    if (decls.length) {
      kids.push(H("Declarações"));
      for (const d of decls) { kids.push(new Paragraph({ children: [new TextRun({ text: d.titulo, bold: true })] })); kids.push(P(d.texto)); }
    }
    kids.push(new Paragraph({ text: "", spacing: { before: 240 } }));
    kids.push(P(`${proponente}`));
    kids.push(P("Documento gerado pelo Sentinela — referência operacional; revise antes de protocolar. Não inclui peça processual."));

    const doc = new Document({ sections: [{ children: kids }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "proposta-sentinela.docx"; a.click();
    URL.revokeObjectURL(url); setGerado(true);
  }

  return (
    <div className="space-y-3" data-testid="proposta-gerador">
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-2"><FileText className="size-4 text-primary" /><p className="text-sm font-semibold">Gerador de Proposta — seção por seção</p></div>
        <p className="mt-1 text-xs text-muted-foreground">Cada seção é pré-preenchida com seus dados reais. <strong>Edite</strong>, use <strong>“melhorar com IA”</strong>, <strong>reordene</strong> ou <strong>adicione</strong> seções. <strong>Confirme</strong> as que entram → <strong>Gere o DOCX</strong>. O <strong>preço é você quem define</strong>. Peça processual não é gerada.</p>
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

      {/* Matriz de atendimento */}
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-semibold">Matriz de atendimento (item → exigência → evidência)</p>
        <ul className="divide-y rounded-md border" data-testid="matriz-atendimento">
          {matriz.map((m, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
              <Badge variant={m.atendido ? "success" : "destructive"}>{m.atendido ? "✓ atende" : "❌ pendente"}</Badge>
              <span className="flex-1">{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.atendido ? m.evidencia : "providenciar"}</span>
            </li>
          ))}
        </ul>
      </CardContent></Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={gerarDocx} data-testid="gerar-docx"><FileDown className="size-4" /> Gerar proposta (DOCX)</Button>
        {gerado && <span className="text-xs text-muted-foreground" data-testid="docx-gerado">DOCX gerado e baixado ✓</span>}
      </div>
      <p className="rounded border border-warning/30 bg-warning/10 px-2 py-1 text-xs text-foreground">Documento operacional — <strong>revise antes de protocolar</strong>. Não é peça jurídica; impugnação/recurso ficam travados. A IA <strong>melhora a redação, não inventa fato</strong>; sem chave configurada fica “em ingestão”.</p>
    </div>
  );
}
