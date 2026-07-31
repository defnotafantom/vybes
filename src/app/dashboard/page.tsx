import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Feed } from "@/components/Feed";
import { levelProgress } from "@/lib/levels";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [me, openQuests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, experience: true, reputation: true, slug: true,
        _count: { select: { followers: true, posts: true } },
      },
    }),
    prisma.quest.findMany({
      take: 3,
      include: { progress: { where: { userId }, select: { current: true, completedAt: true } } },
    }),
  ]);

  const progress = levelProgress(me?.experience ?? 0);
  const pending = openQuests.filter((q) => !q.progress[0]?.completedAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold">Ciao {me?.name}</h1>
        <Feed />
      </div>

      <aside className="space-y-6">
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
