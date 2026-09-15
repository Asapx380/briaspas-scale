import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_ROOT = "/home/asap/Documentos/Projetos/Freelance/15-PROJETOSPARAFREELLANCERS/landing-pages";
const TARGET_ROOT = path.join(process.cwd(), "src/lib/sites/templates");

const templates = [
  { slug: "academia", name: "Academia energia", categories: ["academia", "personal trainer", "crossfit", "pilates"], style: ["energético", "esportivo", "moderno"], aliases: ["Elite Fitness"] },
  { slug: "advocacia", name: "Advocacia institucional", categories: ["advocacia", "advogado", "escritório de advocacia", "direito"], style: ["sóbrio", "institucional", "confiável"], aliases: ["Oliveira & Associados Advogados", "Oliveira & Associados"] },
  { slug: "clinica-estetica", name: "Clínica estética elegante", categories: ["clínica estética", "estética", "harmonização facial", "spa"], style: ["elegante", "leve", "sofisticado"], aliases: ["Belezza Estética"] },
  { slug: "clinica-medica", name: "Clínica médica acolhedora", categories: ["clínica médica", "consultório médico", "médico", "nutricionista", "nutrição"], style: ["acolhedor", "claro", "profissional"], aliases: ["Dra. Camila Nutri", "Camila Nutri"] },
  { slug: "coach-consultor", name: "Consultoria autoral", categories: ["coach", "consultor", "consultoria", "mentoria"], style: ["autoral", "executivo", "direto"], aliases: ["Marcos Ribeiro"] },
  { slug: "consultorio-odontologico", name: "Consultório odontológico", categories: ["consultório odontológico", "clínica odontológica", "odontologia", "dentista"], style: ["limpo", "calmo", "profissional"], aliases: ["Sorriso Perfeito", "Clínica Sorriso Perfeito", "Odonto Sorriso"] },
  { slug: "contabilidade", name: "Contabilidade corporativa", categories: ["contabilidade", "contador", "escritório contábil", "assessoria contábil"], style: ["corporativo", "claro", "confiável"], aliases: ["ContaPro", "Conta Pro"] },
  { slug: "escola-idiomas", name: "Escola de idiomas", categories: ["escola de idiomas", "curso de idiomas", "inglês", "idiomas"], style: ["jovem", "educacional", "vibrante"], aliases: ["Global Languages"] },
  { slug: "imobiliaria", name: "Imobiliária premium", categories: ["imobiliária", "corretor de imóveis", "imóveis", "imobiliário"], style: ["premium", "editorial", "confiável"], aliases: ["Prime Imóveis", "PrimeImóveis"] },
  { slug: "infoprodutor", name: "Infoprodutor conversão", categories: ["infoprodutor", "curso online", "produtor digital", "mentor digital"], style: ["digital", "direto", "conversão"], aliases: ["Lucas Ferreira"] },
  { slug: "loja-roupa", name: "Loja de roupas editorial", categories: ["loja de roupas", "moda", "boutique", "vestuário"], style: ["editorial", "elegante", "comercial"], aliases: ["Bella Moda", "BellaModa"] },
  { slug: "oficina-mecanica", name: "Oficina mecânica robusta", categories: ["oficina mecânica", "auto center", "mecânica automotiva", "oficina automotiva"], style: ["robusto", "técnico", "direto"], aliases: ["Auto Center Premium", "AutoCenter Premium"] },
  { slug: "restaurante", name: "Restaurante apetitoso", categories: ["restaurante", "pizzaria", "lanchonete", "alimentção"], style: ["acolhedor", "apetitoso", "vibrante"], aliases: ["Sabor da Vila"] },
  { slug: "salao-beleza", name: "Salão de beleza sofisticado", categories: ["salão de beleza", "cabeleireiro", "barbearia", "manicure"], style: ["sofisticado", "editorial", "acolhedor"], aliases: ["Studio Hair & Beauty", "Studio Hair"] },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeUnverifiedSections(html) {
  const risky = /(?:depoiment|testimonial|resultado|results?|destaques?|highlights?|casos?|cases?|pr[eê]mios?|conquistas?|n[uú]meros?|stats?|faq|perguntas?|galeria|gallery|portfolio|benef[ií]cios?|benefits?|diferenciais?|features?|vantagens?|advantages?|pre[cç]os?|pricing|planos?)/i;
  const sectionPattern = /<section\b[^>]*>[\s\S]*?<\/section>/gi;
  const removedIds = [];
  const cleaned = html.replace(sectionPattern, (section) => {
    const opening = section.match(/^<section\b[^>]*>/i)?.[0] ?? "";
    if (!risky.test(opening)) return section;
    const id = opening.match(/\bid=["']([^"']+)["']/i)?.[1];
    if (id) removedIds.push(id);
    return "";
  });
  return removedIds.reduce((source, id) => source.replace(new RegExp(`<a\\b[^>]*href=["']#${escapeRegExp(id)}["'][^>]*>[\\s\\S]*?<\\/a>`, "gi"), ""), cleaned);
}

function replaceFirstInSection(html, sectionNeedle, tag, replacement) {
  const pattern = new RegExp(`(<section\\b[^>]*(?:id|class)=["'][^"']*${sectionNeedle}[^"']*["'][^>]*>[\\s\\S]*?<${tag}\\b[^>]*>)[\\s\\S]*?(<\\/${tag}>)`, "i");
  return html.replace(pattern, `$1${replacement}$2`);
}

function injectBeforeSectionEnd(html, sectionNeedle, content) {
  const pattern = new RegExp(`(<section\\b[^>]*(?:id|class)=["'][^"']*${sectionNeedle}[^"']*["'][^>]*>[\\s\\S]*?)(<\\/section>)`, "i");
  return html.replace(pattern, `$1${content}$2`);
}

function tokenizeHtml(source, template) {
  let html = removeUnverifiedSections(source);
  html = html.replace(/<!--(?:(?!-->)[\s\S])*(?:depoiment|testimonial)(?:(?!-->)[\s\S])*?-->/gi, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>{{page_title}}</title>");
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '<meta name="description" content="{{meta_description}}">');
  html = html.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "Atendimento pelo WhatsApp");
  for (const alias of template.aliases) html = html.replace(new RegExp(escapeRegExp(alias), "gi"), "{{business_name}}");
  html = html.replace(/https:\/\/wa\.me\/\d+(?:\?[^"'\s<]*)?/gi, "{{whatsapp_url}}");
  html = html.replace(/href=["']tel:[^"']+["']/gi, 'href="tel:{{whatsapp_number}}"');
  html = html.replace(/(?<![\d-])(?:\(\d{2}\)\s*|\d{2}\s+)\d{4,5}[\s-]\d{4}(?![\d-])/g, "{{phone_display}}");
  html = html.replace(/https?:\/\/(?:www\.)?google\.[^"'\s<]*\/maps[^"'\s<]*/gi, "{{google_maps_url}}");
  html = html.replace(/<script\b[^>]+src=["'][^"']*(?:gptmaker|widget)[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<iframe\b[^>]+(?:gptmaker|widget)[^>]*>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i, "<h1$1>{{headline}}</h1>");
  html = replaceFirstInSection(html, "(?:hero|inicio|home)", "p", "{{subheadline}}");
  html = replaceFirstInSection(html, "(?:sobre|about)", "p", "{{about_text}}");
  html = html.replace(/(<section\b[^>]*(?:id|class)=["'][^"']*(?:hero|inicio|home)[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*\bsrc=["'])[^"']*(["'])/i, "$1{{hero_image_url}}$2");
  html = html.replace(/(background-image\s*:\s*url\(["']?)[^)"']+(["']?\))/i, "$1{{hero_image_url}}$2");
  html = injectBeforeSectionEnd(html, "(?:hero|inicio|home)", '<div class="briaspas-stock-credit">{{stock_credit_html}}</div>');
  if (!html.includes("{{whatsapp_url}}")) {
    html = injectBeforeSectionEnd(html, "(?:hero|inicio|home)", '<a class="btn btn-primary briaspas-whatsapp" href="{{whatsapp_url}}" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>');
  }
  html = html.replace(/<\/body>/i, '<script src="script.js"></script>\n</body>');
  html = html.replace(/(<script\s+src=["']script\.js["']><\/script>\s*){2,}/gi, '<script src="script.js"></script>\n');
  html = html.replace(/<head>/i, `<head>\n    <meta name="briaspas-template" content="${template.slug}-01">`);
  return html;
}

function tokenizeJavaScript(source, template) {
  let javascript = source;
  javascript = javascript.replace(/(WHATSAPP_NUMBER\s*=\s*)["'][^"']*["']/g, "$1'{{whatsapp_number_js}}'");
  javascript = javascript.replace(/(whatsappNumber\s*:\s*)["'][^"']*["']/g, "$1'{{whatsapp_number_js}}'");
  javascript = javascript.replace(/(defaultMessage\s*=\s*encodeURIComponent\s*\()["'][\s\S]*?["']\s*\)/g, "$1'{{whatsapp_message_js}}')");
  javascript = javascript.replace(/(?:https:\/\/)?wa\.me\/[\d.]+(?:\?[^"'\s]*)?/gi, "{{whatsapp_url_js}}");
  javascript = javascript.replace(/https?:\/\/(?:www\.)?google\.[^"'\s]*\/maps[^"'\s]*/gi, "{{google_maps_url_js}}");

  const aliases = JSON.stringify(template.aliases);
  javascript += `\n\n/* Briaspas Scale: adapta dados verificados sem alterar os arquivos originais. */\n(function () {\n  const data = {\n    name: "{{business_name_js}}", category: "{{category_js}}", headline: "{{headline_js}}",\n    summary: "{{subheadline_js}}", about: "{{about_text_js}}", address: "{{address_js}}",\n    phone: "{{phone_display_js}}", whatsapp: "{{whatsapp_url_js}}", maps: "{{google_maps_url_js}}",\n    heroImage: "{{hero_image_url_js}}", aliases: ${aliases}\n  };\n  function applyVerifiedData() {\n    document.title = data.name + " | " + data.category;\n    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);\n    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);\n    nodes.forEach(function (node) {\n      let value = node.nodeValue || "";\n      data.aliases.forEach(function (alias) { value = value.replace(new RegExp(alias.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, "\\\\$&"), "gi"), data.name); });\n      value = value.replace(/\\(?\\d{2}\\)?\\s*\\d{4,5}[\\s-]?\\d{4}/g, data.phone);\n      node.nodeValue = value;\n    });\n    const h1 = document.querySelector("h1"); if (h1) h1.textContent = data.headline;\n    document.querySelectorAll('a[href*="wa.me"], a[href^="tel:"]').forEach(function (link) { link.href = data.whatsapp; link.target = "_blank"; link.rel = "noopener noreferrer"; });\n    document.querySelectorAll("form").forEach(function (form) { form.addEventListener("submit", function (event) { event.preventDefault(); window.open(data.whatsapp, "_blank", "noopener"); }, true); });\n    document.querySelectorAll('[class*="address"], [class*="endereco"], [class*="endereço"]').forEach(function (element) {\n      const text = element.textContent || ""; if (/Rua|Avenida|Av\\.|Endereço|Localização/i.test(text) && element.children.length < 2) element.textContent = data.address;\n    });\n    const hero = document.querySelector('[class*="hero"], #inicio, #home');\n    if (hero && data.heroImage) {\n      const image = hero.querySelector("img"); if (image) { image.src = data.heroImage; image.alt = data.name + " - imagem representativa de " + data.category; }\n      const background = hero.querySelector('[style*="background-image"]'); if (background) background.style.backgroundImage = 'url("' + data.heroImage + '")';\n    }\n    const services = document.querySelector('#servicos, #services, [class~="servicos"], [class~="services"]');\n    if (services && !services.querySelector(".briaspas-service-note")) { const note = document.createElement("p"); note.className = "briaspas-service-note"; note.textContent = "Serviços apresentados como possibilidades. Confirme disponibilidade diretamente pelo WhatsApp."; services.insertBefore(note, services.children[1] || null); }\n    document.querySelectorAll('[class*="mapa-placeholder"], [class*="map-placeholder"], [class*="mapa__"]').forEach(function (map) { map.addEventListener("click", function (event) { event.preventDefault(); event.stopImmediatePropagation(); window.open(data.maps, "_blank", "noopener"); }, true); });\n  }\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyVerifiedData); else applyVerifiedData();\n})();\n`;
  javascript += `\n(function () {\n  function fixContactDetails() {\n    document.querySelectorAll("h3,h4,strong").forEach(function (label) {\n      const text = (label.textContent || "").trim();\n      const box = label.closest('[class*="detail"], [class*="item"], [class*="card"], li, div');\n      if (!box) return;\n      if (/endereço|localização/i.test(text)) { const value = box.querySelector("p,span"); if (value && value !== label) value.textContent = "{{address_js}}"; }\n      if (/horário/i.test(text)) box.remove();\n    });\n  }\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fixContactDetails); else fixContactDetails();\n})();\n`;
  javascript += `\n(function () {\n  function removeUnverifiedClaims() {\n    document.querySelectorAll('[class*="stat"], [class*="numero"], [class*="number"], [class*="badge"], [class*="counter"]').forEach(function (element) { element.remove(); });\n    const about = document.querySelector('#sobre, #about, [class~="sobre"], [class~="about"]');\n    if (about) { const paragraphs = Array.from(about.querySelectorAll("p")); paragraphs.forEach(function (paragraph, index) { if (index === 0) paragraph.textContent = "{{about_text_js}}"; else paragraph.remove(); }); }\n    const contact = document.querySelector('#contato, #contact, [class~="contato"], [class~="contact"]');\n    if (contact) { const intro = contact.querySelector("p"); if (intro) intro.textContent = "Use os dados verificados abaixo e confirme disponibilidade diretamente pelo WhatsApp."; }\n    const footerDescription = document.querySelector('[class*="footer"][class*="description"], .footer-description');\n    if (footerDescription) footerDescription.textContent = "Informações e contato de {{business_name_js}} em um só lugar.";\n    document.querySelectorAll("img").forEach(function (image) { if (/images\\.unsplash\\.com/.test(image.src) && "{{hero_image_url_js}}") { image.src = "{{hero_image_url_js}}"; image.alt = "Imagem representativa de {{category_js}}"; } });\n    document.querySelectorAll("body *").forEach(function (element) {\n      if (element.children.length) return;\n      if (/desconto|gr[aá]tis|gratuita|promo[cç][aã]o|casos resolvidos|taxa de sucesso|anos de experiência|clientes satisfeitos/i.test(element.textContent || "")) element.textContent = "Consulte condições pelo WhatsApp";\n    });\n  }\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", removeUnverifiedClaims); else removeUnverifiedClaims();\n})();\n`;
  javascript += `\n(function () {\n  function hardenTemplateContent() {\n    const services = document.querySelector('#servicos, #services, [class~="servicos"], [class~="services"]');\n    const items = {{services_json_js}};\n    if (services) {\n      const cards = Array.from(services.querySelectorAll('.servico-card,.service-card,.servico__card,.service__card'));\n      cards.forEach(function (card, index) {\n        const item = items[index];\n        if (!item) { card.remove(); return; }\n        const title = card.querySelector('h3,h4,[class*="title"]');\n        const description = card.querySelector('p,[class*="description"]');\n        if (title) title.textContent = item.nome;\n        if (description) description.textContent = item.microbeneficio;\n        card.querySelectorAll('ul,[class*="price"],[class*="preco"],[class*="preço"]').forEach(function (element) { element.remove(); });\n        Array.from(card.querySelectorAll('*')).forEach(function (element) {\n          if (!element.children.length && /R\\$|a partir de|incluso no plano|garantid[oa]|\\d+\\s*(?:aulas?|dias?|meses?|anos?)/i.test(element.textContent || "")) element.remove();\n        });\n      });\n    }\n    const about = document.querySelector('#sobre, #about, [class~="sobre"], [class~="about"]');\n    if (about) about.querySelectorAll('[class*="feature"],[class*="diferencial"],[class*="credential"],[class*="certific"],[class*="qualification"],[class*="stat"]').forEach(function (element) { element.remove(); });\n    document.querySelectorAll('body *').forEach(function (element) {\n      if (element.children.length) return;\n      if (/CRO-|CRN-|CREF:|desde\\s+\\d{4}|há mais de \\d+ anos/i.test(element.textContent || "")) element.textContent = "";\n    });\n  }\n  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hardenTemplateContent); else hardenTemplateContent();\n})();\n`;
  const earlyRuntime = `/* Briaspas Scale: executa antes do JavaScript legado. */\n(function () {\n  document.addEventListener("DOMContentLoaded", function () {\n    const items = {{services_json_js}};\n    document.querySelectorAll('[class*="stat"],[class*="numero"],[class*="number"],[class*="badge"],[class*="counter"]').forEach(function (element) { element.remove(); });\n    const about = document.querySelector('#sobre,#about,[class~="sobre"],[class~="about"]');\n    if (about) {\n      const paragraphs = Array.from(about.querySelectorAll("p"));\n      paragraphs.forEach(function (paragraph, index) { if (index === 0) paragraph.textContent = "{{about_text_js}}"; else paragraph.remove(); });\n      about.querySelectorAll('ul,[class*="feature"],[class*="diferencial"],[class*="credential"],[class*="certific"],[class*="qualification"]').forEach(function (element) { element.remove(); });\n    }\n    const services = document.querySelector('#servicos,#services,[class~="servicos"],[class~="services"]');\n    if (services) {\n      const cards = Array.from(services.querySelectorAll('.servico-card,.service-card,.servico__card,.service__card'));\n      cards.forEach(function (card, index) {\n        const item = items[index]; if (!item) { card.remove(); return; }\n        const title = card.querySelector('h3,h4,[class*="title"]'); const description = card.querySelector('p,[class*="description"]');\n        if (title) title.textContent = item.nome; if (description) description.textContent = item.microbeneficio;\n        card.querySelectorAll('ul,[class*="price"],[class*="preco"],[class*="preço"]').forEach(function (element) { element.remove(); });\n        Array.from(card.querySelectorAll('*')).forEach(function (element) { if (!element.children.length && /R\\$|a partir de|incluso no plano|garantid[oa]/i.test(element.textContent || "")) element.remove(); });\n      });\n    }\n    document.querySelectorAll("h3,h4,strong").forEach(function (label) {\n      const text = label.textContent || ""; const box = label.closest('[class*="detail"],[class*="item"],[class*="card"],li,div'); if (!box) return;\n      if (/endereco|endereço|localização/i.test(text)) { const values = Array.from(box.querySelectorAll("p")); if (values[0]) values[0].textContent = "{{address_js}}"; values.slice(1).forEach(function (value) { value.remove(); }); }\n      if (/horário|funcionamento/i.test(text)) box.remove();\n    });\n    document.querySelectorAll("img").forEach(function (image) { if (/images\\.unsplash\\.com/.test(image.src) && "{{hero_image_url_js}}") { image.src = "{{hero_image_url_js}}"; image.alt = "Imagem representativa de {{category_js}}"; } });\n  });\n})();`;
  return `${earlyRuntime}\n${javascript}`;
}

for (const template of templates) {
  const sourceDirectory = path.join(SOURCE_ROOT, template.slug);
  const targetDirectory = path.join(TARGET_ROOT, `${template.slug}-01`);
  await mkdir(targetDirectory, { recursive: true });
  const [html, javascript] = await Promise.all([
    readFile(path.join(sourceDirectory, "index.html"), "utf8"),
    readFile(path.join(sourceDirectory, "script.js"), "utf8"),
  ]);
  await Promise.all([
    writeFile(path.join(targetDirectory, "index.html"), tokenizeHtml(html, template)),
    writeFile(path.join(targetDirectory, "script.js"), tokenizeJavaScript(javascript, template)),
    readFile(path.join(sourceDirectory, "style.css"), "utf8").then((css) => writeFile(path.join(targetDirectory, "style.css"), `${css}\n\n/* Briaspas Scale: elementos inseridos pelo adaptador. */\n.briaspas-stock-credit,.briaspas-service-note{font-size:.78rem;line-height:1.5;text-align:center;margin:1rem auto;max-width:70ch}.briaspas-stock-credit a{color:inherit;text-decoration:underline}.briaspas-service-note{padding:.75rem 1rem;border:1px solid currentColor;border-radius:.75rem;opacity:.82}\n`)),
    writeFile(path.join(targetDirectory, "template.json"), `${JSON.stringify({
      id: `${template.slug}-01`, version: 1, name: template.name, categories: template.categories, style: template.style,
      requiredTokens: ["business_name", "category", "whatsapp_number", "whatsapp_message", "address", "headline", "subheadline", "about_text"],
      optionalSections: {}, imageSlots: [{ token: "hero_image_url", fallback: "pexels" }],
      tokenizationFamily: /WHATSAPP_NUMBER|whatsappNumber/.test(javascript) ? "centralized" : "inline-links",
    }, null, 2)}\n`),
  ]);
}

console.log(`Tokenizados ${templates.length} templates; petshop-01 preservado como piloto manual.`);
