import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/EventForm";

export const dynamic = "force-dynamic";

export default async function NuovoEventoPage() {
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, latitude: true, longitude: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Pubblica un ingaggio</h1>
      <p className="mt-2 text-sm muted">
        L&apos;annuncio genera una pagina pubblica indicizzabile con dati strutturati Event,
        e compare nella directory della città scelta.
      </p>
      <div className="mt-8">
        <EventForm cities={cities} />
      </div>
    </div>
  );
}
