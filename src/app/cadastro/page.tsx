import { SignUpCard } from "@/components/ui/sign-up-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SignupPage() {
  const configured = isSupabaseConfigured();

  return <SignUpCard configured={configured} />;
}
