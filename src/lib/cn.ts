/**
 * Concatena classi condizionali.
 *
 * Deliberatamente più semplice di clsx + tailwind-merge: quelle due librerie
 * servono a risolvere i conflitti fra utility Tailwind quando un componente
 * riceve classi arbitrarie dall'esterno. Qui i punti di ingresso sono pochi e
 * controllati, e l'ordine delle classi lo decidiamo noi: 6 kB di dipendenza
 * per un problema che non abbiamo.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
