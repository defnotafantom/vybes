/**
 * Lo scheletro dell'elenco artisti — e perché non è più un `loading.tsx`.
 *
 * ── Il difetto ──
 *
 * Stava in `src/app/artisti/loading.tsx`, dove Next lo trasforma in un confine
 * di Suspense per **tutto il segmento**: `/artisti` e ogni suo figlio,
 * `/artisti/[slug]` compreso.
 *
 * La conseguenza non era estetica. Con un confine sopra di sé, Next comincia a
 * inviare lo scheletro **prima** di sapere se il profilo esiste — e con il
 * primo byte parte anche il codice di stato. Quando poi `notFound()` scattava,
 * il 200 era già stato spedito.
 *
 * Misurato in produzione su uno slug inventato: stato `200`, titolo «Profilo
 * non trovato», e nel corpo servito «Caricamento in corso».
 *
 * È un *soft 404*. Google li tratta come pagine di bassa qualità, e con le
 * registrazioni aperte ogni indirizzo sbagliato ne diventava uno. Il danno era
 * in parte contenuto dal `noindex` che `generateMetadata` mette già quando il
 * profilo non esiste — ma un `noindex` chiede di non indicizzare, mentre un
 * 404 dice che la pagina non c'è, e sono due affermazioni diverse.
 *
 * ── La correzione ──
 *
 * Il confine si dichiara dove serve: dentro la pagina dell'elenco, con un
 * `<Suspense>` esplicito attorno alla parte che interroga il database. Il
 * profilo, che di confini sopra di sé non ne ha più, può rispondere 404 prima
 * di scrivere qualunque cosa.
 *
 * Un file `loading.tsx` è comodo perché non obbliga a pensare a dove si
 * applica. Il prezzo è che si applica anche dove non deve, e in silenzio.
 */
import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/Skeleton";

export function SkeletonArtisti() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Caricamento degli artisti</span>
      <PageHeaderSkeleton withFilters />
      <div className="mt-8">
        <CardGridSkeleton count={9} variant="artist" />
      </div>
    </div>
  );
}
