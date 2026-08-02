import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puo } from "@/lib/moderazione";
import { PERMISSIONS } from "@/lib/permissions";
import {
  MOTIVI,
  ETICHETTE_TIPO,
  ordinaCoda,
  eUrgente,
  type Motivo,
  type TipoSegnalabile,
} from "@/lib/segnalazioni";
import { DecisioneForm } from "@/components/DecisioneForm";
import { SezioneHeader } from "@/components/dashboard/SezioneHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const dataOra = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ModerazionePage() {
  const session = await auth();

  // 404 e non 403: a chi non ha il ruolo, la pagina non esiste. Un 403
  // confermerebbe che dietro quell'indirizzo c'è qualcosa.
  if (!(await puo(session!.user.id, PERMISSIONS.CONTENT_MODERATE))) notFound();

  const [aperte, chiuse] = await Promise.all([
    prisma.report.findMany({
      where: { status: { in: ["APERTA", "IN_ESAME"] } },
      include: { reporter: { select: { slug: true, name: true } } },
      take: 100,
    }),
    prisma.report.findMany({
      where: { status: { in: ["ACCOLTA", "RESPINTA"] } },
      orderBy: { decisaIl: "desc" },
      take: 20,
      include: { decisaDa: { select: { name: true } } },
    }),
  ]);

  const coda = ordinaCoda(aperte);

  return (
    <div className="max-w-3xl">
      <SezioneHeader
        titolo="Segnalazioni"
        sottotitolo="Ordinate per urgenza e poi per data di arrivo. Ogni decisione richiede una motivazione: viene comunicata a chi ha segnalato e a chi subisce la rimozione, che può contestarla."
        numeri={[
          { label: "In attesa", valore: coda.length },
          { label: "Urgenti", valore: coda.filter((r) => eUrgente(r.reason as Motivo)).length },
          { label: "Decise di recente", valore: chiuse.length },
        ]}
      />

      {coda.length === 0 ? (
        <EmptyState
          title="Nessuna segnalazione in attesa"
          body="La coda è vuota. Le nuove segnalazioni compaiono qui, con le urgenti in cima."
        />
      ) : (
        <ul className="space-y-4">
          {coda.map((r) => {
            const motivo = MOTIVI[r.reason as Motivo];
            const urgente = eUrgente(r.reason as Motivo);

            return (
              <li
                key={r.id}
                className={`card ${urgente ? "border-red-400/40" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className={urgente ? "chip-gold" : "chip"}>
                        {motivo?.label ?? r.reason}
                      </span>
                      <span className="text-fluid-xs text-ink-faint">
                        {ETICHETTE_TIPO[r.targetType as TipoSegnalabile] ?? r.targetType}
                        {r.status === "IN_ESAME" && " · in esame"}
                      </span>
                    </p>

                    {r.targetUrl ? (
                      <Link
                        href={r.targetUrl}
                        target="_blank"
                        className="link-underline mt-2 inline-flex items-center gap-1.5 text-fluid-sm"
                      >
                        {r.targetUrl}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="mt-2 text-fluid-sm text-ink-muted">
                        {/* Post e commenti non hanno una pagina propria:
                            resta l'identificativo, che basta a ritrovarli. */}
                        Identificativo: <code>{r.targetId}</code>
                      </p>
                    )}
                  </div>

                  <time
                    dateTime={r.createdAt.toISOString()}
                    className="shrink-0 text-fluid-xs text-ink-faint"
                  >
                    {dataOra.format(r.createdAt)}
                  </time>
                </div>

                {r.details && (
                  <p className="mt-4 whitespace-pre-line border-l-2 pl-4 text-fluid-sm text-ink-muted">
                    {r.details}
                  </p>
                )}

                <p className="mt-3 text-fluid-xs text-ink-faint">
                  Segnalata da{" "}
                  {r.reporter ? (
                    <Link href={`/artisti/${r.reporter.slug}`} className="link-underline">
                      {r.reporter.name}
                    </Link>
                  ) : (
                    "un visitatore non registrato"
                  )}
                  {r.reporterEmail && ` · riscontro a ${r.reporterEmail}`}
                </p>

                <DecisioneForm id={r.id} stato={r.status} />
              </li>
            );
          })}
        </ul>
      )}

      {chiuse.length > 0 && (
        <section className="mt-14">
          <h2 className="text-fluid-lg font-bold">Decise di recente</h2>
          <p className="mt-2 text-fluid-sm text-ink-muted">
            Restano visibili perché una decisione si possa rivedere, e perché
            chi modera dopo veda con che criterio si è deciso prima.
          </p>
          <ul className="mt-5 space-y-3">
            {chiuse.map((r) => (
              <li key={r.id} className="card">
                <p className="flex flex-wrap items-center gap-2 text-fluid-sm">
                  <span className={r.status === "ACCOLTA" ? "chip-accent" : "chip"}>
                    {r.status === "ACCOLTA" ? "Accolta" : "Respinta"}
                  </span>
                  <span className="text-ink-muted">
                    {MOTIVI[r.reason as Motivo]?.label ?? r.reason}
                  </span>
                  <span className="text-fluid-xs text-ink-faint">
                    {r.decisaIl && dataOra.format(r.decisaIl)}
                    {r.decisaDa && ` · ${r.decisaDa.name}`}
                  </span>
                </p>
                {r.decisione && (
                  <p className="mt-2 text-fluid-sm text-ink-muted">{r.decisione}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
