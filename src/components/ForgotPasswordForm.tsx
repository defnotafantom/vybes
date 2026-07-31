"use client";

import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  // Messaggio identico che l'account esista o no: l'endpoint non deve
  // permettere di scoprire quali indirizzi sono registrati.
  if (sent) {
    return (
      <p role="status" className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-white/5 dark:text-brand-300">
        Se esiste un account con questo indirizzo, riceverai un&apos;email con il link per
        reimpostare la password. Il link scade tra un&apos;ora. Controlla anche lo spam.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await fetch("/api/auth/password/richiedi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setSent(true);
        });
      }}
    >
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium">Email</label>
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Invio…" : "Invia il link"}
      </button>
    </form>
  );
}
