import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatoCandidatura } from "@/components/ui/StatoCandidatura";
import { dataBreve } from "@/lib/date";

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
        {daDecidere > 0 && (
          <p className="mt-1 text-fluid-sm text-ink-muted">
            {daDecidere === 1
              ? "Una persona aspetta una risposta."
              : `${daDecidere} persone aspettano una risposta.`}{" "}
            Ogni giorno che passa aspettano senza sapere.
          </p>
        )}

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
              <li
                key={e.id}
                // Le righe con qualcuno in attesa si distinguono dal bordo: in
                // un elenco lungo il conteggio dentro il pulsante si perdeva,
                // ed è l'unica cosa in pagina che chiede un'azione.
                className={`card flex flex-wrap items-center justify-between gap-4 ${
                  e.participations.length > 0 ? "border-esito-attesa-tinta/40" : ""
                }`}
              >
                <div className="min-w-0">
                  <Link
                    href={`/eventi/${e.slug}`}
                    className="text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {e.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-fluid-xs text-ink-muted">
                    <span>{e.city}</span>
                    <span aria-hidden="true" className="text-ink-faint">·</span>
                    <span>{dataBreve(e.startsAt)}</span>
                    <span aria-hidden="true" className="text-ink-faint">·</span>
                    {/* «0 candidature» dice qualcosa che «candidature: 0» non
                        dice: che l'annuncio è vivo e nessuno ha risposto. */}
                    <span>
                      {e._count.participations}{" "}
                      {e._count.participations === 1 ? "candidatura" : "candidature"}
                    </span>
                  </p>
                </div>
                <Link href={`/dashboard/eventi/${e.id}`} className="btn-ghost shrink-0">
                  Gestisci
                  {e.participations.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-esito-attesa-tinta/15 px-2 py-0.5 text-fluid-xs font-bold tabular-nums text-esito-attesa">
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
              <div className="min-w-0">
                <Link
                  href={`/eventi/${p.event.slug}`}
                  className="text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {p.event.title}
                </Link>
                <p className="mt-1 text-fluid-xs text-ink-muted">
                  {p.event.city} · {dataBreve(p.event.startsAt)}
                </p>
              </div>
              <StatoCandidatura stato={p.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
