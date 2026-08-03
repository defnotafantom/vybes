import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";
import { PaginaHeader } from "@/components/dashboard/PaginaHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pubblica un ingaggio" };

export default async function NuovoEventoPage() {
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, latitude: true, longitude: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PaginaHeader
        ritornoA="/dashboard/eventi"
        ritornoLabel="Tutti i tuoi ingaggi"
        titolo="Pubblica un ingaggio"
        sottotitolo="L'annuncio diventa una pagina pubblica indicizzata e compare nella directory della città scelta. Compila il compenso anche quando è basso: gli annunci che non lo dichiarano ricevono molte meno candidature."
      />
      <div>
        <EventForm cities={cities} />
      </div>
    </div>
  );
}
