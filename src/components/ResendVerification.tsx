"use client";

import { useState, useTransition } from "react";

export function ResendVerification({ emailIniziale = "" }: { emailIniziale?: string }) {
  // Precompilato quando si arriva dalla registrazione: l'indirizzo l'abbiamo
  // appena ricevuto, richiederlo sarebbe solo un ostacolo in più nel momento
  // in cui la persona è già incerta.
  const [email, setEmail] = useState(emailIniziale);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <p role="status" className="mt-6 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-white/5 dark:text-brand-300">
        Se l&apos;indirizzo corrisponde a un account non ancora verificato, ti abbiamo inviato un
        nuovo link. Controlla anche lo spam.
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await fetch("/api/auth/verifica", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setSent(true);
        });
      }}
    >
      <label htmlFor="resend-email" className="block text-sm font-medium">
        Rinvia il link di verifica
      </label>
      <input
        id="resend-email"
        type="email"
        required
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="la-tua@email.it"
      />
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Invio…" : "Invia di nuovo"}
      </button>
    </form>
  );
}
