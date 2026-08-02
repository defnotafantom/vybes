import { prisma } from "@/lib/prisma";
import { guard, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { grantXp } from "@/lib/gamification";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "like", limit: 90 });
    if (g.error) return g.error;
    const { id } = await params;

    const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
    if (!post) return fail("Post non trovato", 404);

    const existing = await prisma.like.findUnique({
      where: { postId_userId: { postId: id, userId: g.user!.id } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      return ok({ liked: false });
    }

    await prisma.like.create({ data: { postId: id, userId: g.user!.id } });
    await grantXp(post.authorId, 2);
    await notify({
      recipientId: post.authorId,
      actorId: g.user!.id,
      type: "LIKE",
      body: `A ${g.user!.name} piace il tuo post`,
      entityId: id,
      entityUrl: "/dashboard",
    });

    return ok({ liked: true });
  });
}
