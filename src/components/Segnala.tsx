"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { MOTIVI, MOTIVI_VALIDI, type Motivo, type TipoSegnalabile } from "@/lib/segnalazioni";
import { useToast } from "@/components/Toast";

/**
 * Pulsante e modulo di segnalazione.
 *
 * Discreto per costruzione: piccolo, in basso, senza colore d'allarme. Un
 * pulsante «segnala» ben visibile su ogni profilo suggerisce che ci sia
 * qualcosa da segnalare, e invita all'uso improprio da parte di chi ha un
 * dissapore. Deve essere trovabile da chi lo cerca, non proposto a chi non lo
 * cerca.
 *
 * Il modulo si apre solo al clic: i motivi con le loro spiegazioni sono
 * duemila caratteri di testo che non hanno ragione di stare nell'HTML di ogni
 * pagina pubblica.
 */
export function Segnala({
  targetType,
  targetId,
  etichetta = "Segnala",
}: {
  targetType: TipoSegnalabile;
  targetId: string;
  etichetta?: string;
}) {
  const [aperto, setAperto] = useState(false);
  const [motivo, setMotivo] = useState<Motivo | "">("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const toast = useToast();

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) return;
    setInCorso(true);
    try {
      const res = await fetch("/api/segnalazioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason: motivo, details, reporterEmail: email }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.push(body.error ?? "Non è stato possibile inviare la segnalazione", "error");
        setInCorso(false);
        return;
      }

      toast.push(body.data?.messaggio ?? "Segnalazione ricevuta", "success");
      setAperto(false);
      setMotivo("");
      setDetails("");
      setEmail("");
    } catch {
      toast.push("Errore di rete, riprova", "error");
    } finally {
      setInCorso(false);
    }
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="inline-flex items-center gap-1.5 text-fluid-xs text-ink-faint transition-colors hover:text-ink-muted"
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        {etichetta}
      </button>
    );
  }

  return (
    <form onSubmit={invia} className="card mt-3 max-w-lg">
      <p className="text-fluid-sm font-semibold">Segnala questo contenuto</p>
      <p className="mt-1 text-fluid-xs text-ink-muted">
        Le segnalazioni sono esaminate da una persona. Usarle per dissapori
        personali le rende più lente per chi ne ha davvero bisogno.
      </p>

      <fieldset className="mt-4">
        <legend className="text-fluid-sm font-medium">Cosa non va?</legend>
        <div className="mt-3 space-y-2">
          {MOTIVI_VALIDI.map((m) => (
            <label key={m} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="motivo"
                value={m}
                checked={motivo === m}
                onChange={() => setMotivo(m)}
                className="mt-1 accent-brand-500"
                required
              />
              <span className="min-w-0">
                <span className="block text-fluid-sm">{MOTIVI[m].label}</span>
                <span className="block text-fluid-xs text-ink-faint">{MOTIVI[m].aiuto}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="dettagli" className="mt-5 block text-fluid-sm font-medium">
        Dettagli {motivo === "ALTRO" ? "(obbligatori)" : "(facoltativi)"}
      </label>
      <textarea
        id="dettagli"
        className="input mt-2 min-h-24"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={2000}
        placeholder="Cosa dovremmo guardare, e perché."
        required={motivo === "ALTRO"}
      />

      <label htmlFor="email-segnalazione" className="mt-4 block text-fluid-sm font-medium">
        La tua email (facoltativa)
      </label>
      <input
        id="email-segnalazione"
        type="email"
        className="input mt-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Per ricevere l'esito"
      />
      <p className="mt-1.5 text-fluid-xs text-ink-faint">
        La usiamo solo per comunicarti la decisione. Puoi lasciarla in bianco: la
        segnalazione viene comunque presa in carico.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={inCorso || !motivo}>
          {inCorso ? "Invio…" : "Invia segnalazione"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setAperto(false)}>
          Annulla
        </button>
      </div>
    </form>
  );
}
