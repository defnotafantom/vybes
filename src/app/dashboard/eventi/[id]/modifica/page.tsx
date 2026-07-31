import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EventForm, type EventFormValues } from "@/components/EventForm";

export const dynamic = "force-dynamic";

/** Converte una Date nel formato accettato da <input type="datetime-local">. */
function toLocalInput(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function ModificaEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [event, cities] = await Promise.all([
    prisma.event.findUnique({ where: { id } }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, latitude: true, longitude: true },
    }),
  ]);

  if (!event || event.organizerId !== session!.user.id) notFound();

  const initial: EventFormValues = {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    venueName: event.venueName ?? "",
    address: event.address ?? "",
    citySlug: event.citySlug,
    latitude: event.latitude,
    longitude: event.longitude,
    isPaid: event.isPaid,
    feeMin: event.feeMin,
    feeMax: event.feeMax,
    capacity: event.capacity,
    coverImage: event.coverImage ?? "",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/dashboard/eventi/${event.id}`} className="text-sm text-brand-600 hover:underline">
        ← Torna alla gestione
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Modifica ingaggio</h1>
      <div className="mt-8">
        <EventForm cities={cities} initial={initial} />
      </div>
    </div>
  );
}
