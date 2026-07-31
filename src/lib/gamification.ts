import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { levelFromXp } from "@/lib/levels";

// Ri-esportate per compatibilità: la matematica vive in lib/levels.ts, che
// non dipende da Prisma ed è quindi importabile anche lato client.
export { xpForLevel, levelFromXp, levelProgress } from "@/lib/levels";

export async function grantXp(userId: string, amount: number, reputation = 0) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { experience: true, level: true } });
  if (!user) return;

  const experience = user.experience + amount;
  const level = levelFromXp(experience);

  await prisma.user.update({
    where: { id: userId },
    data: { experience, level, reputation: { increment: reputation } },
  });

  if (level > user.level) {
    await notify({
      recipientId: userId,
      type: "LEVEL_UP",
      body: `Hai raggiunto il livello ${level}!`,
      entityUrl: "/dashboard/profilo",
    });
  }
}

/**
 * Avanza una quest di `step`. Quando raggiunge il target la completa,
 * assegna la ricompensa e notifica. Idempotente: una quest completata
 * non viene ri-premiata.
 */
export async function progressQuest(userId: string, questKey: string, step = 1) {
  const quest = await prisma.quest.findUnique({ where: { key: questKey } });
  if (!quest) return;

  const existing = await prisma.questProgress.findUnique({
    where: { userId_questId: { userId, questId: quest.id } },
  });
  if (existing?.completedAt) return;

  const current = Math.min(quest.target, (existing?.current ?? 0) + step);
  const justCompleted = current >= quest.target;

  await prisma.questProgress.upsert({
    where: { userId_questId: { userId, questId: quest.id } },
    create: { userId, questId: quest.id, current, completedAt: justCompleted ? new Date() : null },
    update: { current, completedAt: justCompleted ? new Date() : null },
  });

  if (justCompleted) {
    await grantXp(userId, quest.xpReward, quest.repReward);
    await notify({
      recipientId: userId,
      type: "QUEST_COMPLETED",
      body: `Quest completata: ${quest.title} (+${quest.xpReward} XP)`,
      entityId: quest.id,
      entityUrl: "/dashboard/quest",
    });
  }
}

/** Ricalcola la quest "profilo completo" in base ai campi valorizzati. */
export async function syncProfileQuest(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { bio: true, headline: true, image: true, citySlug: true, disciplines: true },
  });
  if (!u) return;

  const filled = [u.bio, u.headline, u.image, u.citySlug, u.disciplines].filter(
    (v) => typeof v === "string" && v.trim().length > 0
  ).length;

  if (filled >= 5) await progressQuest(userId, "profile_complete");
}
