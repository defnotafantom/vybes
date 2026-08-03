import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Feed } from "@/components/Feed";
import { levelProgress } from "@/lib/levels";
import { missingForIndex } from "@/lib/profile-quality";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { SchedaReputazione } from "@/components/dashboard/SchedaReputazione";
import { dettaglioReputazioneDi } from "@/lib/reputazione-server";
import { reputazioneMassima } from "@/lib/reputazione";

export const dynamic = "force-dynamic";

export const metadata = { title: "Feed" };

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
  // Le stesse voci con cui il punteggio è stato calcolato: mostrarne una
  // versione riscritta a mano vorrebbe dire mantenerle allineate in due posti.
  const voci = await dettaglioReputazioneDi(userId);
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
        <SezioneHeader
          titolo={`Ciao ${me?.name ?? ""}`}
          sottotitolo={
            cercaArtisti
              ? "Da qui pubblichi gli annunci e segui le candidature che arrivano."
              : "Il feed di chi segui. Le cose che ti riguardano — candidature, messaggi, decisioni — arrivano dalla campanella in alto."
          }
        />

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

        {/* Livello e reputazione stavano nella stessa scheda, uno sopra
            l'altro, con la stessa grafica: era impossibile capire che uno è un
            progresso privato e l'altro il segnale che decide dove compari.
            Separarli in due schede è la spiegazione più economica possibile. */}
        <div className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-fluid-sm font-semibold">Livello {progress.level}</h2>
            <span className="text-fluid-xs tabular-nums text-ink-faint">
              {progress.current}/{progress.needed} XP
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso verso il livello successivo"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-3 text-fluid-xs text-ink-muted">
            Sale con quello che fai qui dentro. Resta tuo: non decide come ti
            vedono gli altri.
          </p>
          <dl className="mt-4 border-t pt-3 text-fluid-xs">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Follower</dt>
              <dd className="font-bold tabular-nums">{me?._count.followers}</dd>
            </div>
          </dl>
        </div>

        <SchedaReputazione
          voci={voci}
          totale={me?.reputation ?? 0}
          massimo={reputazioneMassima()}
        />

        {pending.length > 0 && (
          <div className="card">
            <h2 className="text-fluid-sm font-semibold">Quest in corso</h2>
            <ul className="mt-3 space-y-4">
              {pending.map((q) => {
                const fatto = q.progress[0]?.current ?? 0;
                const perc = Math.min(100, Math.round((fatto / q.target) * 100));
                return (
                  <li key={q.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-fluid-sm font-medium">{q.title}</p>
                      <span className="shrink-0 text-fluid-xs font-bold tabular-nums text-brand-700 dark:text-brand-300">
                        +{q.xpReward}
                      </span>
                    </div>
                    <p className="mt-1 text-fluid-xs text-ink-muted">{q.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${perc}%` }} />
                      </div>
                      <span className="text-fluid-xs tabular-nums text-ink-faint">
                        {fatto}/{q.target}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link href="/dashboard/quest" className="btn-ghost mt-5 inline-flex">
              Tutte le quest
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
