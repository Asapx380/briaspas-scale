import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AppLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AppLayout({ children }: AppLayoutProps) {
  if (!isSupabaseConfigured()) redirect("/login");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) redirect("/login");

  const email = typeof data.claims.email === "string" ? data.claims.email : null;

  let notificationCount = 0;
  try {
    const nowIso = new Date().toISOString();
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("follow_up_at", "is", null)
      .lt("follow_up_at", nowIso)
      .not("status", "in", "(won,lost)");
    notificationCount = count ?? 0;
  } catch {
    notificationCount = 0;
  }

  return (
    <AppShell email={email} notificationCount={notificationCount}>
      {children}
    </AppShell>
  );
}
