import sanitizeHtml from "sanitize-html";

export type GeneratedSiteAllowlist = {
  whatsappUrl: string | null;
  mapEmbedUrl: string | null;
  photoUrls: string[];
  externalUrls: string[];
};

const allowedTags = [
  "html", "head", "body", "title", "meta", "link", "style",
  "header", "nav", "main", "section", "article", "aside", "footer",
  "div", "span", "p", "h1", "h2", "h3", "h4", "ul", "ol", "li",
  "strong", "em", "small", "br", "hr", "a", "img", "figure", "figcaption",
  "address", "blockquote", "svg", "path", "circle", "rect", "line", "polyline",
  "iframe",
];

export function sanitizeGeneratedHtml(value: string, allowlist: GeneratedSiteAllowlist) {
  const allowedExternalUrls = new Set(
    [allowlist.whatsappUrl, ...allowlist.externalUrls].filter((url): url is string => Boolean(url)),
  );
  const allowedPhotoUrls = new Set(allowlist.photoUrls);

  const clean = sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      html: ["lang"],
      meta: ["charset", "name", "content"],
      link: ["rel", "href", "crossorigin"],
      a: ["href", "target", "rel", "class", "aria-label"],
      img: ["src", "alt", "width", "height", "loading", "decoding", "class"],
      iframe: ["src", "title", "width", "height", "loading", "referrerpolicy", "allowfullscreen", "class"],
      svg: ["viewBox", "width", "height", "fill", "stroke", "aria-hidden", "class"],
      path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
      circle: ["cx", "cy", "r", "fill", "stroke"],
      rect: ["x", "y", "width", "height", "rx", "fill", "stroke"],
      line: ["x1", "x2", "y1", "y2", "stroke"],
      polyline: ["points", "fill", "stroke"],
      "*": ["id", "class", "role", "aria-*"],
    },
    allowedSchemes: ["http", "https"],
    allowProtocolRelative: false,
    allowVulnerableTags: true,
    transformTags: {
      a: (_tagName, attributes) => {
        const href = attributes.href;
        if (!href || href.startsWith("#") || allowedExternalUrls.has(href)) {
          return { tagName: "a", attribs: attributes };
        }
        const safeAttributes = { ...attributes };
        delete safeAttributes.href;
        delete safeAttributes.target;
        delete safeAttributes.rel;
        return { tagName: "span", attribs: safeAttributes };
      },
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") return !allowedPhotoUrls.has(frame.attribs.src ?? "");
      if (frame.tag === "iframe") return frame.attribs.src !== allowlist.mapEmbedUrl;
      if (frame.tag === "link") {
        try {
          return new URL(frame.attribs.href ?? "").hostname !== "fonts.googleapis.com";
        } catch {
          return true;
        }
      }
      return false;
    },
  });

  const safeCss = clean.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
    const withoutImports = css.replace(/@import\s+[^;]+;?/gi, "");
    const filteredUrls = withoutImports.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_urlMatch, _quote: string, rawUrl: string) => {
      const url = rawUrl.trim().replaceAll("&amp;", "&");
      return allowedPhotoUrls.has(url) ? `url("${url}")` : "none";
    });
    return `<style>${filteredUrls}</style>`;
  });
  return `<!doctype html>${safeCss.replace(/^\s*<!doctype html>/i, "")}`;
}
