import type { ReactNode } from "react";
import { concorda } from "@/lib/testo";

/**
 * L'etichetta di un numero.
 *
 * O una stringa, per le etichette che in italiano non hanno plurale
 * («Livello», «In attesa»), o la coppia singolare/plurale — e in quel caso il
 * componente la concorda da sé col valore.
 *
 * ── Perché il tipo, e non «ricordarsi di scriverla giusta» ──
 *
 * Perché «1 CONVERSAZIONI», «1 LAVORI CARICATI» e «1 URGENTI» erano tutte
 * qui, scritte come stringhe fisse. E soprattutto perché «1 LAVORI
 * PUBBLICATI» è arrivato in produzione **nello stesso rilascio** in cui
 * `conta()` e `concorda()` sono state introdotte proprio per impedirlo: le
 * funzioni c'erano, il difetto è passato lo stesso, perché scrivere
 * un'etichetta in un elenco non le incontra.
 *
 * È la dimostrazione più netta della regola che questo progetto ripete da
 * dieci ADR: una regola che si può non applicare, prima o poi non si applica.
 * Con questo tipo, chi aggiunge un numero deve decidere se ha un plurale —
 * scegliere è obbligatorio, dimenticarsene no.
 */
type Etichetta = string | readonly [singolare: string, plurale: string];

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
  numeri?: { label: Etichetta; valore: ReactNode }[];
  azione?: ReactNode;
}) {
  /**
   * L'etichetta da stampare.
   *
   * La concordanza si applica solo quando il valore è davvero un numero:
   * alcune voci mostrano una frase — «3 su 8», «80/203 XP» — e lì non c'è
   * nulla con cui concordare.
   */
  const etichettaDi = (label: Etichetta, valore: ReactNode) =>
    typeof label === "string"
      ? label
      : concorda(typeof valore === "number" ? valore : 2, label[0], label[1]);
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
            <div key={typeof n.label === "string" ? n.label : n.label[1]}>
              {/* tabular-nums: le cifre hanno la stessa larghezza, così il
                  numero non balla quando cambia da 9 a 10. */}
              <dd className="text-fluid-xl font-bold tabular-nums">{n.valore}</dd>
              <dt className="mt-0.5 text-fluid-xs uppercase tracking-wider text-ink-faint">
                {etichettaDi(n.label, n.valore)}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
