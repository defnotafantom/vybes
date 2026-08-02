import type { ReactNode } from "react";

/**
 * Intestazione delle sezioni dell'area personale.
 *
 * Le dodici schermate della dashboard avevano dodici intestazioni improvvisate:
 * alcune con un sottotitolo, altre no; l'azione principale a volte accanto al
 * titolo e a volte in fondo alla pagina; tutte con `text-2xl` invece della
 * scala fluida usata dal resto del sito. Passando da una sezione all'altra si
 * aveva la sensazione di cambiare prodotto.
 *
 * Le pagine pubbliche avevano lo stesso problema, risolto da `PageHero`.
 * Questa è la stessa idea sull'altro lato del login, con una differenza che
 * viene dall'uso: qui non si arriva da una ricerca ma da un menu, e non serve
 * il colpo d'occhio scenografico — serve sapere in fretta dove si è, quanto
 * c'è, e qual è la cosa da fare.
 *
 * Da qui i tre elementi, in quest'ordine:
 *
 * - **il titolo**, che dice dove sei;
 * - **il sottotitolo**, che dice a cosa serve la sezione. È la parte che manca
 *   più spesso e quella che vale di più: «Portfolio» non spiega niente,
 *   «ogni lavoro diventa una pagina pubblica indicizzata» sì;
 * - **l'azione**, sempre in alto a destra, sempre nello stesso punto.
 *
 * I numeri sono facoltativi e vanno messi solo quando aiutano a decidere. Un
 * conteggio che nessuno userebbe è rumore che si legge comunque.
 */
export function SezioneHeader({
  titolo,
  sottotitolo,
  numeri,
  azione,
}: {
  titolo: string;
  sottotitolo?: ReactNode;
  numeri?: { label: string; valore: ReactNode }[];
  azione?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-fluid-2xl">{titolo}</h1>
          {sottotitolo && (
            <p className="mt-2 max-w-2xl text-fluid-sm leading-relaxed text-ink-muted">
              {sottotitolo}
            </p>
          )}
        </div>

        {/* `shrink-0` perché l'azione non deve mai andare a capo dentro se
            stessa: un pulsante spezzato in due righe sembra rotto. */}
        {azione && <div className="shrink-0">{azione}</div>}
      </div>

      {numeri && numeri.length > 0 && (
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          {numeri.map((n) => (
            <div key={n.label}>
              {/* tabular-nums: le cifre hanno la stessa larghezza, così il
                  numero non balla quando cambia da 9 a 10. */}
              <dd className="text-fluid-xl font-bold tabular-nums">{n.valore}</dd>
              <dt className="mt-0.5 text-fluid-xs uppercase tracking-wider text-ink-faint">
                {n.label}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
