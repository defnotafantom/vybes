import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guard, ok, fail, handle } from "@/lib/api";
import { notify } from "@/lib/notifications";
import { grantXp } from "@/lib/gamification";
import { revalidatePath } from "next/cache";

/**
 * Stato della relazione. Serve al bottone sul profilo pubblico, che è una
 * pagina statica: lo stato dipende dall'utente e va chiesto dal client,
 * altrimenti la pagina diventerebbe dinamica per tutti.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const { slug } = await params;
    const session = await auth();

    const target = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!target) return fail("Utente non trovato", 404);

    if (!session?.user?.id) {
      return ok({ authenticated: false, isSelf: false, following: false });
    }
    if (session.user.id === target.id) {
      return ok({ authenticated: true, isSelf: true, following: false });
    }

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: target.id } },
      select: { id: true },
    });

    return ok({ authenticated: true, isSelf: false, following: Boolean(follow) });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handle(async () => {
    const g = await guard(req, { scope: "follow", limit: 60 });
    if (g.error) return g.error;
    const { slug } = await params;

    const target = await prisma.user.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!target) return fail("Utente non trovato", 404);
    if (target.id === g.user!.id) return fail("Non puoi seguire te stesso", 400);

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: g.user!.id, followingId: target.id } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      revalidatePath(`/artisti/${slug}`);
      return ok({ following: false });
    }

    await prisma.follow.create({ data: { followerId: g.user!.id, followingId: target.id } });
    await grantXp(target.id, 3, 1);
    await notify({
      recipientId: target.id,
      actorId: g.user!.id,
      type: "FOLLOW",
      body: `${g.user!.name} ha iniziato a seguirti`,
      entityUrl: `/artisti/${g.user!.slug}`,
    });

    revalidatePath(`/artisti/${slug}`);
    return ok({ following: true });
  });
}
