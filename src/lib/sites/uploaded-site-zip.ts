import path from "node:path";
import yauzl from "yauzl";

const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 250;
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".woff", ".woff2", ".ico", ".json"]);

export type UploadedSiteFile = { path: string; content: Buffer; contentType: string };

export class InvalidSiteArchiveError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidSiteArchiveError"; }
}

export function contentTypeFor(pathname: string) {
  const extension = path.posix.extname(pathname).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon",
  } as Record<string, string>)[extension] ?? "application/octet-stream";
}

export function validateUploadedSitePath(value: string) {
  const normalized = value.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0") || normalized.split("/").some((part) => !part || part === "." || part === "..")) return null;
  if (!ALLOWED_EXTENSIONS.has(path.posix.extname(normalized).toLowerCase())) return null;
  return normalized;
}

function readEntry(zip: yauzl.ZipFile, entry: yauzl.Entry) {
  return new Promise<Buffer>((resolve, reject) => {
    zip.openReadStream(entry, (streamError, stream) => {
      if (streamError || !stream) return reject(streamError ?? new Error("Arquivo ZIP inválido."));
      const chunks: Buffer[] = [];
      let total = 0;
      stream.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_UNCOMPRESSED_BYTES) stream.destroy(new Error("Arquivo descompactado excede limite."));
        else chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  });
}

export function readUploadedSiteZip(buffer: Buffer): Promise<UploadedSiteFile[]> {
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_ZIP_BYTES) {
    return Promise.reject(new InvalidSiteArchiveError("ZIP deve ter até 20 MB."));
  }

  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(new InvalidSiteArchiveError("Não foi possível ler o arquivo ZIP."));
      const files: UploadedSiteFile[] = [];
      const seen = new Set<string>();
      let fileCount = 0;
      let uncompressedBytes = 0;
      let failed = false;
      const fail = (error: Error) => { if (!failed) { failed = true; zip.close(); reject(error); } };

      zip.on("error", () => fail(new InvalidSiteArchiveError("Arquivo ZIP inválido.")));
      zip.on("entry", async (entry: yauzl.Entry) => {
        if (failed) return;
        if (/\/$/.test(entry.fileName)) return zip.readEntry();
        const filePath = validateUploadedSitePath(entry.fileName);
        if (!filePath || seen.has(filePath)) return fail(new InvalidSiteArchiveError("ZIP contém caminho ou extensão não permitidos."));
        if (++fileCount > MAX_FILES) return fail(new InvalidSiteArchiveError("ZIP excede limite de arquivos."));
        uncompressedBytes += entry.uncompressedSize;
        if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES || uncompressedBytes > buffer.byteLength * 10) return fail(new InvalidSiteArchiveError("ZIP possui taxa de compressão insegura."));
        seen.add(filePath);
        try {
          const content = await readEntry(zip, entry);
          if (content.byteLength !== entry.uncompressedSize) return fail(new InvalidSiteArchiveError("Arquivo ZIP inválido."));
          files.push({ path: filePath, content, contentType: contentTypeFor(filePath) });
          zip.readEntry();
        } catch {
          fail(new InvalidSiteArchiveError("Não foi possível extrair arquivo do ZIP."));
        }
      });
      zip.on("end", () => {
        if (failed) return;
        if (!seen.has("index.html")) return fail(new InvalidSiteArchiveError("ZIP precisa conter index.html na raiz."));
        resolve(files);
      });
      zip.readEntry();
    });
  });
}
