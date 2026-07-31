import { prisma } from "@/lib/prisma";
import { commentSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { grantXp } from "@/lib/gamification";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "comments-read", limit: 120 });
    if (g.error) return g.error;
    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { postId: id },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { author: { select: { slug: true, name: true, image: true } } },
    });
    return ok(comments);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "comments-write", limit: 30 });
    if (g.error) return g.error;
    const { id } = await params;

    const { data, error } = await parseBody(req, commentSchema);
    if (error) return error;

    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) return fail("Post non trovato", 404);

    const comment = await prisma.comment.create({
      data: { postId: id, authorId: g.user!.id, content: data.content },
      include: { author: { select: { slug: true, name: true, image: true } } },
    });

    await grantXp(g.user!.id, 3);
    await notify({
      recipientId: post.authorId,
      actorId: g.user!.id,
      type: "COMMENT",
      body: `${g.user!.name} ha commentato il tuo post`,
      entityId: id,
      entityUrl: "/dashboard",
    });

    return ok(comment, { status: 201 });
  });
}
