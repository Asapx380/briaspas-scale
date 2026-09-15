import type { LeadSiteInput } from "./build-generation-prompt";
import type { SiteBrief } from "./design-plan";
import { contentTypeFor, validateUploadedSitePath, type UploadedSiteFile } from "./uploaded-site-zip";
import { loadSiteTemplate, selectSiteTemplateManifest } from "./template-catalog";

export class SiteTemplateError extends Error {
  constructor(message: string) { super(message); this.name = "SiteTemplateError"; }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function escapeJavaScriptString(value: string) {
  return JSON.stringify(value).slice(1, -1).replaceAll("<", "\\u003c");
}

function validHttpUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function instagramUrl(value: string | null) {
  if (!value) return null;
  const asUrl = validHttpUrl(value);
  if (asUrl) return new URL(asUrl).hostname.toLowerCase().endsWith("instagram.com") ? asUrl : null;
  const handle = value.trim().replace(/^@/, "");
  return /^[a-z0-9._]{1,30}$/i.test(handle) ? `https://www.instagram.com/${handle}/` : null;
}

function whatsappNumber(phone: string | null) {
  let digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return /^\d{12,13}$/.test(digits) ? digits : null;
}

function mixWithWhite(hex: string, amount: number) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function darken(hex: string, amount: number) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * (1 - amount)).toString(16).padStart(2, "0")).join("")}`;
}

function fontCss(value: string) {
  return `'${value.replaceAll("'", "")}', sans-serif`;
}

function googleFontsUrl(brief: SiteBrief) {
  const names = [...new Set([brief.typography.display, brief.typography.body])];
  const families = names.map((name) => `family=${encodeURIComponent(name).replaceAll("%20", "+")}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

function genericHeadline(category: string) {
  const normalized = category.toLocaleLowerCase("pt-BR");
  if (normalized.includes("veterin")) return "Cuidado e informação para cada fase do seu pet";
  if (normalized.includes("banho") || normalized.includes("pet")) return "Praticidade para cuidar bem do seu pet";
  if (normalized.includes("odont") || normalized.includes("dent")) return "Informação e cuidado para o seu sorriso";
  if (normalized.includes("salão") || normalized.includes("cabele") || normalized.includes("barbear")) return "Seu estilo com atendimento direto e prático";
  if (normalized.includes("estética") || normalized.includes("spa")) return "Bem-estar e cuidado em cada detalhe";
  if (normalized.includes("academ") || normalized.includes("fitness") || normalized.includes("crossfit")) return "Movimento e orientação para seus objetivos";
  if (normalized.includes("advoc") || normalized.includes("direito")) return "Orientação jurídica com contato direto";
  if (normalized.includes("contab") || normalized.includes("contador")) return "Informação contábil para decisões mais seguras";
  if (normalized.includes("imobili") || normalized.includes("imóve")) return "Encontre informações para seu próximo imóvel";
  if (normalized.includes("restaurante") || normalized.includes("pizzaria") || normalized.includes("lanchonete")) return "Sabor e praticidade perto de você";
  if (normalized.includes("oficina") || normalized.includes("mecânic") || normalized.includes("auto center")) return "Informação clara para cuidar do seu veículo";
  if (normalized.includes("idioma") || normalized.includes("inglês")) return "Aprenda no seu ritmo e abra novas possibilidades";
  if (normalized.includes("loja") || normalized.includes("moda") || normalized.includes("boutique")) return "Estilo e atendimento em um só lugar";
  if (normalized.includes("coach") || normalized.includes("consult") || normalized.includes("mentor")) return "Clareza para transformar planos em próximos passos";
  if (normalized.includes("info") || normalized.includes("curso online") || normalized.includes("produtor digital")) return "Conhecimento prático para avançar seus objetivos";
  if (normalized.includes("médic") || normalized.includes("nutri")) return "Informação e cuidado para sua rotina";
  return `Encontre informações sobre ${category}`;
}

function removeSection(source: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`<!-- SECTION:${escaped}:start -->[\\s\\S]*?<!-- SECTION:${escaped}:end -->`, "g"), "");
}

function renderTokens(source: string, tokens: Record<string, string>) {
  const rendered = source.replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, name: string) => name in tokens ? tokens[name] : match);
  const unresolved = [...rendered.matchAll(/\{\{([a-z0-9_]+)\}\}/gi)].map((match) => match[1]);
  if (unresolved.length) throw new SiteTemplateError(`Template deixou campos sem preencher: ${[...new Set(unresolved)].join(", ")}.`);
  return rendered;
}

function serviceCards(brief: SiteBrief) {
  const icons = ["🩺", "🐾", "💙", "📋", "✨", "📞"];
  return brief.servicosSugeridos.map((service, index) => `<article class="servico-card"><div class="servico-icon" aria-hidden="true">${icons[index]}</div><h3 class="servico-title">${escapeHtml(service.nome)}</h3><p class="servico-description">${escapeHtml(service.microbeneficio)}</p></article>`).join("");
}

function confirmationCards(brief: SiteBrief) {
  return brief.diferenciais.map((item, index) => `<article class="destaque-card"><div class="destaque-number">${String(index + 1).padStart(2, "0")}</div><h3 class="destaque-title">Confirme este ponto</h3><p class="destaque-description">Pergunte sobre: ${escapeHtml(item)}</p></article>`).join("");
}

function gallery(photos: string[], companyName: string) {
  return photos.map((url, index) => `<figure class="galeria-item${index === 0 ? " galeria-item-large" : ""}"><img src="${escapeHtml(url)}" alt="Foto ${index + 1} de ${escapeHtml(companyName)}" loading="lazy"></figure>`).join("");
}

function stockCredit(input: LeadSiteInput) {
  if (input.photoUrls.length || !input.stockPhoto) return "";
  return `<p class="stock-credit">Foto por <a href="${escapeHtml(input.stockPhoto.photographerUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(input.stockPhoto.photographer)}</a> no <a href="${escapeHtml(input.stockPhoto.pexelsUrl)}" target="_blank" rel="noopener noreferrer">Pexels</a>. Imagem representativa da categoria.</p>`;
}

export async function renderSiteTemplate(input: LeadSiteInput, brief: SiteBrief): Promise<{ templateId: string; files: UploadedSiteFile[] }> {
  const manifest = selectSiteTemplateManifest(input.category);
  if (!manifest) throw new SiteTemplateError(`Ainda não existe um modelo automático para “${input.category}”.`);
  const number = whatsappNumber(input.phone);
  const address = input.address?.trim() || null;
  if (!number || !address) throw new SiteTemplateError("O lead precisa ter telefone válido e endereço antes de criar o site.");

  const template = await loadSiteTemplate(manifest);
  const message = `Olá! Vi o site da ${input.companyName} e gostaria de mais informações.`;
  const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const realPhotos = input.photoUrls.map(validHttpUrl).filter((url): url is string => Boolean(url));
  const heroImage = realPhotos[0] ?? input.stockPhoto?.url ?? null;
  const aboutImage = realPhotos[1] ?? heroImage;
  const instagram = instagramUrl(input.instagram);
  const website = validHttpUrl(input.websiteUrl);
  const maps = validHttpUrl(input.googleMapsUrl);
  const verifiedRating = input.rating !== null && input.reviewCount !== null;
  const primary = brief.colors.primary;
  const accent = brief.colors.accent;
  const safeSummary = `A empresa ${input.companyName} está cadastrada como ${input.category} no endereço informado abaixo. Consulte serviços, horários e disponibilidade diretamente pelo WhatsApp.`;

  const rawTokens: Record<string, string | null> = {
    business_name: input.companyName.trim(), category: input.category.trim(), whatsapp_number: number,
    whatsapp_message: message, whatsapp_url: whatsappUrl, address, headline: genericHeadline(input.category),
    subheadline: safeSummary, about_text: safeSummary, cta_text: brief.ctaPrincipal,
  };
  const missing = manifest.requiredTokens.filter((token) => !rawTokens[token]?.trim());
  if (missing.length) throw new SiteTemplateError(`Complete estes dados antes de criar o site: ${missing.join(", ")}.`);

  const tokens: Record<string, string> = {
    ...Object.fromEntries(Object.entries(rawTokens).map(([name, value]) => [name, escapeHtml(value ?? "")])),
    page_title: escapeHtml(`${input.companyName} | ${input.category}`),
    meta_description: escapeHtml(`Informações, localização e contato de ${input.companyName}, ${input.category}.`),
    phone_display: escapeHtml(input.phone ?? number),
    current_year: String(new Date().getFullYear()),
    whatsapp_number_js: escapeJavaScriptString(number), whatsapp_message_js: escapeJavaScriptString(message),
    business_name_js: escapeJavaScriptString(input.companyName.trim()), category_js: escapeJavaScriptString(input.category.trim()),
    headline_js: escapeJavaScriptString(genericHeadline(input.category)), subheadline_js: escapeJavaScriptString(safeSummary),
    about_text_js: escapeJavaScriptString(safeSummary), address_js: escapeJavaScriptString(address),
    phone_display_js: escapeJavaScriptString(input.phone ?? number), whatsapp_url_js: escapeJavaScriptString(whatsappUrl),
    google_maps_url_js: escapeJavaScriptString(maps ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`),
    hero_image_url_js: escapeJavaScriptString(heroImage ?? ""),
    services_json_js: JSON.stringify(brief.servicosSugeridos).replaceAll("<", "\\u003c"),
    hero_image_url: escapeHtml(heroImage ?? ""), about_image_url: escapeHtml(aboutImage ?? ""),
    stock_credit_html: stockCredit(input), gallery_html: gallery(realPhotos, input.companyName),
    services_html: serviceCards(brief), differentials_html: confirmationCards(brief),
    rating: input.rating?.toFixed(1) ?? "", review_count_text: `${input.reviewCount ?? 0} avaliações`,
    instagram_url: escapeHtml(instagram ?? ""), website_url: escapeHtml(website ?? ""), google_maps_url: escapeHtml(maps ?? ""),
    map_embed_url: escapeHtml(`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`),
    google_fonts_url: escapeHtml(googleFontsUrl(brief)), font_body_css: fontCss(brief.typography.body), font_display_css: fontCss(brief.typography.display),
    color_primary: primary, color_primary_dark: darken(primary, 0.18), color_primary_light: mixWithWhite(primary, 0.88),
    color_accent: accent, color_accent_dark: darken(accent, 0.18), color_accent_light: mixWithWhite(accent, 0.86),
    color_surface: "#ffffff", color_background: mixWithWhite(primary, 0.94), color_text: "#233142", color_text_muted: "#536477",
  };

  const available = { verifiedRating, realPhotos: realPhotos.length > 0, instagram: Boolean(instagram), websiteUrl: Boolean(website), googleMapsUrl: Boolean(maps) };
  let html = template.html;
  for (const [name, rule] of Object.entries(manifest.optionalSections)) {
    if (!available[rule.requires as keyof typeof available]) html = removeSection(html, name);
  }
  if (!heroImage) html = removeSection(removeSection(removeSection(html, "hero_background"), "hero_image"), "about_image");

  const contents = [
    { path: "index.html", content: renderTokens(html, tokens) },
    { path: "style.css", content: renderTokens(template.css, tokens) },
    { path: "script.js", content: renderTokens(template.javascript, tokens) },
  ];
  const files = contents.map(({ path, content }) => {
    if (!validateUploadedSitePath(path)) throw new SiteTemplateError("Template contém caminho inválido.");
    return { path, content: Buffer.from(content), contentType: contentTypeFor(path) };
  });
  if (files.some((file) => file.content.byteLength > 5 * 1024 * 1024)) throw new SiteTemplateError("Template excedeu o limite por arquivo.");
  return { templateId: manifest.id, files };
}
