import { createClient as createSb } from "@supabase/supabase-js";

/** Client com service_role — SOMENTE no servidor. Lê/escreve config de IA (chaves)
 *  e grava análises, contornando RLS. Nunca importar em componente client. */
export function createAdminClient() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
