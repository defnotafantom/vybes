import { prisma } from "@/lib/prisma";

/**
 * L'indirizzo pubblico di un utente, letto dal database.
 *
 * ── Perché non basta la sessione ──
 *
 * Lo slug stava anche nel token JWT, e da lì lo leggevano il collegamento
 * «Profilo pubblico» della dashboard e i `revalidatePath` di tre route API.
 * Un token però è una **fotografia**: viene scritto all'accesso e non cambia
 * più fino alla scadenza. Cambiando lo slug di un profilo — cosa che
 * `npm run user:slug` fa — la fotografia resta quella vecchia.
 *
 * Il difetto si è visto subito nel collegamento, che puntava a una pagina
 * ormai 404. Ma il danno peggiore era invisibile: `revalidatePath` con lo
 * slug vecchio rigenera una pagina che non esiste più, e quella vera continua
 * a servire la versione in cache. Chi carica un lavoro nel portfolio non lo
 * vede comparire sul proprio profilo e non ha modo di capire perché.
 *
 * ── Perché lo slug è stato tolto dalla sessione ──
 *
 * Perché lasciarcelo e ricordarsi di non usarlo è la stessa forma di difetto
 * che questo progetto ha incontrato dieci volte: la regola esiste, è scritta
 * da qualche parte, e niente la applica. Tolto dal tipo, il compilatore
 * rifiuta chi ci riprova.
 *
 * Restano nella sessione `id` e `role`, che sono un'altra cosa: `id` non
 * cambia mai per definizione, e `role` viene comunque riletto dal database
 * dove conta davvero — il layout della dashboard lo fa già, perché una revoca
 * deve sparire dal menu subito e non alla scadenza del token.
 *
 * ── Costo ──
 *
 * Una query per pagina che mostra il collegamento. È indicizzata sulla chiave
 * primaria, e quelle pagine ne fanno già altre tre in parallelo.
 */
export async function slugDi(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { slug: true } });
  return u?.slug ?? null;
}
