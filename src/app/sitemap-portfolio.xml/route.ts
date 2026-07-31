import { prisma } from "@/lib/prisma";
import { renderUrlset, xmlResponse } from "@/lib/sitemap-xml";

export const revalidate = 3600;

export async function GET() {
  const items = await prisma.portfolioItem.findMany({
    where: { isPublic: true, user: { isPublic: true } },
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
