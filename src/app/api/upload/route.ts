import { guard, ok, fail, handle } from "@/lib/api";
import { storeFile, deleteFile } from "@/lib/upload";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set(["avatar", "cover", "post", "portfolio", "evento", "messaggio"]);
// I nomi coincidono con i preset di compressione in lib/image-client.ts.

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "upload", limit: 20 });
    if (g.error) return g.error;

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "misc");

    if (!(file instanceof File)) return fail("Nessun file ricevuto", 400);
    if (!ALLOWED_FOLDERS.has(folder)) return fail("Cartella di destinazione non valida", 400);

    try {
      const result = await storeFile(file, folder);
      try {
        await prisma.uploadedFile.create({ data: { url: result.url, ownerId: g.user!.id } });
      } catch {
        // Non restituire un URL senza proprietario registrato.
        await deleteFile(result.url);
        return fail("Upload non riuscito, riprova", 503);
      }
      return ok(result, { status: 201 });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      // Solo messaggi di validazione locali; niente errori grezzi dei fornitori.
      if (/^(Tipo di file non consentito:|File troppo grande|File vuoto|Il contenuto del file|Questo file non può essere pubblicato:)/.test(message)) {
        return fail(message, 422);
      }
      return fail("Upload non riuscito, riprova", 503);
    }
  });
}
