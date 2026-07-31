import { guard, ok, fail, handle } from "@/lib/api";
import { storeFile } from "@/lib/upload";

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
      return ok(result, { status: 201 });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Upload non riuscito", 422);
    }
  });
}
