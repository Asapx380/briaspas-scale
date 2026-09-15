import { describe, expect, it } from "vitest";
import { sanitizeGeneratedHtml } from "./sanitize-generated-html";

describe("sanitizeGeneratedHtml", () => {
  it("remove scripts, eventos e recursos não fornecidos", () => {
    const allowedPhoto = "https://images.example.com/real.jpg";
    const map = "https://www.google.com/maps?q=Sao%20Pedro&output=embed";
    const html = sanitizeGeneratedHtml(
      `<html lang="pt-BR"><head><style>@import "https://evil.example/font.css";body{background:url("https://evil.example/pixel")}</style></head><body>
        <script>alert(1)</script>
        <a href="https://evil.example" onclick="alert(1)">externo</a>
        <img src="https://evil.example/fake.jpg" alt="falsa">
        <img src="${allowedPhoto}" alt="Empresa real">
        <iframe src="${map}" title="Mapa"></iframe>
      </body></html>`,
      { whatsappUrl: null, mapEmbedUrl: map, photoUrls: [allowedPhoto], externalUrls: [] },
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("fake.jpg");
    expect(html).not.toContain('href="https://evil.example"');
    expect(html).not.toContain("@import");
    expect(html).not.toContain("pixel");
    expect(html).toContain(allowedPhoto);
    expect(html).toContain(map.replaceAll("&", "&amp;"));
  });

  it("aceita URL Pexels somente quando backend a inclui na allowlist", () => {
    const stockPhoto = "https://images.pexels.com/photos/1/pexels-photo.jpeg";
    const photographer = "https://www.pexels.com/@pessoa-teste";
    const page = "https://www.pexels.com/photo/teste-1/";
    const html = sanitizeGeneratedHtml(
      `<img src="${stockPhoto}" alt="Foto representativa"><a href="${photographer}">Foto por Pessoa</a><a href="${page}">Pexels</a><img src="https://images.pexels.com/fora.jpg" alt="fora">`,
      { whatsappUrl: null, mapEmbedUrl: null, photoUrls: [stockPhoto], externalUrls: [photographer, page] },
    );

    expect(html).toContain(stockPhoto);
    expect(html).toContain(`href="${photographer}"`);
    expect(html).toContain(`href="${page}"`);
    expect(html).not.toContain("fora.jpg");
  });
});
