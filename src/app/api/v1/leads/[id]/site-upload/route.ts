import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { InvalidSiteArchiveError, readUploadedSiteZip } from "@/lib/sites/uploaded-site-zip";
import { uploadSiteFilesParallel } from "@/lib/storage/upload-site-files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") return errorResponse("unauthorized", "Entre na sua conta para enviar o site.", 401);

  let formData: FormData;
  try { formData = await request.formData(); } catch { return errorResponse("invalid_form", "Envie um arquivo ZIP válido.", 400); }
  const archive = formData.get("site");
  if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith(".zip")) return errorResponse("invalid_archive", "Selecione um arquivo .zip.", 422);
  if (archive.size === 0 || archive.size > 20 * 1024 * 1024) return errorResponse("invalid_archive", "ZIP deve ter até 20 MB.", 422);

  let files;
  try { files = await readUploadedSiteZip(Buffer.from(await archive.arrayBuffer())); }
  catch (error) {
    const message = error instanceof InvalidSiteArchiveError ? error.message : "Não foi possível validar o ZIP.";
    return errorResponse("invalid_archive", message, 422);
  }

  const { data: lead, error: leadError } = await supabase.from("leads").select("id, slug").eq("id", id).maybeSingle();
  if (leadError) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!lead) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);

  const storagePath = `leads/${lead.id}/site/${randomUUID()}`;
  const { error: uploadError } = await uploadSiteFilesParallel(
    supabase.storage.from("lead-sites"),
    storagePath,
    files,
  );
  if (uploadError) return errorResponse("site_upload_failed", "Não foi possível salvar todos os arquivos do site.", 500);

  const { data: updated, error: updateError } = await supabase.from("leads")
    .update({ site_source: "uploaded", site_storage_path: storagePath, site_status: "ready" })
    .eq("id", id).select("id, slug, site_status, site_source").maybeSingle();
  if (updateError || !updated) return errorResponse("site_upload_failed", "O ZIP foi enviado, mas não foi possível concluir a atualização.", 500);

  revalidateTag("published-sites", "max");
  return Response.json({ data: updated });
}
