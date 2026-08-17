"use client";

import { usePathname } from "next/navigation";

/**
 * Mostra i figli solo fuori dall'area personale.
 *
 * La barra superiore e il piè di pagina servono a chi esplora il sito: portano
 * ad artisti, ingaggi, città, mappa. Dentro la dashboard sono rumore — la
 * navigazione è già nel menu laterale, e due sistemi di navigazione
 * sovrapposti costringono ogni volta a decidere quale guardare.
 *
 * ── Perché così e non con i gruppi di rotte ──
 *
 * La via canonica di Next sarebbe spostare tutte le pagine pubbliche in un
 * gruppo `(pubblico)` con il proprio layout. È più pulita, ma significa
 * spostare una ventina di cartelle di rotte in un colpo solo — e ogni percorso
 * che si sbaglia è una pagina che sparisce, o un canonical che cambia, su un
 * sito già indicizzato.
 *
 * Questo componente ottiene lo stesso risultato visibile senza toccare un solo
 * percorso. Il prezzo è che il markup dell'intestazione viene comunque
 * serializzato anche nelle pagine che non lo mostrano: qualche centinaio di
 * byte su pagine private, che non sono indicizzate e non hanno vincoli di
 * velocità di caricamento. Se un giorno si riorganizzano le rotte per altri
 * motivi, questo componente sparisce insieme.
 */
export function SoloPubblico({
  children,
  ancheSullaLanding = true,
}: {
  children: React.ReactNode;
  /**
   * Falso per la barra superiore: sulla landing non c'è.
   *
   * La prima schermata fa una domanda sola — entri o no — e una barra con
   * cinque destinazioni è l'invito a non rispondere. Chi arriva la prima volta
   * non sa ancora cosa siano «Ingaggi» o «Mappa», quindi quei collegamenti non
   * offrono una scelta: offrono una via di fuga.
   *
   * Vale anche per il piè di pagina, per la stessa ragione: la scena finisce
   * con una domanda, e un elenco di venti collegamenti subito sotto è la
   * risposta sbagliata.
   *
   * ── Il costo, che è reale ──
   *
   * Il piè di pagina portava i collegamenti interni verso un centinaio di
   * pagine città e disciplina. Da qui non ci arriva più niente.
   *
   * Non è un problema di **scoperta**: quelle pagine stanno nella sitemap, e
   * Google le trova lo stesso. È un problema di **peso**: una pagina che
   * nessuno collega dalla home riceve meno autorità, e il calo non produce
   * nessun errore da nessuna parte — si vede solo nelle posizioni, mesi dopo.
   *
   * È una scelta deliberata, non una dimenticanza. Se un giorno il traffico
   * organico sulle pagine città conta più della prima impressione, il posto
   * dove rimetterli è questo, e la riga da cambiare è una.
   */
  ancheSullaLanding?: boolean;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  if (!ancheSullaLanding && pathname === "/") return null;
  return <>{children}</>;
}
