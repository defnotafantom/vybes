/**
 * Validazione della destinazione dopo il login.
 *
 * Il parametro `next` viene dall'URL, quindi da chiunque. Passato così com'è a
 * un reindirizzamento è una vulnerabilità nota come *open redirect*: basta un
 * link tipo
 *
 *     https://vybeshub.art/accedi?next=https://vybes-fake.example/entra
 *
 * per costruire un'esca credibile. La vittima vede il dominio giusto, si fida,
 * inserisce le credenziali sul sito vero, e viene sbalzata su un clone che le
 * chiede di rifarlo «perché qualcosa è andato storto». La seconda volta le
 * consegna all'attaccante.
 *
 * Con le registrazioni aperte l'esca è ancora più facile da distribuire: basta
 * mettere il link in un profilo.
 *
 * La difesa è una lista di ciò che è permesso, non di ciò che è vietato. Si
 * accettano solo percorsi interni, e si rifiuta tutto il resto.
 */

const PREDEFINITA = "/dashboard";

export function destinazioneSicura(next: string | undefined | null): string {
  if (!next) return PREDEFINITA;

  // Deve cominciare con una sola barra. `//evil.com` è un URL *protocol
  // relative*: il browser lo interpreta come `https://evil.com`, ed è il modo
  // più comune di aggirare un controllo che guarda solo la prima barra.
  if (!next.startsWith("/") || next.startsWith("//")) return PREDEFINITA;

  // `/\evil.com` — barra rovesciata — è la variante che alcuni browser
  // normalizzano in `//evil.com`. Costa una riga escluderla.
  if (next.startsWith("/\\")) return PREDEFINITA;

  // Un percorso che contiene `:` prima della prima barra successiva può
  // nascondere uno schema (`/javascript:alert(1)` non naviga, ma varianti
  // costruite ad arte sì). Nessun percorso legittimo del sito ne ha bisogno.
  const primoSegmento = next.slice(1).split(/[/?#]/)[0];
  if (primoSegmento.includes(":")) return PREDEFINITA;

  return next;
}
