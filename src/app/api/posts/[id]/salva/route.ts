import { prisma } from "@/lib/prisma";
import { guard, ok, fail, handle } from "@/lib/api";

/** Toggle del salvataggio di un post nei preferiti dell'utente. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "save", limit: 90 });
    if (g.error) return g.error;
    const { id } = await params;

    const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
    if (!post) return fail("Post non trovato", 404);

    const existing = await prisma.savedPost.findUnique({
      where: { postId_userId: { postId: id, userId: g.user!.id } },
    });

    if (existing) {
      await prisma.savedPost.delete({ where: { id: existing.id } });
      return ok({ saved: false });
    }

    await prisma.savedPost.create({ data: { postId: id, userId: g.user!.id } });
    return ok({ saved: true });
  });
}
