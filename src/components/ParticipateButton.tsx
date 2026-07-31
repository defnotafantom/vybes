"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PARTICIPATION_STATUS } from "@/lib/constants";

export function ParticipateButton({
  eventId,
  initialStatus,
  disabled,
  isAuthenticated,
}: {
  eventId: string;
  initialStatus: string | null;
  disabled: boolean;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <a href={`/accedi?next=/eventi`} className="btn-primary w-full">
        Accedi per candidarti
      </a>
    );
  }

  if (status && status !== "CANCELLED") {
    return (
      <div className="text-center">
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:bg-white/5 dark:text-brand-300">
          Candidatura: {PARTICIPATION_STATUS[status as keyof typeof PARTICIPATION_STATUS] ?? status}
        </p>
        {status === "PENDING" && (
          <button
            type="button"
            className="mt-2 text-xs muted underline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await fetch(`/api/events/${eventId}/participate`, { method: "DELETE" });
                setStatus(null);
                router.refresh();
              })
            }
          >
            Ritira la candidatura
          </button>
        )}
      </div>
    );
  }

  async function submit() {
    setError(null);
    const res = await fetch(`/api/events/${eventId}/participate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Non è stato possibile inviare la candidatura");
      return;
    }
    setStatus("PENDING");
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      {!open ? (
        <button type="button" className="btn-primary w-full" disabled={disabled} onClick={() => setOpen(true)}>
          {disabled ? "Candidature chiuse" : "Candidati"}
        </button>
      ) : (
        <div className="space-y-3">
          <label htmlFor="participate-message" className="block text-sm font-medium">
            Messaggio per l&apos;organizzatore <span className="muted">(facoltativo)</span>
          </label>
          <textarea
            id="participate-message"
            className="input min-h-24"
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Racconta perché sei la persona giusta per questo ingaggio."
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => startTransition(submit)}>
              {pending ? "Invio…" : "Invia candidatura"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
