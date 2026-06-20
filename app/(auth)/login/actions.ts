"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("user already registered")) return "Este e-mail já tem conta. Use Entrar.";
  if (m.includes("password should be at least")) return "A senha deve ter ao menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "E-mail inválido.";
  if (m.includes("signups not allowed")) return "Cadastro desabilitado no projeto.";
  return msg;
}

/** Login OU cadastro, conforme o campo `intent` do botão acionado. */
export async function authenticate(formData: FormData) {
  const intent = String(formData.get("intent") ?? "signin");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) redirect(`/login?error=${encodeURIComponent(traduzErro(error.message))}`);
    if (!data.session) {
      // (caso confirmação de e-mail estivesse ligada)
      redirect(`/login?msg=${encodeURIComponent("Conta criada. Agora faça login.")}`);
    }
    revalidatePath("/", "layout");
    redirect("/onboarding"); // primeiro acesso → wizard guiado
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(traduzErro(error.message))}`);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
