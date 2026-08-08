"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatoCandidatura } from "@/components/ui/StatoCandidatura";
import { MessageSquare } from "lucide-react";
import { reputazioneMassima } from "@/lib/reputazione";
import { dataBreve } from "@/lib/date";

type Participation = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  user: {
    slug: string;
    name: string;
    headline: string | null;
    city: string | null;
    reputation: number;
  };
};

export function ParticipationRow({
  participation,
  actionable,
}: {
  participation: Participation;
  actionable: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(participation.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(next: "ACCEPTED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/participations/${participation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Operazione non riuscita");
        return;
      }
      setStatus(next);
      router.refresh();
    });
  }

  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Avatar name={participation.user.name} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/artisti/${participation.user.slug}`}
              className="text-fluid-sm font-semibold transition-colors hover:text-brand-600 dark:hover:text-brand-400"
            >
              {participation.user.name}
            </Link>

            {(participation.user.headline || participation.user.city) && (
              <p className="mt-0.5 truncate text-fluid-sm text-ink-muted">
                {[participation.user.headline, participation.user.city].filter(Boolean).join(" · ")}
              </p>
            )}

            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-fluid-xs text-ink-faint">
              {/* Il livello era la prima cosa che un organizzatore leggeva di
                  un candidato, e misura quanto quella persona usa il sito.
                  Resta la reputazione, con la sua scala: da sola non basta per
                  scegliere, ma almeno è una risposta alla domanda giusta. */}
              <span className="tabular-nums">
                Reputazione {participation.user.reputation}/{reputazioneMassima("ARTIST")}
              </span>
              <span aria-hidden="true">·</span>
              <span>candidatura del {dataBreve(participation.createdAt)}</span>
            </p>

            {/* Il messaggio è l'unica cosa che il candidato ha scritto di suo
                pugno, ed era reso come nota a margine sotto due righe di
                metadati. È la parte su cui si decide: va letta come una voce,
                non come un attributo. */}
            {participation.message && (
              <blockquote className="mt-3 border-l-2 border-brand-500/40 pl-3 text-fluid-sm text-ink">
                {participation.message}
              </blockquote>
            )}
          </div>
        </div>

        {actionable && status === "PENDING" ? (
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={pending} onClick={() => decide("ACCEPTED")}>
              Accetta
            </button>
            <button type="button" className="btn-ghost" disabled={pending} onClick={() => decide("REJECTED")}>
              Rifiuta
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatoCandidatura stato={status} />

            {/* Accettare qualcuno e poi non avere un modo di scrivergli è il
                punto in cui il prodotto si fermava. Da qui in avanti la
                piattaforma non serve più a trovarsi ma a mettersi d'accordo:
                data, orario, compenso. Senza questo collegamento bisognava
                aprire il profilo pubblico e ricominciare da lì. */}
            {status === "ACCEPTED" && (
              <Link
                href={`/dashboard/messaggi/nuovo?a=${participation.user.slug}`}
                className="btn-ghost text-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                Scrivi a {participation.user.name.split(" ")[0]}
              </Link>
            )}
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  );
}
