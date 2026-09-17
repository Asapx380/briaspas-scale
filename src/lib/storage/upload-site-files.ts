export type UploadableSiteFile = {
  path: string;
  content: Buffer | Uint8Array | Blob | string;
  contentType: string;
};

type StorageBucket = {
  upload: (
    path: string,
    body: UploadableSiteFile["content"],
    options: { contentType: string; upsert: boolean },
  ) => Promise<{ error: { message?: string } | null }>;
};

/**
 * Upload paralelo com limite de concorrência (evita N round-trips sequenciais).
 * Retorna o primeiro erro encontrado; demais uploads em voo continuam até o pool drenar.
 */
export async function uploadSiteFilesParallel(
  bucket: StorageBucket,
  storagePath: string,
  files: UploadableSiteFile[],
  options: { concurrency?: number } = {},
) {
  const concurrency = Math.max(1, options.concurrency ?? 6);
  let nextIndex = 0;
  let firstError: { message?: string } | null = null;

  async function worker() {
    while (nextIndex < files.length) {
      const current = nextIndex;
      nextIndex += 1;
      const file = files[current];
      const { error } = await bucket.upload(`${storagePath}/${file.path}`, file.content, {
        contentType: file.contentType,
        upsert: false,
      });
      if (error && !firstError) firstError = error;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
  await Promise.all(workers);
  return { error: firstError };
}
