import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortfolioManager } from "@/components/PortfolioManager";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "Portfolio" };

export default async function DashboardPortfolioPage() {
  const session = await auth();
  const items = await prisma.portfolioItem.findMany({
    where: { userId: session!.user.id },
    orderBy: { position: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <SezioneHeader
        titolo="Portfolio"
        sottotitolo={
          <>
            Ogni lavoro diventa una pagina pubblica indicizzata: chi cerca trova
            prima il lavoro della persona — «cover jazz Bologna», non un nome —
            e da lì arriva al tuo profilo. È la porta d&apos;ingresso più probabile.
          </>
        }
        numeri={[
          { label: ["Lavoro caricato", "Lavori caricati"], valore: items.length },
          { label: ["Pubblico", "Pubblici"], valore: items.filter((i) => i.isPublic).length },
        ]}
      />
      <div>
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
