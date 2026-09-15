import { describe, expect, it } from "vitest";
import { readUploadedSiteZip } from "./uploaded-site-zip";
import { createStoredSiteZip } from "./site-zip-writer";

describe("ZIP gerado pelo catálogo", () => {
  it("passa pela mesma validação usada no upload manual", async () => {
    const zip = createStoredSiteZip([
      { path: "index.html", content: Buffer.from("<!doctype html><title>Teste</title>") },
      { path: "style.css", content: Buffer.from("body{color:#123}") },
    ]);
    const files = await readUploadedSiteZip(zip);
    expect(files.map((file) => file.path)).toEqual(["index.html", "style.css"]);
    expect(files[0].content.toString()).toContain("Teste");
  });
});
