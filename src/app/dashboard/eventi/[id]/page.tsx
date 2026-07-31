import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParticipationRow } from "@/components/ParticipationRow";
import { DeleteEventButton } from "@/components/DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participations: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { slug: true, name: true, image: true, headline: true, city: true, level: true, reputation: true },
          },
        },
      },
    },
  });

  if (!event) notFound();
  if (event.organizerId !== session!.user.id) notFound();

  const pending = event.participations.filter((p) => p.status === "PENDING");
  const accepted = event.participations.filter((p) => p.status === "ACCEPTED");
  const rejected = event.participations.filter((p) => p.status === "REJECTED");

  return (
    <div>
      <Link href="/dashboard/eventi" className="text-sm text-brand-600 hover:underline">
        ← Tutti i tuoi ingaggi
      </Link>

      <h1 className="mt-4 text-2xl font-bold">{event.title}</h1>
      <p className="mt-2 muted">
        {event.city} · {event.startsAt.toLocaleString("it-IT")} ·{" "}
        {event.isPaid ? `${event.feeMin ?? 0} ${event.currency}` : "Non retribuito"}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/eventi/${event.slug}`} className="btn-ghost">
          Vedi la pagina pubblica
        </Link>
        <Link href={`/dashboard/eventi/${event.id}/modifica`} className="btn-ghost">
          Modifica
        </Link>
        <DeleteEventButton
          eventId={event.id}
          activeParticipations={
            event.participations.filter((p) => p.status === "PENDING" || p.status === "ACCEPTED").length
          }
        />
      </div>

      {event.status === "CANCELLED" && (
        <p role="status" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Questo ingaggio è annullato. La pagina pubblica resta visibile ma è esclusa dai motori di ricerca.
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold">
          Da valutare {pending.length > 0 && <span className="text-brand-600">({pending.length})</span>}
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm muted">Nessuna candidatura in attesa.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((p) => (
              <ParticipationRow key={p.id} participation={{ ...p, createdAt: p.createdAt.toISOString() }} actionable />
            ))}
          </ul>
        )}
      </section>

      {accepted.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Confermati ({accepted.length})</h2>
          <ul className="mt-4 space-y-3">
            {accepted.map((p) => (
              <ParticipationRow key={p.id} participation={{ ...p, createdAt: p.createdAt.toISOString() }} actionable={false} />
            ))}
          </ul>
        </section>
      )}

      {rejected.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Non selezionati ({rejected.length})</h2>
          <ul className="mt-4 space-y-3">
            {rejected.map((p) => (
              <ParticipationRow key={p.id} participation={{ ...p, createdAt: p.createdAt.toISOString() }} actionable={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
