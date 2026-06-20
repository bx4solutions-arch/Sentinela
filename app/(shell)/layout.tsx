import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Empresa do tenant (RLS garante isolamento). Sem empresa → wizard guiado.
  const { data: company } = await supabase
    .from("company")
    .select("razao_social, nome_fantasia")
    .maybeSingle();

  if (!company) redirect("/onboarding");

  const companyName = company.razao_social || company.nome_fantasia || null;

  return (
    <Shell userEmail={user?.email ?? null} companyName={companyName}>
      {children}
    </Shell>
  );
}
