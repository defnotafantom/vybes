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
/**
 * Chi è e come si raggiunge, in una lettura sola.
 *
 * Il layout della dashboard ha bisogno di entrambi — lo slug per il
 * collegamento al profilo pubblico, il ruolo per comporre il menu — e
 * chiederli con due query alla stessa riga sarebbe un giro a vuoto.
 *
 * Il ruolo si legge qui e non dalla sessione per il motivo scritto sopra: il
 * token è una fotografia scritta all'accesso.
 *
 * Quando questa nota è stata scritta il ruolo non si cambiava dal profilo, e
 * diceva: «il giorno in cui diventerà cambiabile, chi passa da artista a
 * organizzatore vedrebbe il menu vecchio fino alla scadenza della sessione, e
 * nessuno collegherebbe le due cose». **Quel giorno è arrivato**, e la lettura
 * dal database era già al suo posto: cambiando ruolo il menu si aggiorna al
 * caricamento successivo.
 *
 * Vale la pena tenerne traccia perché è il caso raro in cui una difesa scritta
 * in anticipo ha trovato il difetto che aspettava, invece del contrario.
 */
export async function identitaDi(
  userId: string
): Promise<{ slug: string; role: string; ruoloSceltoIl: Date | null } | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    // `ruoloSceltoIl` viaggia con gli altri due perché il layout della
    // dashboard ne ha bisogno nello stesso istante: chi non ha mai scelto va
    // mandato alla domanda prima di vedere qualunque sezione. Un campo in più
    // su una query che si fa comunque.
    select: { slug: true, role: true, ruoloSceltoIl: true },
  });
}

export async function slugDi(userId: string): Promise<string | null> {
  const u = await identitaDi(userId);
  return u?.slug ?? null;
}
