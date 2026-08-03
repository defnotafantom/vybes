/**
 * Il messaggio d'errore di un campo.
 *
 * ── Perché è un componente e non tre righe di JSX ──
 *
 * Perché il difetto che risolve si è presentato due volte, identico, in due
 * moduli diversi. `ProfileForm` raccoglieva gli errori di `zod` in un
 * dizionario indicizzato per campo e ne mostrava quattro su undici;
 * `EventForm` sette su sedici. Per gli altri il `submit` si interrompeva
 * senza scrivere niente in pagina: chi lo usa ripreme «Salva», non succede
 * nulla, e conclude che il sito è rotto.
 *
 * Il difetto non stava nei campi scoperti: stava nel fatto che **mostrare
 * l'errore era una cosa da ricordarsi**, ripetuta a mano per ogni campo. È lo
 * stesso schema che su questo progetto ha prodotto quasi tutti i difetti — la
 * regola esiste, è scritta da qualche parte, e niente la applica.
 *
 * Insieme a `ErroriOrfani`, che stampa in fondo al modulo tutte le chiavi
 * rimaste senza posto, il caso «errore che nessuno mostra» smette di essere
 * possibile invece di essere corretto un campo alla volta.
 */
export function Errore({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
      {msg}
    </p>
  );
}

/**
 * Gli errori che nessun campo ha mostrato.
 *
 * `_` è quello generico dell'API, ma qui finisce anche qualunque chiave che
 * il server dovesse restituire per un campo che il modulo non prevede — o che
 * una regola nuova in `validations.ts` dovesse produrre domani. È la rete
 * sotto il trapezio: senza, quell'errore sparirebbe e basta, e il modulo
 * rifiuterebbe in silenzio.
 */
export function ErroriOrfani({
  errori,
  mostrati,
}: {
  errori: Record<string, string>;
  /** I campi che hanno già un posto in pagina dove mostrare il proprio errore. */
  mostrati: readonly string[];
}) {
  const orfani = Object.entries(errori).filter(([k]) => !mostrati.includes(k));
  if (orfani.length === 0) return null;

  return (
    <>
      {orfani.map(([k, msg]) => (
        <Errore key={k} msg={msg} />
      ))}
    </>
  );
}
