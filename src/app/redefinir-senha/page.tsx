import { UpdatePasswordCard } from "@/components/ui/update-password-card";
import { createClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <UpdatePasswordCard recoverySession={typeof data?.claims?.sub === "string"} />;
}
