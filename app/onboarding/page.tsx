import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "./wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Usuário recorrente (já tem empresa) pula o wizard.
  const { data: company } = await supabase.from("company").select("id").maybeSingle();
  if (company) redirect("/empresa");

  return <Wizard userEmail={user.email ?? ""} />;
}
