"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { SCELTE_RUOLO, type Ruolo } from "@/lib/ruolo";

/**
 * La scelta del ruolo, in un componente solo.
 *
 * ── Perché uno e non due ──
 *
 * Compare in due posti che sembrano diversi e sono la stessa domanda: la
 * pagina di benvenuto dopo l'accesso con Google, e le impostazioni del
 * profilo. Scritti separatamente, i due elenchi sarebbero divergiti alla prima
 * modifica — e chi avesse letto il secondo si sarebbe trovato a scegliere una
 * cosa descritta diversamente da come gliel'avevano descritta la prima volta.
 *
 * I testi delle tre opzioni non stanno nemmeno qui: stanno in
 * `src/lib/ruolo.ts`, accanto alla definizione dei ruoli, perché sono parte di
 * cosa un ruolo *è*.
 *
 * ── Perché tre riquadri e non un menu a tendina ──
 *
 * Perché ogni opzione ha bisogno di una riga di spiegazione. «Artista /
 * Organizzatore / Entrambi» in una tendina costringe a indovinare cosa cambia,
 * e la risposta — quali sezioni vedrai, su cosa verrai misurato — non entra in
 * un'etichetta. Con tre riquadri la spiegazione sta accanto alla scelta nel
 * momento in cui si sceglie.
 */
export function ScegliRuolo({
  attuale,
  onFatto,
  etichettaConferma = "Conferma",
}: {
  attuale: Ruolo;
  /** Dove andare dopo. Se manca, si resta e si mostra la conferma. */
  onFatto?: string;
  etichettaConferma?: string;
}) {
  const router = useRouter();
  const [scelto, setScelto] = useState<Ruolo>(attuale);
  const [inCorso, setInCorso] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const cambiato = scelto !== attuale;

  async function conferma() {
    setInCorso(true);
    setErrore(null);
    setSalvato(false);
    try {
      const res = await fetch("/api/profile/ruolo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruolo: scelto }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrore(json.error ?? "Non siamo riusciti a salvare la scelta.");
        return;
      }
      setSalvato(true);
      if (onFatto) router.push(onFatto);
      router.refresh();
    } catch {
      setErrore("Connessione persa. Riprova.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div>
      <fieldset>
        <legend className="sr-only">Che cosa vieni a fare su Vybes</legend>
        <ul className="grid gap-3">
          {SCELTE_RUOLO.map((s) => {
            const attivo = scelto === s.valore;
            return (
              <li key={s.valore}>
                <button
                  type="button"
                  onClick={() => setScelto(s.valore)}
                  aria-pressed={attivo}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    attivo
                      ? "border-brand-500 bg-brand-500/[0.08]"
                      : "border-line hover:border-brand-400/50"
                  }`}
                >
                  {/* Un cerchio pieno e non una spunta: la spunta dice «fatto»,
                      il cerchio dice «selezionato fra altri», ed è quello che
                      sta succedendo finché non si conferma. */}
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      attivo ? "border-brand-500 bg-brand-500" : "border-line"
                    }`}
                  >
                    {attivo && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.titolo}</span>
                    <span className="mt-1 block text-fluid-sm text-ink-muted">
                      {s.descrizione}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {errore && (
        <p role="alert" className="mt-4 text-fluid-sm text-esito-no">
          {errore}
        </p>
      )}

      {/* Il pulsante resta spento finché non cambia niente: premerlo per
          riscrivere lo stesso valore non fa danno, ma un comando che sembra
          fare qualcosa e non la fa insegna a non fidarsi degli altri. */}
      <button
        type="button"
        onClick={conferma}
        disabled={inCorso || (!cambiato && !onFatto)}
        className="btn-primary mt-6 min-h-12 w-full disabled:opacity-45 sm:w-auto"
      >
        {inCorso && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {inCorso ? "Salvo…" : etichettaConferma}
      </button>

      {salvato && !onFatto && (
        <p role="status" className="mt-3 text-fluid-sm text-esito-si">
          Fatto. Il menu e la tua scheda reputazione si sono già aggiornati.
        </p>
      )}
    </div>
  );
}
