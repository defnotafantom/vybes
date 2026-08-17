/**
 * Ingaggi brevi.
 *
 * ── Perché esistono ──
 *
 * Gli ingaggi da concerto sono pochi e li prende chi è già affermato. Il volume
 * sta sotto: due ore, ottanta euro, a quattro chilometri da casa. Una vetrina
 * di Natale, un compleanno, una lezione privata, un laboratorio per bambini, un
 * sottofondo per un'inaugurazione.
 *
 * È l'asse del lavoro di POSIZIONE.md, e la leva è **abbassare la soglia**: non
 * rendere prestigioso l'ingaggio, renderlo frequente.
 *
 * ── Sul nome ──
 *
 * Nel prodotto si chiamano «ingaggi brevi» e mai «lavoretti». La parola
 * contiene già il giudizio che questo progetto esiste per smontare — che
 * l'arte, sotto una certa cifra, non sia lavoro. Chi la usa nel proprio
 * prodotto ha perso la discussione prima di cominciarla.
 *
 * ── Perché una durata e non un flag ──
 *
 * `isBreve` obbligherebbe a decidere la soglia in fase di scrittura, e quella
 * soglia finirebbe scritta due volte: in chi crea l'annuncio e in chi lo cerca.
 * Il giorno in cui una delle due cambia, l'altra continua a valere senza dirlo
 * — è la forma di difetto numero due di COLLOQUIO.md.
 *
 * Con le ore la soglia sta qui, in una costante sola, e cambiarla non richiede
 * di riscrivere nessuna riga già salvata.
 */

/**
 * Fino a quante ore un ingaggio è «breve».
 *
 * Quattro, e non è un numero tondo per caso: è la durata sotto la quale un
 * lavoro sta dentro un pomeriggio senza mangiarsi la giornata, e quindi quella
 * sotto la quale ha senso spostarsi solo se è vicino. È anche il punto in cui
 * il compenso smette di essere trattato come un cachet e comincia a essere
 * trattato come una cifra tonda.
 *
 * Se domani si scopre che il taglio vero è tre o sei, si cambia questa riga e
 * non succede altro.
 */
export const ORE_BREVE = 4;

/** È un ingaggio breve? `null` — durata non dichiarata — non lo è. */
export function eBreve(durataOre: number | null | undefined): boolean {
  return typeof durataOre === "number" && durataOre > 0 && durataOre <= ORE_BREVE;
}

/**
 * La durata detta come la direbbe una persona.
 *
 * «1,5 h» è un dato; «un'ora e mezza» è un'informazione. La differenza conta
 * perché questo testo compare accanto a un compenso di ottanta euro, dove chi
 * legge sta facendo un conto a mente e ogni attrito lo interrompe.
 */
export function durataInParole(ore: number | null | undefined): string | null {
  if (typeof ore !== "number" || ore <= 0) return null;
  if (ore < 1) return `${Math.round(ore * 60)} minuti`;
  if (ore === 1) return "un'ora";
  if (ore === 1.5) return "un'ora e mezza";
  if (Number.isInteger(ore)) return `${ore} ore`;
  const intere = Math.floor(ore);
  const minuti = Math.round((ore - intere) * 60);
  return `${intere} ore e ${minuti}`;
}

/**
 * Il compenso orario, quando ha senso calcolarlo.
 *
 * Serve a una cosa sola, ed è il motivo per cui esiste: **rendere confrontabili
 * annunci di durata diversa**. Ottanta euro per due ore e centoventi per
 * cinque non si confrontano a occhio, e chi si sposta in bicicletta per un
 * ingaggio ha bisogno di saperlo prima di rispondere.
 *
 * Si calcola solo sui compensi fissi: con una forbice il numero sarebbe una
 * media di due ipotesi, cioè un dato inventato che sembra misurato.
 */
export function compensoOrario(
  feeMin: number | null | undefined,
  feeMax: number | null | undefined,
  durataOre: number | null | undefined
): number | null {
  if (typeof durataOre !== "number" || durataOre <= 0) return null;
  if (typeof feeMin !== "number" || feeMin <= 0) return null;
  // Solo se il compenso è un numero e non un intervallo.
  if (typeof feeMax === "number" && feeMax !== feeMin) return null;
  return Math.round(feeMin / durataOre);
}
