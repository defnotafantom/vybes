/**
 * Le date, scritte come le scriverebbe una persona.
 *
 * In giro per il progetto c'erano sette `toLocaleDateString("it-IT")` sparsi,
 * che producono «2/8/2026». È corretto e illeggibile: chi guarda un elenco di
 * ingaggi deve capire *quando* con un colpo d'occhio, e una data numerica
 * costringe a decodificarla. «2 ago» si legge senza pensarci.
 *
 * Modulo puro e senza dipendenze: viene importato anche da componenti client.
 *
 * ── Nota sul fuso ──
 *
 * Il formato non specifica un timeZone, quindi il server rende con il proprio
 * (UTC su Vercel) e il browser con quello dell'utente. Per una data di
 * concerto la differenza può spostare il giorno. Le pagine che mostrano date
 * sono `force-dynamic` o rigenerate ogni ora, quindi il rischio è teorico —
 * ma se un giorno comparisse un fuso sbagliato, questo è il file da guardare,
 * e la soluzione è fissare `timeZone: "Europe/Rome"` qui e in un posto solo.
 */

const GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const GIORNO_ANNO = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const ORA = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

/**
 * «2 ago» per quest'anno, «2 ago 2027» per gli altri.
 *
 * L'anno si scrive solo quando aggiunge qualcosa: ripeterlo su ogni riga di un
 * elenco di date tutte dello stesso anno è rumore che allontana le due
 * informazioni che contano, giorno e mese.
 */
export function dataBreve(d: Date | string): string {
  const data = typeof d === "string" ? new Date(d) : d;
  const stessoAnno = data.getFullYear() === new Date().getFullYear();
  return (stessoAnno ? GIORNO : GIORNO_ANNO).format(data);
}

/** «2 ago · 21:30» — per la scheda di un ingaggio, dove l'ora serve davvero. */
export function dataOra(d: Date | string): string {
  const data = typeof d === "string" ? new Date(d) : d;
  return `${dataBreve(data)} · ${ORA.format(data)}`;
}

/**
 * «oggi», «ieri», «3 giorni fa», poi la data.
 *
 * Per le cose successe di recente — un messaggio, una candidatura — la
 * distanza dice più della data: «ieri» è immediato, «1 ago» richiede di
 * ricordare che giorno è oggi. Oltre la settimana si inverte, e la data torna
 * a essere l'informazione più utile.
 *
 * Dipende da `Date.now()`, quindi in un componente client renderizzato anche
 * sul server può in teoria differire fra i due — solo però a cavallo della
 * mezzanotte, e la differenza sarebbe di una parola. Non vale la complessità
 * di un `useEffect` per risolverlo; se un giorno lo valesse, si risolve qui.
 */
export function quandoRelativo(d: Date | string): string {
  const data = typeof d === "string" ? new Date(d) : d;
  const giorni = Math.floor((Date.now() - data.getTime()) / 86_400_000);

  if (giorni < 0) return dataBreve(data); // nel futuro: la distanza confonderebbe
  if (giorni === 0) return "oggi";
  if (giorni === 1) return "ieri";
  if (giorni < 7) return `${giorni} giorni fa`;
  return dataBreve(data);
}
