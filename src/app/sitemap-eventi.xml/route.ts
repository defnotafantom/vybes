import { SITEMAP_MAX_URL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { renderUrlset, xmlResponse } from "@/lib/sitemap-xml";

export const revalidate = 1800;

export async function GET() {
  const events = await prisma.event.findMany({
    where: { isPublic: true, status: { in: ["PUBLISHED", "COMPLETED"] } },
    select: { slug: true, updatedAt: true, startsAt: true },
    orderBy: { startsAt: "desc" },
    take: SITEMAP_MAX_URL,
  });

  const now = Date.now();
  return xmlResponse(
    renderUrlset(
      events.map((e) => {
        const isFuture = e.startsAt.getTime() > now;
        return {
          loc: `/eventi/${e.slug}`,
          lastmod: e.updatedAt,
          // Gli eventi passati cambiano di rado: meno crawl budget sprecato.
          changefreq: isFuture ? ("daily" as const) : ("monthly" as const),
          priority: isFuture ? 0.8 : 0.3,
        };
      })
    )
  );
}
