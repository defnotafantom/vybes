/**
 * Curva dei livelli. Modulo volutamente privo di dipendenze: viene importato
 * anche da componenti client (schede artista, barra di progresso), e tirarsi
 * dietro il client Prisma da lì sarebbe un errore.
 */

/** XP totali necessari per raggiungere un livello. */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  return {
    level,
    current: xp - floor,
    needed: ceil - floor,
    percent: Math.min(100, Math.round(((xp - floor) / Math.max(1, ceil - floor)) * 100)),
  };
}
