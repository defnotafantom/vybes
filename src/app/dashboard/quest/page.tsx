import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/levels";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuestPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [quests, me] = await Promise.all([
    prisma.quest.findMany({
      orderBy: { xpReward: "asc" },
      include: { progress: { where: { userId } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { experience: true } }),
  ]);

  const progress = levelProgress(me?.experience ?? 0);
  const done = quests.filter((q) => q.progress[0]?.completedAt).length;

  return (
    <div className="mx-auto max-w-3xl">
      <SezioneHeader
        titolo="Quest"
        sottotitolo="Obiettivi che portano a completare il profilo. Non sono un gioco fine a sé stesso: ognuno corrisponde a qualcosa che rende il profilo più facile da trovare."
        numeri={[
          { label: "Completate", valore: `${done} su ${quests.length}` },
          { label: "Livello", valore: progress.level },
          { label: "Al livello successivo", valore: `${progress.current}/${progress.needed} XP` },
        ]}
      />

      {/* Il livello prima delle quest: è la cosa che le quest servono a far
          salire, e metterlo dopo l'elenco lo trasformava in una nota a piè di
          pagina. */}
      <div className="card mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Livello</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-fluid-3xl font-bold tabular-nums">{progress.level}</span>
              <span className="text-fluid-sm text-ink-muted">
                {progress.current}/{progress.needed} XP al {progress.level + 1}
              </span>
            </p>
          </div>
          <p className="max-w-sm text-fluid-xs text-ink-muted">
            Il livello è un progresso tuo e resta qui: non decide la tua
            posizione nella directory. Quella la determina la reputazione, che
            si calcola da altro.
          </p>
        </div>

        <div
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso verso il livello ${progress.level + 1}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-[width] duration-700 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {quests.map((q) => {
          const p = q.progress[0];
          const current = p?.current ?? 0;
          const completed = Boolean(p?.completedAt);
          const percent = Math.min(100, Math.round((current / q.target) * 100));

          return (
            <li
              key={q.id}
              className={`card transition-opacity ${
                // Le completate restano visibili ma arretrano: servono a
                // mostrare la strada fatta, non a competere per l'attenzione
                // con quelle ancora da fare.
                completed ? "border-brand-400/40 opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completed
                        ? "bg-brand-500 text-white"
                        : "border border-line-strong text-ink-faint"
                    }`}
                  >
                    {completed ? <Check className="h-3.5 w-3.5" /> : current}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-fluid-sm font-semibold">{q.title}</h2>
                    <p className="mt-1 text-fluid-sm text-ink-muted">{q.description}</p>
                  </div>
                </div>
                <span className="shrink-0 text-fluid-xs font-bold tabular-nums text-brand-700 dark:text-brand-300">
                  +{q.xpReward} XP
                </span>
              </div>

              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso quest ${q.title}`}
              >
                <div className={`h-full ${completed ? "bg-green-500" : "bg-brand-600"}`} style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs muted">{current}/{q.target}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
