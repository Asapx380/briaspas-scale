import { describe, expect, it } from "vitest";
import { collectHeroContrastIssues, contrastRatio, parseCssColorToHex } from "./generated-site-hero-contrast";

function wrapHero(style: string, extra = "") {
  return `<!doctype html><html lang="pt-BR"><head><style>${style}</style></head>
    <body><main><section data-site-section="hero">
      <h1>Título</h1><p>Texto</p><a href="https://wa.me/5511999999999">WhatsApp</a>${extra}
    </section></main></body></html>`;
}

describe("generated-site-hero-contrast", () => {
  it("calcula contraste e cores CSS", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeGreaterThan(20);
    expect(parseCssColorToHex("#0f3d3e")?.hex).toBe("#0f3d3e");
    expect(parseCssColorToHex("rgb(255, 255, 255)")?.hex).toBe("#ffffff");
  });

  it("aceita hero com texto e CTA acima de AA em fundo sólido", () => {
    const html = wrapHero(`
      [data-site-section="hero"] { background: #0f3d3e; color: #f4fbfb; }
      [data-site-section="hero"] a { background: #f4fbfb; color: #0f3d3e; }
    `);
    expect(collectHeroContrastIssues(html)).toEqual([]);
  });

  it("rejeita texto claro em gradiente claro", () => {
    const html = wrapHero(`
      [data-site-section="hero"] { background: linear-gradient(#ffffff, #f3f3f3); color: #f7f7f7; }
      [data-site-section="hero"] a { background: #f7f7f7; color: #ffffff; }
    `);
    const codes = collectHeroContrastIssues(html).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining(["hero.contrast_text"]));
  });

  it("rejeita foto de fundo sem overlay suficiente", () => {
    const html = wrapHero(`
      [data-site-section="hero"] {
        background: url("https://images.example.com/foto.jpg");
        color: #ffffff;
      }
    `);
    expect(collectHeroContrastIssues(html).some((issue) => issue.code === "hero.contrast_overlay")).toBe(true);
  });

  it("aceita gradiente escuro com texto claro", () => {
    const html = wrapHero(`
      [data-site-section="hero"] { background: linear-gradient(#0a1628, #12344a); color: #f4fbfb; }
      [data-site-section="hero"] a { background: #f4fbfb; color: #0a1628; }
    `);
    expect(collectHeroContrastIssues(html)).toEqual([]);
  });
});
