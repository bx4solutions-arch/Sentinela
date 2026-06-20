"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapCnaeToSegmentos } from "@/lib/segmentos";

export type RaioX = {
  cnpj: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnaePrincipal: string | null;
  cnaePrincipalDesc: string | null;
  cnaesSecundarios: { codigo: string; descricao: string }[];
  porte: string | null;
  naturezaJuridica: string | null;
  municipio: string | null;
  uf: string | null;
  situacaoCadastral: string | null;
  segmentosSugeridos: string[];
  raw: unknown;
};

export type ConsultaState = { ok: boolean; error?: string; data?: RaioX };

const PORTE_LABEL: Record<string, string> = {
  "MICRO EMPRESA": "Microempresa (ME)",
  ME: "Microempresa (ME)",
  "PEQUENO PORTE": "Empresa de Pequeno Porte (EPP)",
  EPP: "Empresa de Pequeno Porte (EPP)",
  DEMAIS: "Demais (médio/grande)",
};

export async function consultarCnpj(
  _prev: ConsultaState,
  formData: FormData
): Promise<ConsultaState> {
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { ok: false, error: "CNPJ deve ter 14 dígitos." };

  let json: Record<string, unknown>;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: { "User-Agent": "sentinela/1.0" },
      cache: "no-store",
    });
    if (r.status === 404) return { ok: false, error: "CNPJ não encontrado na Receita Federal." };
    if (r.status === 429) return { ok: false, error: "Muitas consultas seguidas. Aguarde alguns segundos." };
    if (!r.ok) return { ok: false, error: `Falha na consulta (HTTP ${r.status}).` };
    json = (await r.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Não foi possível consultar a BrasilAPI agora. Tente novamente." };
  }

  const sec = (json.cnaes_secundarios as { codigo: number; descricao: string }[] | undefined) ?? [];
  const cnaesSecundarios = sec.map((c) => ({ codigo: String(c.codigo), descricao: c.descricao }));
  const cnaePrincipal = json.cnae_fiscal != null ? String(json.cnae_fiscal) : null;
  const segmentosSugeridos = mapCnaeToSegmentos([
    cnaePrincipal,
    ...cnaesSecundarios.map((c) => c.codigo),
  ]);
  const porte = (json.porte as string | null) ?? null;

  const data: RaioX = {
    cnpj,
    razaoSocial: (json.razao_social as string | null) ?? null,
    nomeFantasia: (json.nome_fantasia as string | null) || null,
    cnaePrincipal,
    cnaePrincipalDesc: (json.cnae_fiscal_descricao as string | null) ?? null,
    cnaesSecundarios,
    porte: porte ? PORTE_LABEL[porte] ?? porte : null,
    naturezaJuridica: (json.natureza_juridica as string | null) ?? null,
    municipio: (json.municipio as string | null) ?? null,
    uf: (json.uf as string | null) ?? null,
    situacaoCadastral: (json.descricao_situacao_cadastral as string | null) ?? null,
    segmentosSugeridos,
    raw: json,
  };
  return { ok: true, data };
}

export async function salvarEmpresa(formData: FormData) {
  const raioxStr = String(formData.get("raiox") ?? "");
  let p: RaioX;
  try {
    p = JSON.parse(raioxStr) as RaioX;
  } catch {
    redirect("/onboarding?error=" + encodeURIComponent("Dados inválidos. Refaça a consulta."));
  }

  const segmentos = formData.getAll("segmentos").map(String).filter(Boolean);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("company").upsert(
    {
      tenant_id: user.id,
      cnpj: p.cnpj,
      razao_social: p.razaoSocial,
      nome_fantasia: p.nomeFantasia,
      cnae_principal: p.cnaePrincipal,
      cnae_principal_desc: p.cnaePrincipalDesc,
      cnaes_secundarios: p.cnaesSecundarios,
      porte: p.porte,
      natureza_juridica: p.naturezaJuridica,
      municipio: p.municipio,
      uf: p.uf,
      situacao_cadastral: p.situacaoCadastral,
      segmentos: segmentos.length ? segmentos : ["generico"],
      raw: p.raw,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );
  if (error) redirect("/onboarding?error=" + encodeURIComponent(error.message));

  revalidatePath("/", "layout");
  redirect("/empresa");
}
