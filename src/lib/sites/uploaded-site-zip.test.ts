import { describe, expect, it } from "vitest";
import { contentTypeFor, readUploadedSiteZip, validateUploadedSitePath } from "./uploaded-site-zip";

describe("ZIP de site enviado", () => {
  it("recusa caminhos que escapam da pasta do site", () => {
    expect(validateUploadedSitePath("../../outro-lead/index.html")).toBeNull();
    expect(validateUploadedSitePath("/etc/passwd")).toBeNull();
    expect(validateUploadedSitePath("assets\\..\\index.html")).toBeNull();
  });

  it("aceita somente extensões publicáveis previstas", () => {
    expect(validateUploadedSitePath("assets/app.css")).toBe("assets/app.css");
    expect(validateUploadedSitePath("server.mjs")).toBeNull();
    expect(contentTypeFor("assets/app.css")).toBe("text/css; charset=utf-8");
  });

  it("recusa conteúdo que não é ZIP", async () => {
    await expect(readUploadedSiteZip(Buffer.from("not-a-zip"))).rejects.toThrow("Não foi possível ler o arquivo ZIP.");
  });
});
