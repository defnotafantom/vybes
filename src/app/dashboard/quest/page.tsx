import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelProgress } from "@/lib/levels";

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
      <h1 className="text-2xl font-bold">Quest</h1>
      <p className="mt-2 muted">
        {done} di {quests.length} completate · livello {progress.level} ({progress.current}/{progress.needed} XP)
      </p>

      <ul className="mt-8 space-y-3">
        {quests.map((q) => {
          const p = q.progress[0];
          const current = p?.current ?? 0;
          const completed = Boolean(p?.completedAt);
          const percent = Math.min(100, Math.round((current / q.target) * 100));

          return (
            <li key={q.id} className={`card ${completed ? "border-brand-400" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    {completed && <span aria-hidden="true">✓ </span>}
                    {q.title}
                  </h2>
                  <p className="mt-1 text-sm muted">{q.description}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-brand-600">+{q.xpReward} XP</span>
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
