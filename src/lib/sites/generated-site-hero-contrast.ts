type ContrastIssue = { code: string; message: string };

const AA_TEXT_RATIO = 4.5;
const AA_UI_RATIO = 3;

function colorChannels(value: string) {
  return [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(value: string) {
  return colorChannels(value)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

export function contrastRatio(first: string, second: string) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function toHex(r: number, g: number, b: number) {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
};

export function parseCssColorToHex(value: string): { hex: string; alpha: number } | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === "inherit" || trimmed === "currentcolor") return null;
  if (trimmed === "transparent") return { hex: "#000000", alpha: 0 };

  const named = NAMED_COLORS[trimmed];
  if (named && named !== "transparent") return { hex: named, alpha: 1 };

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return {
        hex: `#${raw
          .split("")
          .map((char) => char + char)
          .join("")}`,
        alpha: 1,
      };
    }
    if (raw.length === 8) {
      return {
        hex: `#${raw.slice(0, 6)}`,
        alpha: Number.parseInt(raw.slice(6, 8), 16) / 255,
      };
    }
    return { hex: `#${raw}`, alpha: 1 };
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (rgb) {
    const alphaRaw = rgb[4];
    const alpha = alphaRaw
      ? alphaRaw.endsWith("%")
        ? Number.parseFloat(alphaRaw) / 100
        : Number.parseFloat(alphaRaw)
      : 1;
    return { hex: toHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3])), alpha };
  }

  const hsl = trimmed.match(
    /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (hsl) {
    const h = Number(hsl[1]) / 360;
    const s = Number(hsl[2]) / 100;
    const l = Number(hsl[3]) / 100;
    const alphaRaw = hsl[4];
    const alpha = alphaRaw
      ? alphaRaw.endsWith("%")
        ? Number.parseFloat(alphaRaw) / 100
        : Number.parseFloat(alphaRaw)
      : 1;
    const hueToRgb = (p: number, q: number, t: number) => {
      let next = t;
      if (next < 0) next += 1;
      if (next > 1) next -= 1;
      if (next < 1 / 6) return p + (q - p) * 6 * next;
      if (next < 1 / 2) return q;
      if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      hex: toHex(hueToRgb(p, q, h + 1 / 3) * 255, hueToRgb(p, q, h) * 255, hueToRgb(p, q, h - 1 / 3) * 255),
      alpha,
    };
  }

  return null;
}

function resolveCssVars(value: string, vars: Record<string, string>, depth = 0): string {
  if (depth > 6) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^)(]+|\([^)]*\))*))?\)/g, (_match, name, fallback) => {
    if (vars[name]) return resolveCssVars(vars[name], vars, depth + 1);
    if (typeof fallback === "string" && fallback.trim()) {
      return resolveCssVars(fallback.trim(), vars, depth + 1);
    }
    return "";
  });
}

type CssRule = { selector: string; declarations: Record<string, string> };

function parseDeclarations(body: string) {
  const declarations: Record<string, string> = {};
  for (const part of body.split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const property = part.slice(0, index).trim().toLowerCase();
    const value = part.slice(index + 1).trim();
    if (property && value) declarations[property] = value;
  }
  return declarations;
}

function parseCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const source = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf("{", cursor);
    if (open < 0) break;
    const selector = source.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    while (close < source.length && depth > 0) {
      if (source[close] === "{") depth += 1;
      else if (source[close] === "}") depth -= 1;
      close += 1;
    }
    const body = source.slice(open + 1, close - 1);
    if (selector.startsWith("@")) {
      rules.push(...parseCssRules(body));
    } else if (selector) {
      rules.push({ selector, declarations: parseDeclarations(body) });
    }
    cursor = close;
  }
  return rules;
}

function extractStyleCss(html: string) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");
}

function extractHeroInnerHtml(html: string) {
  const match = html.match(
    /<section\b[^>]*\bdata-site-section\s*=\s*(["'])hero\1[^>]*>([\s\S]*?)<\/section>/i,
  );
  return match?.[2] ?? null;
}

function collectClassNames(html: string) {
  const names = new Set<string>();
  for (const match of html.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/gi)) {
    for (const name of match[2].split(/\s+/)) {
      if (name) names.add(name);
    }
  }
  return names;
}

function selectorTargetsHero(selector: string, heroClasses: Set<string>) {
  return selector.split(",").some((part) => {
    const piece = part.trim();
    if (/data-site-section\s*=\s*['"]hero['"]/i.test(piece)) return true;
    if (/(#|\.)hero\b/i.test(piece) || /\bhero\b/i.test(piece)) return true;
    for (const className of heroClasses) {
      if (piece.includes(`.${className}`)) return true;
    }
    return false;
  });
}

function selectorLooksLikeCta(selector: string) {
  return selector.split(",").some((part) => {
    const piece = part.trim().toLowerCase();
    return (
      /\ba\b/.test(piece) ||
      /\bbutton\b/.test(piece) ||
      /\.cta\b/.test(piece) ||
      /\.btn\b/.test(piece) ||
      /\.button\b/.test(piece)
    );
  });
}

const COLOR_TOKEN =
  /#(?:[0-9a-f]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)|\b(?:white|black|transparent)\b/gi;

function extractColorsFromValue(value: string, vars: Record<string, string>) {
  const resolved = resolveCssVars(value, vars);
  const colors: Array<{ hex: string; alpha: number }> = [];
  for (const token of resolved.match(COLOR_TOKEN) ?? []) {
    const parsed = parseCssColorToHex(token);
    if (parsed) colors.push(parsed);
  }
  return colors;
}

function compositeOn(hex: string, alpha: number, background: string) {
  if (alpha >= 0.999) return hex;
  const [fr, fg, fb] = colorChannels(hex);
  const [br, bg, bb] = colorChannels(background);
  return toHex(
    (fr * alpha + br * (1 - alpha)) * 255,
    (fg * alpha + bg * (1 - alpha)) * 255,
    (fb * alpha + bb * (1 - alpha)) * 255,
  );
}

function effectiveBackgrounds(colors: Array<{ hex: string; alpha: number }>) {
  const opaque = colors.filter((color) => color.alpha >= 0.6).map((color) => color.hex);
  if (opaque.length > 0) return [...new Set(opaque)];

  const blended = new Set<string>();
  for (const color of colors) {
    blended.add(compositeOn(color.hex, color.alpha, "#ffffff"));
    blended.add(compositeOn(color.hex, color.alpha, "#000000"));
  }
  return [...blended];
}

function pushIfContrastFails(
  issues: ContrastIssue[],
  foregrounds: string[],
  backgrounds: string[],
  minimum: number,
  code: string,
  message: string,
) {
  if (foregrounds.length === 0 || backgrounds.length === 0) return;
  for (const foreground of foregrounds) {
    for (const background of backgrounds) {
      if (contrastRatio(foreground, background) < minimum) {
        issues.push({ code, message });
        return;
      }
    }
  }
}

export function collectHeroContrastIssues(html: string): ContrastIssue[] {
  const heroHtml = extractHeroInnerHtml(html);
  if (!heroHtml) return [];

  const css = extractStyleCss(html);
  if (!css && !/style\s*=/i.test(heroHtml)) return [];

  const rules = parseCssRules(css);
  const vars: Record<string, string> = {};
  for (const rule of rules) {
    if (!/(^|,)\s*(:root|html|body)\s*(,|$)/i.test(rule.selector)) continue;
    for (const [property, value] of Object.entries(rule.declarations)) {
      if (property.startsWith("--")) vars[property] = value;
    }
  }

  const heroOpening = html.match(/<section\b[^>]*\bdata-site-section\s*=\s*(["'])hero\1[^>]*>/i)?.[0] ?? "";
  const heroClasses = collectClassNames(`${heroOpening} ${heroHtml}`);

  const heroBackgrounds: Array<{ hex: string; alpha: number }> = [];
  const heroTextColors: Array<{ hex: string; alpha: number }> = [];
  const ctaTextColors: Array<{ hex: string; alpha: number }> = [];
  const ctaBackgrounds: Array<{ hex: string; alpha: number }> = [];
  let heroHasImage = false;
  let heroHasGradient = false;

  const absorbBackground = (value: string, target: Array<{ hex: string; alpha: number }>) => {
    const resolved = resolveCssVars(value, vars);
    if (/url\s*\(/i.test(resolved)) heroHasImage = true;
    if (/gradient\s*\(/i.test(resolved)) heroHasGradient = true;
    target.push(...extractColorsFromValue(resolved, vars));
  };

  for (const rule of rules) {
    const applies = selectorTargetsHero(rule.selector, heroClasses);
    if (!applies) continue;
    const isCta = selectorLooksLikeCta(rule.selector);
    if (rule.declarations["background"] || rule.declarations["background-image"] || rule.declarations["background-color"]) {
      const background =
        rule.declarations["background"] ??
        rule.declarations["background-image"] ??
        rule.declarations["background-color"];
      absorbBackground(background, isCta ? ctaBackgrounds : heroBackgrounds);
      if (rule.declarations["background-color"] && rule.declarations["background-color"] !== background) {
        absorbBackground(rule.declarations["background-color"], isCta ? ctaBackgrounds : heroBackgrounds);
      }
    }
    if (rule.declarations.color) {
      const colors = extractColorsFromValue(rule.declarations.color, vars);
      if (isCta) ctaTextColors.push(...colors);
      else heroTextColors.push(...colors);
    }
  }

  for (const match of heroHtml.matchAll(/\bstyle\s*=\s*(["'])([^"']*)\1/gi)) {
    const declarations = parseDeclarations(match[2].replace(/;/g, ";"));
    if (declarations.color) heroTextColors.push(...extractColorsFromValue(declarations.color, vars));
    if (declarations.background || declarations["background-color"] || declarations["background-image"]) {
      absorbBackground(
        declarations.background ?? declarations["background-image"] ?? declarations["background-color"],
        /<a\b|<button\b/i.test(match.input?.slice(Math.max(0, match.index - 80), match.index) ?? "")
          ? ctaBackgrounds
          : heroBackgrounds,
      );
    }
  }

  if (heroBackgrounds.length === 0) {
    for (const rule of rules) {
      if (!/(^|,)\s*(:root|html|body)\s*(,|$)/i.test(rule.selector)) continue;
      const background =
        rule.declarations.background ??
        rule.declarations["background-color"] ??
        rule.declarations["background-image"];
      if (background) absorbBackground(background, heroBackgrounds);
    }
  }

  const issues: ContrastIssue[] = [];
  const textHex = heroTextColors.filter((color) => color.alpha >= 0.6).map((color) => color.hex);
  const ctaTextHex = (ctaTextColors.length > 0 ? ctaTextColors : heroTextColors)
    .filter((color) => color.alpha >= 0.6)
    .map((color) => color.hex);
  const bgHex = effectiveBackgrounds(heroBackgrounds);
  const ctaBgHex = effectiveBackgrounds(ctaBackgrounds);

  if (heroHasImage && !heroHasGradient && heroBackgrounds.every((color) => color.alpha < 0.6)) {
    issues.push({
      code: "hero.contrast_overlay",
      message:
        "O hero usa imagem de fundo sem camada sólida o bastante para garantir contraste AA do texto e do CTA.",
    });
  }

  pushIfContrastFails(
    issues,
    textHex,
    bgHex,
    AA_TEXT_RATIO,
    "hero.contrast_text",
    "O texto do hero não atinge contraste AA (4,5:1) contra todos os tons do fundo ou do gradiente.",
  );

  const ctaAgainst = ctaBgHex.length > 0 ? ctaBgHex : bgHex;
  pushIfContrastFails(
    issues,
    ctaTextHex,
    ctaAgainst,
    AA_TEXT_RATIO,
    "hero.contrast_cta",
    "O CTA do hero não atinge contraste AA (4,5:1) contra o próprio fundo e contra o fundo/gradiente do hero.",
  );

  if (ctaBgHex.length > 0 && bgHex.length > 0) {
    pushIfContrastFails(
      issues,
      ctaBgHex,
      bgHex,
      AA_UI_RATIO,
      "hero.contrast_cta",
      "O CTA do hero não atinge contraste AA (4,5:1) contra o próprio fundo e contra o fundo/gradiente do hero.",
    );
  }

  return issues;
}
