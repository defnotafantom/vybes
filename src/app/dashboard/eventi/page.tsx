import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTICIPATION_STATUS } from "@/lib/constants";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function DashboardEventiPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const [organized, myApplications] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: userId },
      orderBy: { startsAt: "desc" },
      include: {
        _count: { select: { participations: true } },
        participations: { where: { status: "PENDING" }, select: { id: true } },
      },
    }),
    prisma.participation.findMany({
      where: { userId },
      orderBy: { event: { startsAt: "desc" } },
      include: { event: { select: { slug: true, title: true, startsAt: true, city: true, status: true } } },
    }),
  ]);

  // Recap richiesto: in corso / futuri / conclusi / archivio.
  const upcoming = myApplications.filter((p) => p.event.startsAt >= now && p.status !== "REJECTED");
  const completed = myApplications.filter((p) => p.event.startsAt < now && p.status === "ACCEPTED");
  const archived = myApplications.filter(
    (p) => p.event.startsAt < now && p.status !== "ACCEPTED"
  );

  // Le candidature che aspettano una risposta sono l'unico numero che fa agire:
  // ogni giorno che passa un artista aspetta senza sapere.
  const daDecidere = organized.reduce((n, e) => n + e.participations.length, 0);

  return (
    <div className="space-y-14">
      <SezioneHeader
        titolo="Ingaggi"
        sottotitolo="Quelli che hai pubblicato e quelli a cui ti sei candidato. Un annuncio con data, luogo e compenso in chiaro riceve risposte pertinenti; senza compenso ne riceve poche."
        numeri={[
          { label: "Pubblicati", valore: organized.length },
          { label: "Candidature da decidere", valore: daDecidere },
          { label: "Tue candidature attive", valore: upcoming.length },
        ]}
        azione={
          <Link href="/dashboard/eventi/nuovo" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Pubblica un ingaggio
          </Link>
        }
      />

      <section>
        <h2 className="text-fluid-lg font-bold">Ingaggi che organizzi</h2>

        {organized.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Non hai ancora pubblicato niente"
              body="Pubblica quello che cerchi e lascia che siano gli artisti a candidarsi: è più veloce che cercarli uno per uno."
              ctaLabel="Pubblica il primo ingaggio"
              ctaHref="/dashboard/eventi/nuovo"
            />
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {organized.map((e) => (
              <li key={e.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Link href={`/eventi/${e.slug}`} className="font-medium hover:text-brand-600">{e.title}</Link>
                  <p className="text-sm muted">
                    {e.city} · {e.startsAt.toLocaleDateString("it-IT")} · {e._count.participations} candidature
                  </p>
                </div>
                <Link href={`/dashboard/eventi/${e.id}`} className="btn-ghost">
                  Gestisci
                  {e.participations.length > 0 && (
                    <span className="ml-1 rounded-full bg-brand-600 px-2 text-xs text-white">
                      {e.participations.length}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Solo la prima mostra qualcosa quando è vuota: è l'unica in cui il
          vuoto ha un rimedio. «Nessun ingaggio concluso» non si risolve
          cliccando da nessuna parte. */}
      <EventRecap
        title="Le tue candidature attive"
        rows={upcoming}
        vuoto={
          <EmptyState
            title="Nessuna candidatura in corso"
            body="Gli ingaggi aperti si trovano nella directory pubblica: filtra per città e disciplina e candidati direttamente."
            ctaLabel="Vedi gli ingaggi aperti"
            ctaHref="/eventi"
          />
        }
      />
      <EventRecap title="Ingaggi conclusi" rows={completed} />
      <EventRecap title="Archivio" rows={archived} />
    </div>
  );
}

type Row = {
  id: string;
  status: string;
  event: { slug: string; title: string; startsAt: Date; city: string };
};

/**
 * I tre riepiloghi delle proprie candidature.
 *
 * Quando sono vuoti spariscono del tutto invece di mostrare «niente qui per
 * ora» tre volte di fila. Tre sezioni vuote una sotto l'altra fanno sembrare
 * l'area personale rotta, e non aggiungono niente: l'assenza si vede già.
 */
function EventRecap({ title, rows, vuoto }: { title: string; rows: Row[]; vuoto?: ReactNode }) {
  if (rows.length === 0 && !vuoto) return null;

  return (
    <section>
      <h2 className="text-fluid-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <div className="mt-5">{vuoto}</div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <Link href={`/eventi/${p.event.slug}`} className="font-medium hover:text-brand-600">
                  {p.event.title}
                </Link>
                <p className="text-sm muted">
                  {p.event.city} · {p.event.startsAt.toLocaleDateString("it-IT")}
                </p>
              </div>
              <span className="rounded bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-white/5 dark:text-brand-300">
                {PARTICIPATION_STATUS[p.status as keyof typeof PARTICIPATION_STATUS] ?? p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
