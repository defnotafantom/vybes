import { prisma } from "@/lib/prisma";
import { renderUrlset, xmlResponse } from "@/lib/sitemap-xml";
import { PROFILO_PUBBLICO } from "@/lib/visibilita";

export const revalidate = 3600;

export async function GET() {
  const items = await prisma.portfolioItem.findMany({
    where: { isPublic: true, user: PROFILO_PUBBLICO },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45000,
  });

  return xmlResponse(
    renderUrlset(
      items.map((p) => ({
        loc: `/portfolio/${p.slug}`,
        lastmod: p.updatedAt,
        changefreq: "monthly" as const,
        priority: 0.5,
      }))
    )
  );
}
