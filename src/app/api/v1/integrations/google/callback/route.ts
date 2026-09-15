import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/workspaces/current";
import { encryptRefreshToken, getGoogleOAuthConfig } from "@/lib/google/oauth";

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");
  if (!code || !state || !expectedState || state !== expectedState) return NextResponse.redirect(new URL("/app/configuracoes/integracoes?google=invalid_state", request.url));

  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const tokens = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) return NextResponse.redirect(new URL("/app/configuracoes/integracoes?google=token_error", request.url));
  const userInfoResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + tokens.access_token } });
  const userInfo = await userInfoResponse.json() as { email?: string };
  const { supabase, userId } = await getCurrentWorkspace();
  const { error } = await supabase.from("google_connections").upsert({
    user_id: userId,
    google_account_email: userInfo.email ?? null,
    encrypted_refresh_token: encryptRefreshToken(tokens.refresh_token),
    scopes: tokens.scope?.split(" ") ?? [],
    expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    status: "connected",
    last_error: null,
  });
  return NextResponse.redirect(new URL("/app/configuracoes/integracoes?google=" + (error ? "save_error" : "connected"), request.url));
}
