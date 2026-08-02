import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Intestazione delle pagine di dettaglio e dei moduli.
 *
 * Diversa da `SezioneHeader` perché rispondono a domande diverse. Una sezione
 * è una destinazione: si arriva dal menu, e conta sapere a cosa serve. Una
 * pagina di dettaglio è un passaggio: ci si arriva da un elenco, e la cosa più
 * importante è poterci tornare.
 *
 * Da qui il ritorno in cima, sempre nello stesso posto e sempre con la stessa
 * forma. Prima era una freccia scritta a mano — `←` dentro il testo del link —
 * diversa in ogni pagina e senza il rilievo che serve a farla trovare senza
 * cercarla.
 */
export function PaginaHeader({
  ritornoA,
  ritornoLabel,
  titolo,
  sottotitolo,
  azioni,
}: {
  ritornoA: string;
  ritornoLabel: string;
  titolo: string;
  sottotitolo?: ReactNode;
  azioni?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <Link
        href={ritornoA}
        className="group inline-flex items-center gap-1.5 text-fluid-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
        {ritornoLabel}
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          {/* `text-wrap: balance` è già sugli h1 nel foglio di stile: un titolo
              lungo si spezza in righe di lunghezza simile invece di lasciare
              una parola sola sull'ultima. */}
          <h1 className="text-fluid-2xl">{titolo}</h1>
          {sottotitolo && (
            <p className="mt-2 max-w-2xl text-fluid-sm leading-relaxed text-ink-muted">
              {sottotitolo}
            </p>
          )}
        </div>
        {azioni && <div className="flex shrink-0 flex-wrap gap-2">{azioni}</div>}
      </div>
    </header>
  );
}
