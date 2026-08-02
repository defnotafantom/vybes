import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParticipationRow } from "@/components/ParticipationRow";
import { DeleteEventButton } from "@/components/DeleteEventButton";
import { PaginaHeader } from "@/components/dashboard/PaginaHeader";
import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

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
      <PaginaHeader
        ritornoA="/dashboard/eventi"
        ritornoLabel="Tutti i tuoi ingaggi"
        titolo={event.title}
        sottotitolo={`${event.city} · ${event.startsAt.toLocaleString("it-IT")} · ${
          event.isPaid ? `${event.feeMin ?? 0} ${event.currency}` : "Non retribuito"
        }`}
        azioni={
          <>
            <Link href={`/eventi/${event.slug}`} className="btn-ghost" target="_blank">
              Pagina pubblica
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link href={`/dashboard/eventi/${event.id}/modifica`} className="btn-ghost">
              Modifica
            </Link>
            <DeleteEventButton
              eventId={event.id}
              activeParticipations={
                event.participations.filter(
                  (p) => p.status === "PENDING" || p.status === "ACCEPTED"
                ).length
              }
            />
          </>
        }
      />

      {event.status === "CANCELLED" && (
        <p role="status" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          Questo ingaggio è annullato. La pagina pubblica resta visibile ma è esclusa dai motori di ricerca.
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-fluid-lg font-bold">
          Da valutare {pending.length > 0 && <span className="text-brand-600">({pending.length})</span>}
        </h2>
        {pending.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Nessuna candidatura in attesa"
              body="Le nuove candidature compaiono qui. Se l'annuncio è online da giorni senza risposte, quasi sempre manca il compenso in chiaro o la data è troppo vicina."
              ctaLabel="Vedi come appare l'annuncio"
              ctaHref={`/eventi/${event.slug}`}
            />
          </div>
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
          <h2 className="text-fluid-lg font-bold">Confermati ({accepted.length})</h2>
          <ul className="mt-4 space-y-3">
            {accepted.map((p) => (
              <ParticipationRow key={p.id} participation={{ ...p, createdAt: p.createdAt.toISOString() }} actionable={false} />
            ))}
          </ul>
        </section>
      )}

      {rejected.length > 0 && (
        <section className="mt-10">
          <h2 className="text-fluid-lg font-bold">Non selezionati ({rejected.length})</h2>
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
