import { prisma } from "@/lib/prisma";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { fromCsv } from "@/lib/slug";
import { giornoDi } from "@/lib/vetrina";
import { MINIMO_OPERE, operaDelGiorno, type OperaIncontrabile } from "@/lib/incontro";

/**
 * Le opere che possono essere incontrate, e quella di oggi.
 *
 * ── Il filtro, che è la parte importante ──
 *
 * Non tutte le opere pubbliche: solo quelle che hanno una **credenza**. Senza
 * quella frase l'incontro non è un incontro, è una vetrina — l'opera resta
 * bella o brutta, e manca il gancio che tocca chi guarda (POSIZIONE.md).
 *
 * Il filtro è severo di proposito. Meglio ruotare su poche opere che diluire
 * la cosa fino a farne un elenco.
 *
 * ── Il tetto sui candidati ──
 *
 * Duecento. La scelta del giorno avviene in memoria e non nel database, perché
 * dipende da chi guarda: una `ORDER BY random()` per utente non è
 * memorizzabile in cache e costa una scansione a ogni visita. Duecento righe
 * strette si leggono in pochi millisecondi e si tengono in cache per un giorno
 * intero.
 *
 * L'ordine è `createdAt asc` e non `desc`, per la stessa ragione della vetrina:
 * dev'essere **stabile**. Ordinando per data discendente, ogni nuova opera
 * caricata sposterebbe tutta la sequenza futura di tutti.
 *
 * Sopra le duecento opere il tetto andrà ripensato per disciplina — che è
 * anche il momento in cui l'incontro smetterà di essere «una cosa a caso» e
 * diventerà «una cosa a caso di un'arte che non hai mai guardato».
 */
const CANDIDATI = 200;

export async function opereIncontrabili(): Promise<OperaIncontrabile[]> {
  const opere = await prisma.portfolioItem.findMany({
    where: {
      isPublic: true,
      user: ARTISTA_PUBBLICO,
      // `not: null` **e** `not: ""`: la colonna è nullable, ma il modulo salva
      // una stringa vuota come `null` solo se passa dall'API. Un dato entrato
      // da un'altra strada — un seed, uno script, una migrazione futura —
      // potrebbe avere la stringa vuota, e una citazione vuota sulla pagina
      // sarebbe un riquadro con le virgolette e niente dentro.
      credenza: { not: null, notIn: [""] },
      mediaUrl: { not: "" },
    },
    orderBy: { createdAt: "asc" },
    take: CANDIDATI,
    select: {
      id: true,
      slug: true,
      title: true,
      credenza: true,
      mediaUrl: true,
      mediaType: true,
      user: { select: { name: true, slug: true, disciplines: true } },
    },
  });

  return opere.map((o) => ({
    id: o.id,
    slug: o.slug,
    titolo: o.title,
    credenza: o.credenza ?? "",
    mediaUrl: o.mediaUrl,
    mediaType: o.mediaType,
    // La prima disciplina: un artista che fa due cose ha comunque un mestiere
    // principale, ed è quello a cui il pubblico associa il pregiudizio.
    disciplina: fromCsv(o.user.disciplines)[0] ?? null,
    autore: { nome: o.user.name, slug: o.user.slug },
  }));
}

/**
 * L'opera di oggi.
 *
 * Restituisce `null` sotto la soglia: con meno di tre opere «una al giorno»
 * diventa «sempre la stessa», e chi torna il secondo giorno capisce che dietro
 * non c'è niente. Uno stato vuoto onesto vale più di una rotazione finta.
 */
export async function incontroDiOggi(
  chi = "",
  giorno = giornoDi()
): Promise<OperaIncontrabile | null> {
  const opere = await opereIncontrabili();
  if (opere.length < MINIMO_OPERE) return null;
  return operaDelGiorno(opere, giorno, chi);
}
