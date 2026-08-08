"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Lock, Sparkles } from "lucide-react";
import { SPICCHI, TOTALE_PESI, COME_SI_APRE } from "@/lib/ruota";

type Stato = "pronta" | "chiusa" | "gia-girata";
type Esito = { premio: string; etichetta: string; monete: number; nuovoOggetto: boolean };

/**
 * La ruota giornaliera.
 *
 * ── Perché l'animazione dura tre secondi e non uno ──
 *
 * Perché l'attesa **è** il premio. Un risultato che compare all'istante vale
 * meno dello stesso risultato dopo tre secondi di rallentamento, ed è l'unico
 * punto del sito in cui far aspettare qualcuno è un servizio invece che un
 * difetto. Oltre i quattro secondi si ribalta e diventa lentezza.
 *
 * ── Perché l'esito è già deciso quando la ruota parte ──
 *
 * La risposta del server arriva prima che l'animazione cominci: la ruota non
 * «estrae», mostra. Se la rete cade a metà giro, il premio è già registrato e
 * ricaricando lo si ritrova — invece di perdersi in un'animazione che non
 * corrisponde a niente.
 *
 * ── `prefers-reduced-motion` ──
 *
 * Chi ha disattivato le animazioni ha spesso una ragione medica: una ruota che
 * gira per tre secondi è esattamente il tipo di movimento che scatena un
 * disturbo vestibolare. In quel caso il risultato compare e basta, senza che
 * si perda niente di ciò che conta.
 */
export function Ruota({ stato, premioDiOggi }: { stato: Stato; premioDiOggi: string | null }) {
  const router = useRouter();
  const [esito, setEsito] = useState<Esito | null>(null);
  const [gira, setGira] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const giaFatta = stato === "gia-girata";
  const mostrato = esito?.etichetta ?? premioDiOggi;

  async function tira() {
    setErrore(null);
    try {
      const res = await fetch("/api/ruota", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrore(json.error ?? "Non è andata.");
        return;
      }

      const menoMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (menoMovimento) {
        setEsito(json.data);
        router.refresh();
        return;
      }

      setGira(true);
      window.setTimeout(() => {
        setGira(false);
        setEsito(json.data);
        router.refresh();
      }, 3000);
    } catch {
      setErrore("Connessione persa. Riprova.");
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-fluid-lg font-bold">
            <Sparkles className="h-5 w-5 text-gold-400" aria-hidden="true" />
            La ruota di oggi
          </h2>
          <p className="mt-1 text-fluid-sm text-ink-muted">
            Un giro al giorno. Nessuno spicchio è vuoto: il minimo è dieci
            monete, il massimo duecento.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="mx-auto">
          <Disco gira={gira} />
        </div>

        <div className="min-w-0">
          {giaFatta || esito ? (
            <div>
              <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">
                {esito ? "Hai vinto" : "Oggi hai vinto"}
              </p>
              <p className="mt-2 text-fluid-2xl font-bold">{mostrato ?? "—"}</p>
              {esito?.nuovoOggetto && (
                <p className="mt-2 text-fluid-sm text-brand-600 dark:text-brand-400">
                  È tuo: lo trovi qui sotto, pronto da indossare.
                </p>
              )}
              {esito && !esito.nuovoOggetto && esito.monete > 0 && esito.premio === "cornice" && (
                /* Vincere un oggetto che si ha già è un premio vuoto, e i premi
                   vuoti insegnano che girare non vale la pena: si accredita
                   l'equivalente e lo si dice, invece di far finta di niente. */
                <p className="mt-2 text-fluid-sm text-ink-muted">
                  Ce l&apos;avevi già: ecco {esito.monete} monete al suo posto.
                </p>
              )}
              <p className="mt-4 text-fluid-xs text-ink-faint">La ruota torna domani.</p>
            </div>
          ) : stato === "pronta" ? (
            <div>
              <p className="text-fluid-sm text-ink-muted">
                La ruota è carica. Un giro, e vediamo.
              </p>
              <button
                type="button"
                onClick={tira}
                disabled={gira}
                className="btn-primary mt-4 min-h-12 w-full sm:w-auto"
              >
                {gira ? "Gira…" : "Gira la ruota"}
              </button>
            </div>
          ) : (
            <div>
              {/* ── Perché non gira gratis, detto sul posto ──
                  Un pulsante disattivato senza spiegazione si legge come un
                  guasto. Qui la ruota chiusa elenca cosa la apre, con i
                  collegamenti: la più breve di quelle azioni dura due minuti. */}
              <p className="flex items-center gap-2 text-fluid-sm font-medium">
                <Lock className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                Si apre dopo che hai fatto qualcosa, oggi
              </p>
              <p className="mt-2 text-fluid-xs text-ink-muted">
                Non è un capriccio: una ruota che gira solo per essere entrati
                premia chi ha tempo. Basta una di queste.
              </p>
              <ul className="mt-4 space-y-2">
                {COME_SI_APRE.map((v) => (
                  <li key={v.href}>
                    <Link
                      href={v.href}
                      className="text-fluid-sm text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {v.testo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {errore && (
            <p role="alert" className="mt-4 text-fluid-sm text-esito-no">
              {errore}
            </p>
          )}
        </div>
      </div>

      {/* Cosa c'è dentro, sempre visibile: una ruota che non mostra i premi
          chiede fiducia senza darne motivo, ed è anche l'unica difesa contro
          il sospetto — legittimo — che il premio grosso non esista. */}
      <ul className="mt-6 flex flex-wrap gap-2 border-t pt-5">
        {SPICCHI.map((p) => (
          <li
            key={p.chiave}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-fluid-xs"
            title={`${Math.round((p.peso / TOTALE_PESI) * 100)}% di probabilità`}
          >
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: p.tinta }}
            />
            {p.etichetta}
            <span className="tabular-nums text-ink-faint">
              {Math.round((p.peso / TOTALE_PESI) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Il disco.
 *
 * Un `conic-gradient` costruito dai pesi: gli spicchi hanno la larghezza della
 * loro probabilità, quindi la ruota **dice la verità** guardandola. Disegnarli
 * tutti uguali sarebbe più bello e sarebbe una bugia — chi vede sei spicchi
 * identici si aspetta una possibilità su sei di prendere il massimo, e ne ha
 * una su sedici.
 */
function Disco({ gira }: { gira: boolean }) {
  let da = 0;
  const fette = SPICCHI.map((p) => {
    const a = da + (p.peso / TOTALE_PESI) * 360;
    const fetta = `${p.tinta} ${da}deg ${a}deg`;
    da = a;
    return fetta;
  });

  return (
    <div className="relative h-40 w-40">
      {/* L'indicatore sta fermo e gira il disco: il contrario — disco fermo e
          lancetta che ruota — non si legge, perché l'occhio segue la cosa
          grande. */}
      <span
        aria-hidden="true"
        className="absolute -top-1 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-gold-400"
      />
      <div
        role="img"
        aria-label="Ruota dei premi"
        className="h-40 w-40 rounded-full border-4 border-surface shadow-float"
        style={{
          background: `conic-gradient(${fette.join(", ")})`,
          // Cinque giri completi più un po': il numero esatto non conta,
          // conta che finisca sempre allo stesso posto — l'esito lo ha già
          // deciso il server, e far combaciare l'angolo con lo spicchio
          // vincente sarebbe una bugia elaborata che nessuno verifica.
          transform: gira ? "rotate(1980deg)" : "rotate(0deg)",
          transition: gira ? "transform 3s cubic-bezier(0.15, 0.9, 0.2, 1)" : "none",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface shadow-float"
      >
        <Coins className="h-4 w-4 text-gold-400" />
      </span>
    </div>
  );
}
