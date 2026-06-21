"use client";

import { Printer, FileDown, Mail } from "lucide-react";
import { Button } from "@/components/ui";

/** Imprimir = real (window.print). .docx/e-mail = desabilitados "em breve" (sem botão fake). */
export function PastaActions() {
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
      <Button type="button" size="sm" variant="outline" disabled title="Em breve"><FileDown className="size-4" /> .docx</Button>
      <Button type="button" size="sm" variant="outline" disabled title="Em breve"><Mail className="size-4" /> E-mail</Button>
    </>
  );
}
