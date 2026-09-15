import { PasswordRecoveryCard } from "@/components/ui/password-recovery-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function PasswordRecoveryPage() {
  return <PasswordRecoveryCard configured={isSupabaseConfigured()} />;
}
