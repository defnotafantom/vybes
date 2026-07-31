import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortfolioManager } from "@/components/PortfolioManager";

export const dynamic = "force-dynamic";

export default async function DashboardPortfolioPage() {
  const session = await auth();
  const items = await prisma.portfolioItem.findMany({
    where: { userId: session!.user.id },
    orderBy: { position: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Il tuo portfolio</h1>
      <p className="mt-2 text-sm muted">
        Ogni elemento diventa una pagina pubblica indicizzabile su <code>/portfolio/…</code>.
      </p>
      <div className="mt-8">
        <PortfolioManager
          initialItems={items.map((i) => ({
            id: i.id,
            slug: i.slug,
            title: i.title,
            description: i.description,
            mediaUrl: i.mediaUrl,
            mediaType: i.mediaType,
            year: i.year,
          }))}
        />
      </div>
    </div>
  );
}
