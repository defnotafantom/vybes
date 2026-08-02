import Link from "next/link";
import { TrendingUp } from "lucide-react";

/**
 * Come si costruisce la propria posizione nella directory.
 *
 * La reputazione decide l'ordine in cui i profili compaiono in `/artisti`:
 * è la cosa più preziosa che il prodotto assegna, e fino a ieri era un numero
 * senza spiegazione accanto alla parola «Reputazione».
 *
 * Un punteggio che decide la tua visibilità e non dice come si ottiene è
 * indistinguibile dall'arbitrio. E siccome ogni voce ha un tetto e misura uno
 * stato — non un conteggio di azioni — dirlo per intero non apre a nessuno
 * sfruttamento: l'unico modo di alzarlo è fare davvero le cose che rendono un
 * profilo affidabile.
 *
 * Le voci mancanti vengono prima di quelle già ottenute. Le seconde sono una
 * conferma, le prime sono l'unica parte su cui si può agire.
 */
export function SchedaReputazione({
  voci,
  totale,
  massimo,
}: {
  voci: { label: string; punti: number; max: number; come: string }[];
  totale: number;
  massimo: number;
}) {
  const mancanti = voci.filter((v) => v.punti < v.max);
  const ottenute = voci.filter((v) => v.punti >= v.max);
  const percento = Math.round((totale / massimo) * 100);

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-fluid-lg font-bold">
            <TrendingUp className="h-5 w-5 text-accent-400" aria-hidden="true" />
            Reputazione
          </h2>
          <p className="mt-2 max-w-xl text-fluid-sm text-ink-muted">
            Decide in che ordine compari nella directory pubblica. Non si guadagna
            usando il sito: si calcola da quello che rende un profilo una scelta
            sicura per chi cerca.
          </p>
        </div>

        <p className="text-right">
          <span className="text-fluid-2xl font-bold tabular-nums">{totale}</span>
          <span className="text-fluid-sm text-ink-faint">/{massimo}</span>
        </p>
      </div>

      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={percento}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Reputazione"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-[width] duration-700 ease-out"
          style={{ width: `${percento}%` }}
        />
      </div>

      {mancanti.length > 0 && (
        <div className="mt-6">
          <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">
            Cosa la fa salire
          </p>
          <ul className="mt-3 space-y-3">
            {mancanti.map((v) => (
              <li key={v.label} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-md bg-brand-500/10 px-1.5 py-0.5 text-fluid-xs font-bold tabular-nums text-brand-300">
                  +{v.max - v.punti}
                </span>
                <span className="min-w-0">
                  <span className="block text-fluid-sm font-medium">{v.label}</span>
                  <span className="block text-fluid-xs text-ink-muted">{v.come}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/profilo" className="btn-ghost mt-5 inline-flex">
            Vai al profilo
          </Link>
        </div>
      )}

      {ottenute.length > 0 && (
        <div className="mt-6 border-t pt-5">
          <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Già ottenuto</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ottenute.map((v) => (
              <li key={v.label} className="chip-accent">
                {v.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
