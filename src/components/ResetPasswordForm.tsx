"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { passwordSchema } from "@/lib/validations";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Password non valida");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono");
      return;
    }
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/auth/password/reimposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Non è stato possibile reimpostare la password");
        return;
      }
      router.push("/accedi?reset=1");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium">Nuova password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="pw-rules"
        />
        <p id="pw-rules" className="mt-1 text-xs muted">
          Almeno 10 caratteri, con maiuscola, minuscola e numero.
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">Ripeti la password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva la nuova password"}
      </button>
    </form>
  );
}
