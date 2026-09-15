import { SignInCard } from "@/components/ui/sign-in-card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return <SignInCard configured={configured} />;
}
