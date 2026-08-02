import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Feed } from "@/components/Feed";
import { levelProgress } from "@/lib/levels";
import { missingForIndex } from "@/lib/profile-quality";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [me, openQuests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, experience: true, reputation: true, slug: true, isPublic: true, role: true,
        bio: true, disciplines: true,
        _count: {
          select: {
            followers: true,
            posts: true,
            portfolioItems: { where: { isPublic: true } },
          },
        },
      },
    }),
    prisma.quest.findMany({
      take: 3,
      include: { progress: { where: { userId }, select: { current: true, completedAt: true } } },
    }),
  ]);

  const progress = levelProgress(me?.experience ?? 0);
  const pending = openQuests.filter((q) => !q.progress[0]?.completedAt);

  // Un profilo sotto la soglia non compare sui motori di ricerca. La regola
  // è nel codice, ma chi la subisce deve poterla vedere e soprattutto sapere
  // come uscirne: un filtro silenzioso che penalizza senza spiegare è la
  // versione peggiore di una regola giusta.
  const gaps = me
    ? missingForIndex({
        bio: me.bio,
        disciplines: me.disciplines,
        portfolioCount: me._count.portfolioItems,
      })
    : [];

  const cercaArtisti = me?.role === "RECRUITER";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold">Ciao {me?.name}</h1>

        {/* Chi si iscrive per cercare artisti atterrava su un feed sociale con
            livelli, esperienza e quest: tutto pensato per chi si fa trovare,
            niente per chi cerca. Il primo passo di un organizzatore è uno solo,
            e va detto invece di lasciarlo dedurre dalla colonna laterale. */}
        {cercaArtisti && (
          <div className="card mb-8 border-brand-400/40">
            <p className="text-fluid-base font-semibold">Da dove si comincia</p>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              Pubblica quello che cerchi e lascia che siano gli artisti a
              candidarsi. Con data, luogo e compenso in chiaro l&apos;annuncio
              riceve risposte pertinenti; senza compenso ne riceve poche.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard/eventi/nuovo" className="btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Pubblica un ingaggio
              </Link>
              <Link href="/artisti" className="btn-ghost">
                Sfoglia gli artisti
              </Link>
            </div>
          </div>
        )}

        <Feed />
      </div>

      <aside className="space-y-6">
        {/* La soglia di indicizzazione riguarda chi vuole essere trovato. A un
            organizzatore che pubblica annunci non serve comparire su Google
            come profilo, e segnalarglielo sarebbe un allarme senza rimedio
            utile. */}
        {!cercaArtisti && me?.isPublic && gaps.length > 0 && (
          <div className="card border-gold-500/40 bg-gold-500/[0.06]">
            <h2 className="flex items-center gap-2 font-semibold">
              <Search className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Non compari su Google
            </h2>
            <p className="mt-2 text-fluid-sm text-ink-muted">
              Il profilo è pubblico, ma troppo scarno perché i motori di ricerca
              lo mostrino. Chi ti cerca per nome ti trova; chi cerca la tua
              disciplina no.
            </p>
            <ul className="mt-3 space-y-2 text-fluid-sm">
              {gaps.map((g) => (
                <li key={g} className="flex gap-2">
                  <span aria-hidden="true" className="text-gold-400">
                    →
                  </span>
                  {g}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/profilo" className="btn-ghost mt-4 inline-flex">
              Completa il profilo
            </Link>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold">Livello {progress.level}</h2>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso verso il livello successivo"
          >
            <div className="h-full bg-brand-600" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-2 text-sm muted">
            {progress.current}/{progress.needed} XP al livello {progress.level + 1}
          </p>
          <dl className="mt-4 flex gap-6 text-sm">
            <div><dt className="muted">Reputazione</dt><dd className="font-bold">{me?.reputation}</dd></div>
            <div><dt className="muted">Follower</dt><dd className="font-bold">{me?._count.followers}</dd></div>
          </dl>
        </div>

        {pending.length > 0 && (
          <div className="card">
            <h2 className="font-semibold">Quest in corso</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {pending.map((q) => (
                <li key={q.id}>
                  <p className="font-medium">{q.title}</p>
                  <p className="muted">{q.description}</p>
                  <p className="text-xs text-brand-600">
                    {q.progress[0]?.current ?? 0}/{q.target} · +{q.xpReward} XP
                  </p>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/quest" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
              Tutte le quest
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
