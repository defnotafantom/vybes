import { prisma } from "@/lib/prisma";
import { cosmeticoDi, prezzoDi, type Cosmetico, type Slot } from "@/lib/cosmetici";

/**
 * Comprare e indossare.
 *
 * ── Il problema che questo file esiste per risolvere ──
 *
 * Un acquisto è due scritture che devono valere come una: il saldo scende e
 * l'oggetto compare. Se passa la prima e non la seconda, qualcuno ha pagato e
 * non ha niente; se passa la seconda e non la prima, il negozio regala. E
 * siccome nessuna delle due situazioni solleva un errore — sono entrambe stati
 * validi del database — nessuno se ne accorgerebbe finché non lo scrive un
 * utente, ammesso che si prenda la briga.
 *
 * ── Perché una transazione interattiva e non un array ──
 *
 * `prisma.$transaction([...])` esegue una lista e basta: non può decidere di
 * annullare a metà in base a quello che ha letto. Qui invece il pagamento è un
 * **confronta-e-scrivi** — «scala il prezzo, ma solo se il saldo lo copre» — e
 * se quel confronto fallisce tutto il resto non deve accadere. Serve la forma
 * con la funzione, dove un'eccezione riporta indietro tutto.
 *
 * ── Perché il saldo si controlla nella `where` e non prima ──
 *
 * Leggere il saldo, decidere, e poi scrivere lascia in mezzo una finestra in
 * cui un secondo acquisto passa lo stesso controllo con lo stesso saldo: due
 * clic e due oggetti al prezzo di uno. Mettendo la condizione dentro
 * l'aggiornamento è il database ad arbitrare, ed è l'unico che può.
 */

export type EsitoAcquisto =
  | { ok: true; cosmetico: Cosmetico; saldo: number }
  | { ok: false; motivo: string };

export async function acquista(userId: string, cosmeticoId: string): Promise<EsitoAcquisto> {
  const cosmetico = cosmeticoDi(cosmeticoId);
  if (!cosmetico) return { ok: false, motivo: "Questo oggetto non esiste." };

  const listino = prezzoDi(cosmeticoId);
  if (!listino.ok) return { ok: false, motivo: listino.motivo };
  const prezzo = listino.prezzo;

  try {
    const saldo = await prisma.$transaction(async (tx) => {
      // Confronta-e-scrivi: `monete: { gte: prezzo }` sta nella condizione,
      // non in un `if` prima. Due richieste simultanee arrivano qui entrambe,
      // e solo la prima trova un saldo capiente.
      const { count } = await tx.user.updateMany({
        where: { id: userId, monete: { gte: prezzo } },
        data: { monete: { decrement: prezzo } },
      });
      if (count === 0) throw new Error("SALDO");

      // Il doppione lo ferma il vincolo di unicità su (userId, cosmeticoId).
      // Comprare due volte la stessa cosa è sempre un errore, mai
      // un'intenzione — e con la creazione dentro la transazione, il fallimento
      // riporta indietro anche l'addebito.
      await tx.possesso.create({ data: { userId, cosmeticoId, prezzo } });

      await tx.movimentoMonete.create({
        data: { userId, delta: -prezzo, causale: `acquisto:${cosmeticoId}` },
      });

      const u = await tx.user.findUnique({ where: { id: userId }, select: { monete: true } });
      return u?.monete ?? 0;
    });

    return { ok: true, cosmetico, saldo };
  } catch (e) {
    // I due errori attesi sono distinti e vanno detti in modo distinto: «non ti
    // bastano» si risolve giocando, «ce l'hai già» non si risolve affatto, e
    // confonderli manderebbe qualcuno a guadagnare monete per niente.
    if (e instanceof Error && e.message === "SALDO") {
      return { ok: false, motivo: `Ti servono ${prezzo} monete e non ti bastano.` };
    }
    return { ok: false, motivo: "Ce l'hai già." };
  }
}

/**
 * Indossa un oggetto, togliendo quello che occupava lo stesso posto.
 *
 * Uno slot alla volta: due cornici contemporaneamente non vogliono dire
 * niente, e senza questa regola il primo bordo disegnato coprirebbe il
 * secondo — dando l'impressione che il clic non abbia funzionato.
 *
 * Le due scritture sono una transazione per la ragione di sempre: se la prima
 * passasse e la seconda no, resterebbero due cornici accese e nessuna delle
 * due sarebbe quella scelta.
 */
export async function indossa(
  userId: string,
  cosmeticoId: string
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const cosmetico = cosmeticoDi(cosmeticoId);
  if (!cosmetico) return { ok: false, motivo: "Questo oggetto non esiste." };

  const mio = await prisma.possesso.findUnique({
    where: { userId_cosmeticoId: { userId, cosmeticoId } },
    select: { id: true, indossato: true },
  });
  if (!mio) return { ok: false, motivo: "Non ce l'hai." };

  // Ripremere su ciò che si indossa lo toglie: è il gesto che chiunque prova
  // per primo quando vuole tornare com'era, e senza questo non ci sarebbe
  // nessun modo di farlo.
  if (mio.indossato) {
    await prisma.possesso.update({ where: { id: mio.id }, data: { indossato: false } });
    return { ok: true };
  }

  const stessoSlot = (await possessiDi(userId))
    .filter((p) => p.indossato && p.cosmetico?.slot === cosmetico.slot)
    .map((p) => p.id);

  await prisma.$transaction([
    prisma.possesso.updateMany({ where: { id: { in: stessoSlot } }, data: { indossato: false } }),
    prisma.possesso.update({ where: { id: mio.id }, data: { indossato: true } }),
  ]);

  return { ok: true };
}

/** Tutto ciò che una persona possiede, con l'oggetto del catalogo accanto. */
export async function possessiDi(userId: string) {
  const righe = await prisma.possesso.findMany({
    where: { userId },
    orderBy: { ottenutoIl: "desc" },
    select: { id: true, cosmeticoId: true, indossato: true, ottenutoIl: true },
  });

  // `cosmetico` può essere `undefined`: un oggetto ritirato dal catalogo resta
  // nella tabella di chi l'aveva comprato. Cancellare quelle righe sarebbe
  // togliere a qualcuno una cosa che ha pagato; ignorarle in silenzio, invece,
  // è corretto — chi guarda vede solo ciò che si può ancora disegnare.
  return righe.map((r) => ({ ...r, cosmetico: cosmeticoDi(r.cosmeticoId) }));
}

/**
 * Cosa sta indossando, per slot.
 *
 * È la forma che serve a chi disegna: `indossati.cornice` invece di cercare
 * dentro un elenco a ogni componente. Restituisce una mappa parziale, non un
 * elenco, perché la domanda che si fa in pagina è sempre «c'è una cornice?» e
 * mai «quante cose ha addosso».
 */
export async function indossatiDi(userId: string): Promise<Partial<Record<Slot, Cosmetico>>> {
  const righe = await prisma.possesso.findMany({
    where: { userId, indossato: true },
    select: { cosmeticoId: true },
  });

  const fuori: Partial<Record<Slot, Cosmetico>> = {};
  for (const r of righe) {
    const c = cosmeticoDi(r.cosmeticoId);
    if (c) fuori[c.slot] = c;
  }
  return fuori;
}

/** Come sopra, ma per lo slug pubblico: la usano le pagine degli artisti. */
export async function indossatiDiSlug(slug: string): Promise<Partial<Record<Slot, Cosmetico>>> {
  const u = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
  return u ? indossatiDi(u.id) : {};
}
