import { Shell } from "@/components/shell";
import { createClient } from "@/lib/supabase/server";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Empresa do tenant (pode não existir antes do onboarding). RLS garante o isolamento.
  const { data: company } = await supabase
    .from("company")
    .select("razao_social, nome_fantasia")
    .maybeSingle();

  const companyName = company?.nome_fantasia || company?.razao_social || null;

  return (
    <Shell userEmail={user?.email ?? null} companyName={companyName}>
      {children}
    </Shell>
  );
}
