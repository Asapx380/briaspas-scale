import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublishedSite } from "@/lib/sites/published-site";
import { isValidSitePreviewToken, sitePreviewCookieName, SITE_PREVIEW_TTL_MS } from "@/lib/sites/site-preview-token";
import { contentTypeFor, validateUploadedSitePath } from "@/lib/sites/uploaded-site-zip";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function validAssetPath(parts: string[]) {
  if (parts.length === 0) return "index.html";
  const joined = parts.join("/");
  if (parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) return null;
  return validateUploadedSitePath(joined);
}

function escapedAttribute(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function visitScript(slug: string, isPreview = false) {
  return `<script>(function(){var n='briaspas_visit_session',v=document.cookie.split('; ').find(function(x){return x.indexOf(n+'=')===0});var i=v?v.split('=')[1]:crypto.randomUUID();if(!v)document.cookie=n+'='+i+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https'?'; Secure':'');var p=${isPreview ? "true" : "false"}||new URLSearchParams(location.search).has('preview');fetch('/api/v1/site-visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:${JSON.stringify(slug)},sessionId:i,referrerHost:document.referrer?new URL(document.referrer).hostname:null,utmSource:new URLSearchParams(location.search).get('utm_source'),utmMedium:new URLSearchParams(location.search).get('utm_medium'),utmCampaign:new URLSearchParams(location.search).get('utm_campaign'),isPreview:p}),keepalive:true})})()</script>`;
}

function previewAssetUrl(value: string, slug: string, token: string, sourcePath: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return value;
  const siteRoot = `/empresa/${encodeURIComponent(slug)}/`;
  const sourceDirectory = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1) : "";
  const basePath = `${siteRoot}${sourceDirectory}`;
  const localUrl = new URL(trimmed.startsWith("/") ? `${siteRoot}${trimmed.slice(1)}` : trimmed, `http://preview.local${basePath}`);
  localUrl.searchParams.set("preview", token);
  return `${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
}

function addPreviewTokenToHtml(html: string, slug: string, token: string) {
  return html.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (_match, attribute: string, quote: string, value: string) =>
    `${attribute}=${quote}${previewAssetUrl(value, slug, token, "index.html")}${quote}`,
  );
}

function addPreviewTokenToCss(css: string, slug: string, token: string, sourcePath: string) {
  return css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (_match, quote: string, value: string) =>
    `url(${quote}${previewAssetUrl(value, slug, token, sourcePath)}${quote})`,
  );
}

type SiteToServe = {
  lead_id?: number;
  company_name: string;
  address: string | null;
  site_html: string | null;
  site_source: "uploaded" | "generated" | null;
  site_storage_path: string | null;
};

async function getPreviewSite(slug: string, token: string | null) {
  if (!token) {
    console.warn("site_preview_failed stage=missing_token");
    return null;
  }
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    console.warn("site_preview_failed stage=authentication");
    return null;
  }
  const { data, error } = await supabase.from("leads")
    .select("id, company_name, address, site_html, site_source, site_storage_path, site_preview_token_hash, site_preview_expires_at")
    .eq("slug", slug).maybeSingle();
  if (error || !data || data.site_source !== "uploaded" || !data.site_storage_path) {
    console.warn(`site_preview_failed stage=lead_lookup error=${error?.message ?? "not_found"}`);
    return null;
  }
  if (!isValidSitePreviewToken(token, data.site_preview_token_hash, data.site_preview_expires_at)) {
    console.warn("site_preview_failed stage=token_validation");
    return null;
  }
  return { site: { ...data, lead_id: data.id } as SiteToServe, supabase };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; path?: string[] }> }) {
  const { slug, path = [] } = await params;
  const assetPath = validAssetPath(path);
  if (!assetPath) notFound();
  const publishedSite = await getPublishedSite(slug);
  const requestUrl = new URL(request.url);
  const cookieName = sitePreviewCookieName(slug);
  const queryToken = requestUrl.searchParams.get("preview");
  const cookieToken = (await cookies()).get(cookieName)?.value ?? null;
  const preview = publishedSite ? null : await getPreviewSite(slug, queryToken ?? cookieToken);
  const site = (publishedSite ?? preview?.site) as SiteToServe | null;
  if (!site) notFound();

  if (site.site_source === "uploaded" && site.site_storage_path) {
    const storageClient = preview?.supabase ?? createPublicClient();
    const { data, error } = await storageClient.storage.from("lead-sites").download(`${site.site_storage_path}/${assetPath}`);
    if (error || !data) {
      console.warn(`site_preview_failed stage=storage_download error=${error?.message ?? "not_found"}`);
      notFound();
    }
    const isIndex = assetPath === "index.html";
    const activePreviewToken = preview ? queryToken ?? cookieToken : null;
    let content: string | ArrayBuffer;
    if (isIndex) {
      const html = await data.text();
      const withVisit = html.includes("</body>")
        ? html.replace(/<\/body\s*>/i, `${visitScript(slug, Boolean(preview))}</body>`)
        : `${html}${visitScript(slug, Boolean(preview))}`;
      content = preview && activePreviewToken
        ? addPreviewTokenToHtml(withVisit, slug, activePreviewToken)
        : withVisit;
    } else if (preview && activePreviewToken && assetPath.toLowerCase().endsWith(".css")) {
      content = addPreviewTokenToCss(await data.text(), slug, activePreviewToken, assetPath);
    } else {
      content = await data.arrayBuffer();
    }
    const headers = new Headers({
      "Content-Type": contentTypeFor(assetPath), "X-Content-Type-Options": "nosniff",
      "Cache-Control": preview ? "private, no-store" : isIndex ? "no-store" : "public, max-age=3600",
    });
    if (preview && queryToken && isIndex) {
      const secure = requestUrl.protocol === "https:" ? "; Secure" : "";
      headers.append("Set-Cookie", `${cookieName}=${encodeURIComponent(queryToken)}; HttpOnly; Path=/empresa/${encodeURIComponent(slug)}; Max-Age=${SITE_PREVIEW_TTL_MS / 1000}; SameSite=Lax${secure}`);
    }
    return new Response(content, {
      headers,
    });
  }

  if (assetPath !== "index.html" || !site.site_html) notFound();
  const legacyPage = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${site.company_name}</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0}</style></head><body>${visitScript(slug)}<iframe title="Site de ${site.company_name}" sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="${escapedAttribute(site.site_html)}"></iframe></body></html>`;
  return new Response(legacyPage, {
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" },
  });
}
