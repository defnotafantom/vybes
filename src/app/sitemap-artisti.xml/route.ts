import { prisma } from "@/lib/prisma";
import { renderUrlset, xmlResponse } from "@/lib/sitemap-xml";

export const revalidate = 3600;

export async function GET() {
  const artists = await prisma.user.findMany({
    where: { isPublic: true, emailVerified: { not: null } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 45000,
  });

  return xmlResponse(
    renderUrlset(
      artists.map((a) => ({
        loc: `/artisti/${a.slug}`,
        lastmod: a.updatedAt,
        changefreq: "weekly" as const,
        priority: 0.7,
      }))
    )
  );
}
