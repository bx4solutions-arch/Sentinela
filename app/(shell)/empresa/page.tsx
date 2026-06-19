import { COMPANY, type Certificate } from "@/lib/mock";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { Building2, ShieldCheck, BellRing, Upload } from "lucide-react";
import { dataBR } from "@/lib/utils";

const HOJE = new Date("2026-06-19");
const dias = (iso: string) => Math.round((new Date(iso).getTime() - HOJE.getTime()) / 864e5);

const statusBadge = (c: Certificate) => {
  if (c.status === "VENCIDO") return <Badge variant="destructive">Vencido</Badge>;
  if (c.status === "A_RENOVAR") return <Badge variant="warning">A renovar</Badge>;
  return <Badge variant="success">Ativo</Badge>;
};

export default function EmpresaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha Empresa</h1>
        <p className="text-sm text-muted-foreground">Recorte, certidões e o Vigia de Documentos.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="size-4 text-primary" />Recorte & perfil</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-1 text-sm">
          <p className="font-semibold">{COMPANY.razaoSocial}</p>
          <p className="text-muted-foreground">{COMPANY.cidade}/{COMPANY.uf} · CNPJ {COMPANY.cnpj}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary">Setor: {COMPANY.recorte.setor}</Badge>
            <Badge variant="secondary">Região: {COMPANY.recorte.regiao}</Badge>
          </div>
          <div className="pt-1 text-xs text-muted-foreground">{COMPANY.cnaes.join(" · ")}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Vigia de Documentos & Certidões</span>
            <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><BellRing className="size-3.5" />Alerta automático</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-1">
          {COMPANY.certidoes.map((c) => {
            const d = dias(c.validade);
            return (
              <div key={c.tipo} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.tipo}</p>
                  <p className="text-xs text-muted-foreground">
                    Validade {dataBR(c.validade)} · {c.fonte === "AUTO" ? "puxada automaticamente" : <span className="inline-flex items-center gap-1"><Upload className="size-3" />upload manual</span>}
                    {" · "}{d >= 0 ? `vence em ${d}d` : `vencida há ${-d}d`}
                  </p>
                </div>
                {statusBadge(c)}
              </div>
            );
          })}
          <p className="pt-1 text-xs text-muted-foreground">Fontes com CAPTCHA usam modelo híbrido (upload + data). Alertas disparam N dias antes do vencimento.</p>
        </CardContent>
      </Card>
    </div>
  );
}
