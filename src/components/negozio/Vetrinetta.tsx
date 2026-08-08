"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Check, Lock } from "lucide-react";
import { RARITA, SLOT, type Cosmetico } from "@/lib/cosmetici";

type Voce = Cosmetico & { posseduto: boolean; indossato: boolean };

/**
 * Il negozio, lato client.
 *
 * ── Perché tutto in una griglia invece che diviso per slot ──
 *
 * Con otto oggetti, cinque intestazioni di sezione lascerebbero righe da un
 * elemento: più titoli che contenuto. Lo slot è scritto su ogni scheda, che a
 * questa scala basta. Quando il catalogo crescerà, la divisione avrà senso —
 * e sarà il momento di farla, non prima.
 *
 * ── Perché ciò che non si compra sta in mezzo agli altri ──
 *
 * La tentazione era relegarlo in fondo, «tanto non è acquistabile». Ma è
 * esattamente il contrario: è la roba che vale di più, e vederla accanto a
 * quello che si può prendere subito è ciò che la rende desiderabile. Un
 * catalogo in cui tutto è comprabile non lascia emergere nessuno.
 */
export function Vetrinetta({ voci, saldo: saldoIniziale }: { voci: Voce[]; saldo: number }) {
  const router = useRouter();
  const [saldo, setSaldo] = useState(saldoIniziale);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState<{ id: string; testo: string } | null>(null);

  async function agisci(azione: "acquista" | "indossa", id: string) {
    setInCorso(id);
    setErrore(null);
    try {
      const res = await fetch("/api/negozio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ azione, cosmetico: id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrore({ id, testo: json.error ?? "Non è andata." });
        return;
      }
      // Il saldo arriva dal server e non si decrementa qui: sottraendolo a mano
      // il numero mostrato divergerebbe da quello vero al primo acquisto
      // fallito a metà, e nessuno saprebbe quale credere.
      if (typeof json.data?.saldo === "number") setSaldo(json.data.saldo);
      router.refresh();
    } catch {
      setErrore({ id, testo: "Connessione persa. Riprova." });
    } finally {
      setInCorso(null);
    }
  }

  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Il tuo saldo</p>
          <p className="mt-1 flex items-center gap-2 text-fluid-2xl font-bold tabular-nums">
            <Coins className="h-5 w-5 text-gold-400" aria-hidden="true" />
            {saldo}
          </p>
        </div>
        <p className="max-w-sm text-fluid-xs text-ink-muted">
          Le monete si guadagnano riscuotendo gli obiettivi e giocando
          a&nbsp;«L&apos;orecchio». Comprano solo estetica: la posizione negli
          elenchi non è in vendita, e non lo sarà.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {voci.map((c) => {
          const r = RARITA[c.rarita];
          const acquistabile = c.prezzo !== null && !c.posseduto;
          const troppo = c.prezzo !== null && c.prezzo > saldo;
          const mio = c.posseduto;

          return (
            <li
              key={c.id}
              className={`card flex flex-col ${c.indossato ? "border-brand-500/60" : ""}`}
            >
              {/* L'anteprima è il colore stesso dell'oggetto: comprare una
                  cornice senza vederla è comprare una parola. */}
              <span
                aria-hidden="true"
                className="mb-4 block h-16 rounded-lg border border-white/10"
                style={{
                  background:
                    c.slot === "titolo" || c.slot === "emblema"
                      ? "linear-gradient(135deg, rgb(139 92 246 / .25), rgb(6 182 212 / .15))"
                      : c.reso.startsWith("#")
                        ? `linear-gradient(135deg, ${c.reso}, transparent)`
                        : "linear-gradient(135deg, rgb(139 92 246 / .25), transparent)",
                }}
              />

              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{c.nome}</p>
                <span className={`shrink-0 text-fluid-xs font-bold ${r.tinta}`}>{r.label}</span>
              </div>
              <p className="mt-0.5 text-fluid-xs text-ink-faint">{SLOT[c.slot].label}</p>

              {c.sblocco && <p className="mt-3 text-fluid-xs text-ink-muted">{c.sblocco}</p>}

              {errore?.id === c.id && (
                <p role="alert" className="mt-3 text-fluid-xs text-esito-no">
                  {errore.testo}
                </p>
              )}

              {/* `mt-auto` incolla il comando al fondo: senza, in una griglia
                  di schede di altezza diversa i pulsanti finiscono a quote
                  diverse e l'occhio non trova più la fila. */}
              <div className="mt-auto pt-5">
                {mio ? (
                  <button
                    type="button"
                    onClick={() => agisci("indossa", c.id)}
                    disabled={inCorso === c.id}
                    className={`min-h-11 w-full ${c.indossato ? "btn-ghost" : "btn-primary"}`}
                  >
                    {c.indossato && <Check className="h-4 w-4" aria-hidden="true" />}
                    {inCorso === c.id ? "…" : c.indossato ? "Indossato — togli" : "Indossa"}
                  </button>
                ) : acquistabile ? (
                  <button
                    type="button"
                    onClick={() => agisci("acquista", c.id)}
                    disabled={inCorso === c.id || troppo}
                    className="btn-primary min-h-11 w-full disabled:opacity-45"
                    /* Il pulsante disabilitato non spiega da solo perché: il
                       titolo lo dice a chi ci passa sopra, e il testo sotto a
                       chi non usa il mouse. */
                    title={troppo ? `Ti servono ${c.prezzo} monete` : undefined}
                  >
                    <Coins className="h-4 w-4" aria-hidden="true" />
                    {inCorso === c.id ? "…" : `${c.prezzo}`}
                  </button>
                ) : (
                  <p className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed text-fluid-xs text-ink-faint">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    Non in vendita
                  </p>
                )}

                {troppo && !mio && (
                  <p className="mt-2 text-center text-fluid-xs text-ink-faint">
                    Ti mancano {c.prezzo! - saldo}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
