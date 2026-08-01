"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

/**
 * Decisione su una segnalazione.
 *
 * La motivazione è obbligatoria per accogliere o respingere, e il vincolo è
 * anche sul server: qui serve solo a non far scoprire l'errore dopo l'invio.
 * Un controllo che vive solo nel browser non è un controllo — chiunque può
 * chiamare l'API direttamente — ma un controllo che vive solo sul server è
 * un'interfaccia scortese.
 *
 * «In esame» esiste perché alcune segnalazioni richiedono di guardare
 * materiale, cercare un contesto, a volte aspettare. Senza uno stato
 * intermedio, due persone che moderano finirebbero per aprire la stessa
 * segnalazione senza saperlo.
 */
export function DecisioneForm({ id, stato }: { id: string; stato: string }) {
  const [decisione, setDecisione] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function decidi(status: "IN_ESAME" | "ACCOLTA" | "RESPINTA") {
    if (status !== "IN_ESAME" && !decisione.trim()) {
      toast.push("Scrivi una motivazione prima di chiudere la segnalazione", "error");
      return;
    }

    setInCorso(true);
    try {
      const res = await fetch(`/api/segnalazioni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, decisione }),
      });
      const body = await res.json();

      if (!res.ok) {
        toast.push(body.error ?? "Non è stato possibile salvare la decisione", "error");
        return;
      }

      toast.push(
        status === "IN_ESAME" ? "Presa in carico" : "Decisione registrata",
        "success"
      );
      // La coda è renderizzata sul server: senza il refresh, la segnalazione
      // appena decisa resterebbe a schermo come se nulla fosse.
      router.refresh();
    } catch {
      toast.push("Errore di rete, riprova", "error");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div className="mt-5 border-t pt-4">
      <label htmlFor={`decisione-${id}`} className="block text-fluid-xs font-medium">
        Motivazione della decisione
      </label>
      <textarea
        id={`decisione-${id}`}
        className="input mt-2 min-h-20 text-fluid-sm"
        value={decisione}
        onChange={(e) => setDecisione(e.target.value)}
        maxLength={2000}
        placeholder="Cosa è stato verificato e su quale base si decide. Viene inviata a chi ha segnalato."
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {stato !== "IN_ESAME" && (
          <button
            type="button"
            className="btn-ghost"
            disabled={inCorso}
            onClick={() => decidi("IN_ESAME")}
          >
            Prendo in carico
          </button>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={inCorso}
          onClick={() => decidi("ACCOLTA")}
        >
          Accogli
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={inCorso}
          onClick={() => decidi("RESPINTA")}
        >
          Respingi
        </button>
      </div>
    </div>
  );
}
