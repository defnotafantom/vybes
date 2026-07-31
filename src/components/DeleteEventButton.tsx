"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Con candidature attive l'ingaggio viene annullato, non cancellato: la
 * pagina resta online in stato CANCELLED perché è già indicizzata e chi
 * ci arriva deve capire cos'è successo, non trovare un 404.
 */
export function DeleteEventButton({
  eventId,
  activeParticipations,
}: {
  eventId: string;
  activeParticipations: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const willCancel = activeParticipations > 0;

  if (!confirming) {
    return (
      <button type="button" className="btn-ghost text-red-600" onClick={() => setConfirming(true)}>
        {willCancel ? "Annulla ingaggio" : "Elimina"}
      </button>
    );
  }

  return (
    <div className="card border-red-300 dark:border-red-900">
      <p className="text-sm font-medium">
        {willCancel
          ? `Ci sono ${activeParticipations} candidature attive.`
          : "Nessuna candidatura ricevuta."}
      </p>
      <p className="mt-2 text-sm muted">
        {willCancel
          ? "L'ingaggio verrà marcato come annullato e tutti i candidati riceveranno una notifica. La pagina resterà raggiungibile ma uscirà dai risultati di ricerca."
          : "L'ingaggio verrà eliminato definitivamente. L'operazione non è reversibile."}
      </p>

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary bg-red-600 hover:bg-red-700"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
              if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                setError(json.error ?? "Operazione non riuscita");
                return;
              }
              router.push("/dashboard/eventi");
              router.refresh();
            })
          }
        >
          {pending ? "Attendere…" : willCancel ? "Sì, annulla" : "Sì, elimina"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
          Torna indietro
        </button>
      </div>
    </div>
  );
}
