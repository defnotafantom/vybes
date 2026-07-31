"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerSchema } from "@/lib/validations";

export function RegisterForm({ defaultRole }: { defaultRole: "ARTIST" | "RECRUITER" }) {
  const router = useRouter();
  const [role, setRole] = useState(defaultRole);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      role,
    };

    // Stessa validazione Zod usata dall'API: errori immediati, zero round trip.
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.errors) next[issue.path.join(".")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrors(json.details ?? { _: json.error ?? "Registrazione non riuscita" });
        return;
      }

      await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Come vuoi usare Vybes?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["ARTIST", "RECRUITER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={role === r ? "btn-primary" : "btn-ghost"}
            >
              {r === "ARTIST" ? "Sono un artista" : "Cerco artisti"}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          {role === "ARTIST" ? "Nome d'arte" : "Nome o ragione sociale"}
        </label>
        <input id="name" name="name" required autoComplete="name" className="input" aria-describedby="name-help" />
        <p id="name-help" className="mt-1 text-xs muted">Diventerà l&apos;indirizzo pubblico del tuo profilo.</p>
        {errors.name && <p role="alert" className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        {errors.email && <p role="alert" className="mt-1 text-sm text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
        <input id="password" name="password" type="password" required autoComplete="new-password" className="input" aria-describedby="pw-help" />
        <p id="pw-help" className="mt-1 text-xs muted">Almeno 10 caratteri, con maiuscola, minuscola e numero.</p>
        {errors.password && <p role="alert" className="mt-1 text-sm text-red-600">{errors.password}</p>}
      </div>

      {errors._ && <p role="alert" className="text-sm text-red-600">{errors._}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Creazione…" : "Crea account"}
      </button>
      <p className="text-xs muted">
        Iscrivendoti accetti i termini di servizio e l&apos;informativa privacy.
      </p>
    </form>
  );
}
