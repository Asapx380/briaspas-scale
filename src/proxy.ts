import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const primaryHosts = new Set([
    "localhost",
    "127.0.0.1",
    process.env.PRIMARY_APP_HOST,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean));
  if (hostname && !primaryHosts.has(hostname) && request.nextUrl.pathname === "/") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && key) {
      const response = await fetch(supabaseUrl + "/rest/v1/rpc/resolve_custom_domain", {
        method: "POST",
        headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ target_hostname: hostname }),
      });
      if (response.ok) {
        const slug = await response.json() as string | null;
        if (slug) {
          const url = request.nextUrl.clone();
          url.pathname = "/empresa/" + slug;
          return NextResponse.rewrite(url);
        }
      }
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/login",
    "/cadastro",
    "/recuperar-senha",
    "/redefinir-senha",
    "/auth/:path*",
    "/app/:path*",
    "/api/v1/:path*",
    "/",
  ],
};
