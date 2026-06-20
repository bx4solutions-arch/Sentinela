import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "./wizard";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ trocar?: string }>;
}) {
  const { trocar } = await searchParams;
  const isTrocar = trocar === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recorrente (já tem empresa) pula o wizard — exceto quando troca deliberada.
  const { data: company } = await supabase.from("company").select("id").maybeSingle();
  if (company && !isTrocar) redirect("/empresa");

  return <Wizard userEmail={user.email ?? ""} trocar={isTrocar} />;
}
