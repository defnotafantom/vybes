import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { levelFromXp } from "@/lib/levels";

// Ri-esportate per compatibilità: la matematica vive in lib/levels.ts, che
// non dipende da Prisma ed è quindi importabile anche lato client.
export { xpForLevel, levelFromXp, levelProgress } from "@/lib/levels";

/**
 * Assegna esperienza.
 *
 * Non tocca più la reputazione, e il parametro non esiste più. La reputazione
 * ordina la directory pubblica: guadagnarla completando obiettivi significava
 * mettere in cima chi usa di più il sito invece di chi è più affidabile — e
 * con le registrazioni aperte, invitare a fare rumore per farsi vedere. Ora si
 * calcola da fatti verificabili, in lib/reputazione.ts.
 *
 * All'XP resta quello per cui è adatto: il progresso personale, che sta
 * nell'area privata e non decide niente per gli altri.
 */
export async function grantXp(userId: string, amount: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { experience: true, level: true } });
  if (!user) return;

  const experience = user.experience + amount;
  const level = levelFromXp(experience);

  await prisma.user.update({
    where: { id: userId },
    data: { experience, level },
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
    // L'XP **non** viene assegnato qui: si riscuote. Vedi `riscuotiQuest`.
    await notify({
      recipientId: userId,
      type: "QUEST_COMPLETED",
      body: `Quest completata: ${quest.title} — ci sono ${quest.xpReward} XP da riscuotere`,
      entityId: quest.id,
      entityUrl: "/dashboard/quest",
    });
  }
}

export type EsitoRiscossione =
  | { ok: true; xp: number; titolo: string }
  | { ok: false; motivo: "sconosciuta" | "non-completata" | "gia-riscossa" };

/**
 * Incassa la ricompensa di una quest completata.
 *
 * ── Perché esiste, invece di premiare al completamento ──
 *
 * Premiare da soli funziona e non se ne accorge nessuno: il numero cambia
 * mentre si sta facendo altro — si carica un lavoro nel portfolio e l'XP
 * arriva su una pagina che non si sta guardando. La pagina Quest diventava
 * così un archivio di cose già successe, e la parte che dovrebbe dare
 * soddisfazione veniva consumata da una riga di notifica.
 *
 * Separare i due momenti restituisce a chi ha fatto la fatica l'istante in
 * cui la incassa, ed è anche l'unica cosa che permette all'elenco di
 * liberarsi: finché la ricompensa è automatica, una quest completata non ha
 * motivo di uscire di scena, e resta lì a occupare spazio per sempre.
 *
 * ── Le tre difese ──
 *
 * La ricompensa la decide il **server**, leggendo la quest dal database: il
 * client dice quale, non quanto. Si riscuote solo ciò che risulta completato.
 * E si riscuote **una volta**: `riscossaIl` viene scritto nella stessa
 * `updateMany` che lo pretende ancora nullo, quindi due richieste simultanee
 * — due schede aperte, un doppio clic — ne trovano una sola con qualcosa da
 * aggiornare. È la condizione di gara che, su qualunque cosa somigli a una
 * moneta, arriva sempre.
 */
export async function riscuotiQuest(userId: string, questKey: string): Promise<EsitoRiscossione> {
  const quest = await prisma.quest.findUnique({ where: { key: questKey } });
  if (!quest) return { ok: false, motivo: "sconosciuta" };

  const { count } = await prisma.questProgress.updateMany({
    where: {
      userId,
      questId: quest.id,
      completedAt: { not: null },
      riscossaIl: null,
    },
    data: { riscossaIl: new Date() },
  });

  if (count === 0) {
    const p = await prisma.questProgress.findUnique({
      where: { userId_questId: { userId, questId: quest.id } },
      select: { completedAt: true },
    });
    return { ok: false, motivo: p?.completedAt ? "gia-riscossa" : "non-completata" };
  }

  await grantXp(userId, quest.xpReward);
  return { ok: true, xp: quest.xpReward, titolo: quest.title };
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
