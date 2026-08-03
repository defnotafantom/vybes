import { prisma } from "@/lib/prisma";
import { portfolioSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { deleteFile } from "@/lib/upload";
import { slugDi } from "@/lib/utente";

async function owned(id: string, userId: string) {
  const item = await prisma.portfolioItem.findUnique({
    where: { id },
    select: { id: true, userId: true, mediaUrl: true },
  });
  if (!item) return { item: null, error: fail("Elemento non trovato", 404) };
  if (item.userId !== userId) return { item: null, error: fail("Non sei l'autore di questo elemento", 403) };
  return { item, error: null };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "portfolio-write", limit: 40 });
    if (g.error) return g.error;
    const { id } = await params;

    const check = await owned(id, g.user!.id);
    if (check.error) return check.error;

    const { data, error } = await parseBody(req, portfolioSchema.partial());
    if (error) return error;

    const updated = await prisma.portfolioItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl } : {}),
        ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
        ...(data.externalUrl !== undefined ? { externalUrl: data.externalUrl || null } : {}),
        ...(data.year !== undefined ? { year: data.year ?? null } : {}),
      },
    });

    revalidatePath(`/portfolio/${updated.slug}`);
    revalidatePath(`/artisti/${await slugDi(g.user!.id)}`);
    return ok(updated);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "portfolio-write", limit: 40 });
    if (g.error) return g.error;
    const { id } = await params;

    const check = await owned(id, g.user!.id);
    if (check.error) return check.error;

    await prisma.portfolioItem.delete({ where: { id } });
    // Il record e' andato: si libera anche lo storage.
    if (check.item?.mediaUrl) await deleteFile(check.item.mediaUrl);

    revalidatePath(`/artisti/${await slugDi(g.user!.id)}`);
    return ok({ deleted: true });
  });
}
