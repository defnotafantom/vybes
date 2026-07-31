"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Problem = { kind: "credenziali" | "non-verificata" | "generico"; message: string };

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(
    initialError ? { kind: "credenziali", message: initialError } : null
  );
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailValue = String(form.get("email"));
    setEmail(emailValue);
    setProblem(null);
    setResent(false);

    startTransition(async () => {
      const res = await signIn("credentials", {
        email: emailValue,
        password: String(form.get("password")),
        redirect: false,
      });

      if (res?.error) {
        // A seconda della versione di Auth.js il codice arriva su `code`
        // oppure inglobato in `error`: si controllano entrambi.
        const raw = `${(res as { code?: string }).code ?? ""} ${res.error}`;
        if (raw.includes("email_non_verificata")) {
          setProblem({
            kind: "non-verificata",
            message: "Devi confermare l'indirizzo email prima di accedere.",
          });
        } else {
          setProblem({ kind: "credenziali", message: "Email o password non corretti" });
        }
        return;
      }

      router.push(next);
      router.refresh();
    });
  }

  async function resend() {
    await fetch("/api/auth/verifica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <Link href="/password-dimenticata" className="text-xs text-brand-600 hover:underline">
            Password dimenticata?
          </Link>
        </div>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>

      {problem && (
        <div
          role="alert"
          className="animate-fade-in rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
        >
          <p>{problem.message}</p>
          {problem.kind === "non-verificata" && !resent && (
            <button type="button" onClick={resend} className="mt-2 underline">
              Rinvia il link di verifica
            </button>
          )}
          {resent && <p className="mt-2">Link inviato. Controlla anche lo spam.</p>}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Accesso in corso…" : "Accedi"}
      </button>
    </form>
  );
}
