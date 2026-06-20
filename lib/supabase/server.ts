import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client Supabase para Server Components / Server Actions / Route Handlers.
 *  Respeita RLS (usa a anon key + sessão do usuário via cookies). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado de um Server Component — ignorável: o middleware renova a sessão.
          }
        },
      },
    }
  );
}
