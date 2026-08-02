import { prisma } from "@/lib/prisma";
import { calcolaReputazione, dettaglioReputazione } from "@/lib/reputazione";

/**
 * Lettura dei fatti e ricalcolo della reputazione.
 *
 * Separato da `reputazione.ts` perché quello è puro e viene importato anche da
 * componenti client: tirarsi dietro il client Prisma da lì significherebbe
 * spedire al browser la logica di accesso al database.
 *
 * ── Perché ricalcolare e non incrementare ──
 *
 * Un punteggio incrementale diverge dalla realtà al primo caso non previsto:
 * un lavoro cancellato dal portfolio, una candidatura ritirata, un profilo
 * svuotato. Il valore resta alto e nessuno se ne accorge, perché non c'è
 * niente con cui confrontarlo.
 *
 * Ricalcolando, il punteggio è sempre una funzione dello stato attuale: se
 * cancelli metà del portfolio scende, com'è giusto. Il costo è una query in
 * più nei pochi momenti in cui quei fatti cambiano — profilo salvato,
 * portfolio modificato, candidatura accettata — e non a ogni pagina.
 */
export async function ricalcolaReputazione(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      isVerified: true,
      bio: true,
      headline: true,
      image: true,
      citySlug: true,
      disciplines: true,
      _count: {
        select: {
          portfolioItems: { where: { isPublic: true } },
          participations: { where: { status: "ACCEPTED" } },
          eventsCreated: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
  if (!u) return 0;

  const reputation = calcolaReputazione({
    emailVerified: u.emailVerified,
    isVerified: u.isVerified,
    bio: u.bio,
    headline: u.headline,
    image: u.image,
    citySlug: u.citySlug,
    disciplines: u.disciplines,
    portfolio: u._count.portfolioItems,
    ingaggiConfermati: u._count.participations,
    ingaggiOrganizzati: u._count.eventsCreated,
  });

  await prisma.user.update({ where: { id: userId }, data: { reputation } });
  return reputation;
}

/** Il dettaglio da mostrare in dashboard, calcolato sugli stessi fatti. */
export async function dettaglioReputazioneDi(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      isVerified: true,
      bio: true,
      headline: true,
      image: true,
      citySlug: true,
      disciplines: true,
      _count: {
        select: {
          portfolioItems: { where: { isPublic: true } },
          participations: { where: { status: "ACCEPTED" } },
          eventsCreated: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
  if (!u) return [];

  return dettaglioReputazione({
    emailVerified: u.emailVerified,
    isVerified: u.isVerified,
    bio: u.bio,
    headline: u.headline,
    image: u.image,
    citySlug: u.citySlug,
    disciplines: u.disciplines,
    portfolio: u._count.portfolioItems,
    ingaggiConfermati: u._count.participations,
    ingaggiOrganizzati: u._count.eventsCreated,
  });
}
