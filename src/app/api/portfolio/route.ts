import { prisma } from "@/lib/prisma";
import { portfolioSchema } from "@/lib/validations";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { progressQuest, grantXp, syncProfileQuest } from "@/lib/gamification";
import { revalidatePath } from "next/cache";
import { ricalcolaReputazione } from "@/lib/reputazione-server";
import { slugDi } from "@/lib/utente";

export async function GET(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "portfolio-read", limit: 120 });
    if (g.error) return g.error;

    const items = await prisma.portfolioItem.findMany({
      where: { userId: g.user!.id },
      orderBy: { position: "asc" },
    });
    return ok(items);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "portfolio-write", limit: 20 });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, portfolioSchema);
    if (error) return error;

    const slug = await uniqueSlug(`${data.title}-${g.user!.name}`, async (s) =>
      Boolean(await prisma.portfolioItem.findUnique({ where: { slug: s } }))
    );

    const last = await prisma.portfolioItem.findFirst({
      where: { userId: g.user!.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const item = await prisma.portfolioItem.create({
      data: {
        userId: g.user!.id,
        slug,
        title: data.title,
        description: data.description || null,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        externalUrl: data.externalUrl || null,
        year: data.year ?? null,
        position: (last?.position ?? -1) + 1,
      },
    });

    await grantXp(g.user!.id, 15);
    await ricalcolaReputazione(g.user!.id);
    await progressQuest(g.user!.id, "first_portfolio");
    await syncProfileQuest(g.user!.id);

    revalidatePath(`/artisti/${await slugDi(g.user!.id)}`);
    return ok(item, { status: 201 });
  });
}
