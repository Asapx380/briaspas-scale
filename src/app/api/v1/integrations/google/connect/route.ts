import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentWorkspace } from "@/lib/workspaces/current";
import { getGoogleOAuthConfig, GOOGLE_CALENDAR_SCOPE } from "@/lib/google/oauth";

export async function GET() {
  await getCurrentWorkspace();
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE + " openid email");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
