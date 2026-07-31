import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTICIPATION_STATUS } from "@/lib/constants";

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

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Ingaggi che organizzi</h1>
          <Link href="/dashboard/eventi/nuovo" className="btn-primary">Pubblica un ingaggio</Link>
        </div>

        {organized.length === 0 ? (
          <p className="mt-4 muted">Non hai ancora pubblicato ingaggi.</p>
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

      <EventRecap title="Le tue candidature attive" rows={upcoming} />
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

function EventRecap({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section>
      <h2 className="text-xl font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm muted">Niente qui per ora.</p>
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
