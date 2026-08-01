import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

/**
 * Intestazione delle pagine elenco.
 *
 * Le tre directory — artisti, ingaggi, città — avevano tre intestazioni
 * scritte a mano, simili ma non uguali: margini diversi, titoli con classi
 * diverse, briciole di pane a volte sopra e a volte sotto. Il visitatore che
 * passa da una all'altra percepiva tre pagine di siti diversi.
 *
 * Qui la struttura è una sola. Le differenze restano nei contenuti, non nel
 * modo in cui sono disposti.
 *
 * Resta un componente server: nessuno stato, nessun gestore di eventi.
 * L'unica cosa che si muove è lo sfondo, e lo muove il CSS.
 */
export function PageHero({
  breadcrumbs,
  eyebrow,
  title,
  highlight,
  lead,
  stats,
  filters,
}: {
  breadcrumbs: { name: string; path: string }[];
  eyebrow: string;
  title: string;
  /** Coda del titolo resa con il gradiente del marchio. */
  highlight?: string;
  lead: ReactNode;
  stats?: { label: string; value: ReactNode }[];
  filters?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b">
      {/* Due strati decorativi: le macchie di colore in deriva e la griglia
          tecnica che sfuma. Entrambi aria-hidden — non comunicano nulla. */}
      <div className="mesh-hero opacity-50" aria-hidden="true" />
      <div className="grid-lines absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

      <div className="container-page pb-12 pt-8">
        <Breadcrumbs items={breadcrumbs} />

        <p className="eyebrow animate-fade-up">{eyebrow}</p>

        <h1
          className="mt-3 max-w-4xl text-fluid-3xl animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          {title}
          {highlight && (
            <>
              {" "}
              <span className="text-gradient">{highlight}</span>
            </>
          )}
        </h1>

        <p
          className="mt-5 max-w-2xl text-fluid-base leading-relaxed text-ink-muted animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          {lead}
        </p>

        {stats && stats.length > 0 && (
          <dl
            className="mt-10 flex flex-wrap gap-x-10 gap-y-5 animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                {/* tabular-nums: le cifre hanno tutte la stessa larghezza,
                    così il numero non balla quando la revalidazione lo
                    aggiorna da 9 a 10. */}
                <dd className="text-fluid-2xl font-bold tabular-nums">{s.value}</dd>
                <dt className="mt-0.5 text-fluid-xs uppercase tracking-wider text-ink-faint">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>
        )}

        {filters && (
          <div className="mt-10 animate-fade-up" style={{ animationDelay: "240ms" }}>
            {filters}
          </div>
        )}
      </div>
    </header>
  );
}
