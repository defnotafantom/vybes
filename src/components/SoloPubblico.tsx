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
   * Il piè di pagina invece resta, e non è un'incoerenza: sta **dopo** la
   * scena, lo si incontra solo avendo già scorso tutto, e porta con sé i
   * collegamenti interni verso le pagine città e disciplina. Toglierlo
   * lascerebbe un centinaio di pagine indicizzate senza nessun collegamento
   * dalla home, che per Google è un declassamento lento e silenzioso.
   */
  ancheSullaLanding?: boolean;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  if (!ancheSullaLanding && pathname === "/") return null;
  return <>{children}</>;
}
