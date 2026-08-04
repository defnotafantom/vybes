"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MailCheck } from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { ResendVerification } from "@/components/ResendVerification";

/**
 * Il ruolo può essere governato da fuori.
 *
 * Serve perché le ragioni per iscriversi cambiano col ruolo e stanno **accanto**
 * al modulo, non dentro: due fratelli che devono leggere lo stesso stato lo
 * prendono dal genitore comune, che è `Iscrizione`. Senza `role` fra le
 * proprietà il componente resta autonomo come prima — è la stessa cosa,
 * governata da un posto diverso.
 */
export function RegisterForm({
  defaultRole,
  role: roleEsterno,
  onRoleChange,
}: {
  defaultRole: "ARTIST" | "RECRUITER";
  role?: "ARTIST" | "RECRUITER";
  onRoleChange?: (r: "ARTIST" | "RECRUITER") => void;
}) {
  const router = useRouter();
  const [roleInterno, setRoleInterno] = useState(defaultRole);
  const role = roleEsterno ?? roleInterno;
  const setRole = (r: "ARTIST" | "RECRUITER") => {
    setRoleInterno(r);
    onRoleChange?.(r);
  };
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Indirizzo a cui è partita la verifica: se valorizzato, il modulo lascia
   *  il posto alla schermata di conferma. */
  const [inviata, setInviata] = useState<string | null>(null);
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

      // Questo controllo mancava, e il risultato era il peggior finale
      // possibile per una registrazione. Quando la verifica dell'email è
      // richiesta, l'accesso automatico *non può* riuscire: il provider
      // rifiuta chi non ha confermato l'indirizzo. Il fallimento non veniva
      // guardato, si proseguiva verso la dashboard, il middleware non trovava
      // il cookie e rimandava al login.
      //
      // La persona si era appena iscritta e si ritrovava davanti a un modulo
      // di accesso, senza una parola. Nessuno legge quella schermata come
      // «controlla la posta»: la legge come «non ha funzionato».
      if (json.data?.verificationRequired) {
        setInviata(parsed.data.email);
        return;
      }

      // Senza verifica — sviluppo locale, o email non configurata — l'accesso
      // deve riuscire. Se non riesce, meglio dirlo che fingere.
      const esito = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (esito?.error) {
        setErrors({
          _: "Account creato, ma l'accesso automatico non è riuscito. Prova ad accedere.",
        });
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  if (inviata) {
    return (
      <div role="status" className="space-y-5">
        <div className="card border-brand-400/40">
          <p className="flex items-center gap-2 text-fluid-base font-semibold">
            <MailCheck className="h-5 w-5 text-brand-400" aria-hidden="true" />
            Account creato. Ora conferma l&apos;email.
          </p>
          <p className="mt-3 text-fluid-sm text-ink-muted">
            Abbiamo scritto a <strong className="text-ink">{inviata}</strong>. Apri
            il link nel messaggio per attivare l&apos;account: fino ad allora non
            puoi accedere, e il tuo profilo non compare negli elenchi pubblici.
          </p>
          <p className="mt-3 text-fluid-sm text-ink-muted">
            Il link scade tra ventiquattro ore. Se non lo trovi, guarda nello
            spam — è lì che finisce quasi sempre il primo messaggio da un
            dominio nuovo.
          </p>
        </div>

        <ResendVerification emailIniziale={inviata} />
      </div>
    );
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
      {/* I due documenti erano nominati ma non raggiungibili da qui. Chiedere
          di accettare qualcosa senza dare modo di leggerlo è un consenso che
          non vale, e sono due link. */}
      <p className="text-xs muted">
        Iscrivendoti accetti i{" "}
        <Link href="/termini" className="link-underline">
          termini di servizio
        </Link>{" "}
        e l&apos;
        <Link href="/privacy" className="link-underline">
          informativa privacy
        </Link>
        .
      </p>

    </form>
  );
}
