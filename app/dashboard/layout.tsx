import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

// Guard server-side: sem sessão, manda para o login. Sem loop.
// Também provê a moldura (sidebar + topbar + trial) para todas as telas internas.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <Sidebar />
      <div className="ml-16 min-h-screen">
        <Topbar email={user.email ?? ""} userId={user.id} />
        <div className="bg-violeta py-2.5 text-center font-display text-[13px] font-semibold text-white">
          Seu período de avaliação dura até 08/07/2026 15:11
        </div>
        <main className="px-8 pb-16 pt-7">{children}</main>
      </div>
    </>
  );
}
