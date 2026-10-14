import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/upload";

/** Ritenta soltanto richieste registrate, mai URL presi da campi modificabili. */
export async function cleanupPendingUploads(ownerId?: string) {
  const pending = await prisma.uploadedFile.findMany({
    where: { deleteRequestedAt: { not: null }, ...(ownerId ? { ownerId } : {}) },
    select: { id: true, url: true },
    orderBy: { deleteRequestedAt: "asc" },
    take: 100,
  });
  let removed = 0;
  for (const file of pending) {
    try {
      await deleteFile(file.url);
      await prisma.uploadedFile.deleteMany({
        where: { id: file.id, deleteRequestedAt: { not: null } },
      });
      removed++;
    } catch {
      // La riga rimane per il prossimo tentativo; niente URL/errori grezzi nei log.
    }
  }
  return { attempted: pending.length, removed, failed: pending.length - removed };
}
