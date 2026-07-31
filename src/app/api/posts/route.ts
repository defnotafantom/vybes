import { prisma } from "@/lib/prisma";
import { postSchema } from "@/lib/validations";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { toSlug, toCsv } from "@/lib/slug";
import { progressQuest, grantXp } from "@/lib/gamification";
import { notify } from "@/lib/notifications";

/** Feed paginato con cursore: stabile anche mentre arrivano nuovi post. */
export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "posts-read", limit: 120 });
    if (g.error) return g.error;

    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const tag = url.searchParams.get("tag");
    const take = Math.min(30, Number(url.searchParams.get("take") ?? 15));

    const posts = await prisma.post.findMany({
      where: {
        isPublic: true,
        ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { slug: true, name: true, image: true, level: true, isVerified: true } },
        tags: { include: { tag: { select: { slug: true, label: true } } } },
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId: g.user!.id }, select: { id: true } },
        saves: { where: { userId: g.user!.id }, select: { id: true } },
      },
    });

    const hasMore = posts.length > take;
    const page = hasMore ? posts.slice(0, take) : posts;

    return ok({
      posts: page.map((p) => ({
        ...p,
        likedByMe: p.likes.length > 0,
        savedByMe: p.saves.length > 0,
        likes: undefined,
        saves: undefined,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "posts-write", limit: 15 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, postSchema);
    if (error) return error;

    // I tag vengono normalizzati e riusati, non duplicati per ogni post.
    const tagRecords = await Promise.all(
      data.tags.map((label) => {
        const slug = toSlug(label);
        return prisma.tag.upsert({ where: { slug }, create: { slug, label }, update: {} });
      })
    );

    const post = await prisma.post.create({
      data: {
        authorId: g.user!.id,
        content: data.content,
        type: data.type,
        mediaUrl: data.mediaUrl || null,
        mediaType: data.mediaType ?? null,
        collaborationArtists: toCsv(data.collaborationArtists),
        tags: { create: tagRecords.map((t) => ({ tagId: t.id })) },
      },
      include: { author: { select: { slug: true, name: true, image: true } } },
    });

    await grantXp(g.user!.id, 10);
    await progressQuest(g.user!.id, "first_post");
    if (data.type === "COLLABORATION") await progressQuest(g.user!.id, "collaboration");

    // Invito esplicito ai collaboratori taggati.
    for (const artistId of data.collaborationArtists) {
      await notify({
        recipientId: artistId,
        actorId: g.user!.id,
        type: "COLLAB_INVITE",
        body: `${g.user!.name} ti ha invitato a collaborare`,
        entityId: post.id,
        entityUrl: "/dashboard",
      });
    }

    return ok(post, { status: 201 });
  });
}
