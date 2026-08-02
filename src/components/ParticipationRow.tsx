"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PARTICIPATION_STATUS } from "@/lib/constants";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { MessageSquare } from "lucide-react";
import { reputazioneMassima } from "@/lib/reputazione";

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
          <Link href={`/artisti/${participation.user.slug}`} className="font-medium hover:text-brand-600">
            {participation.user.name}
          </Link>
          <p className="text-sm muted">
            {[participation.user.headline, participation.user.city].filter(Boolean).join(" · ")}
          </p>
          <p className="text-xs muted">
            {/* Il livello era la prima cosa che un organizzatore leggeva di
                un candidato, e misura quanto quella persona usa il sito.
                Resta la reputazione, con la sua scala: da sola non basta per
                scegliere, ma almeno è una risposta alla domanda giusta. */}
            Reputazione {participation.user.reputation}/{reputazioneMassima()} · candidatura del{" "}
            {new Date(participation.createdAt).toLocaleDateString("it-IT")}
          </p>
          {participation.message && (
            <blockquote className="mt-3 border-l-2 pl-3 text-sm muted">
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
            <Badge tone={status === "ACCEPTED" ? "green" : status === "REJECTED" ? "red" : "amber"}>
              {PARTICIPATION_STATUS[status as keyof typeof PARTICIPATION_STATUS] ?? status}
            </Badge>

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
