"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, X, Coins, Trophy, RotateCcw } from "lucide-react";
import { SfondoLavoro } from "@/components/AnteprimaLavoro";
import { conta } from "@/lib/testo";

type Opzione = { slug: string; nome: string };
type Domanda = {
  lavoro: { slug: string; titolo: string; descrizione: string | null; tipo: string; mediaUrl: string };
  opzioni: Opzione[];
};
type Esito = {
  punteggio: number;
  corrette: number;
  monete: number;
  soluzioni: { lavoro: string; giusta: string }[];
};

/**
 * «L'orecchio»: la partita.
 *
 * ── Perché non si sa subito se si è indovinato ──
 *
 * La correzione arriva alla fine, tutta insieme, e la ragione è che le
 * soluzioni **non escono dal server** finché la partita non è chiusa (vedi
 * `orecchio-server.ts`). Dirlo dopo ogni domanda richiederebbe di spedirle in
 * anticipo, e a quel punto la classifica la vincerebbe chi apre gli strumenti
 * di sviluppo.
 *
 * Il costo è una gratificazione differita di due minuti. In cambio, il numero
 * accanto al proprio nome significa qualcosa per tutti — compresi quelli che
 * non sanno nemmeno che si potrebbe barare.
 *
 * ── Perché si può tornare indietro ──
 *
 * Finché non si consegna, le risposte si cambiano. Non c'è nessuna ragione per
 * bloccare una scelta se la correzione non è ancora avvenuta: bloccarla
 * sarebbe una finta pressione, e su un gioco che dura due minuti l'unico
 * effetto sarebbe far chiudere la pagina a chi ha premuto per sbaglio.
 */
export function Gioco({ giorno, domande, massimo }: { giorno: number; domande: Domanda[]; massimo: number }) {
  const [indice, setIndice] = useState(0);
  const [scelte, setScelte] = useState<(string | null)[]>(() => domande.map(() => null));
  const [esito, setEsito] = useState<Esito | null>(null);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const d = domande[indice];
  const ultima = indice === domande.length - 1;
  const risposte = scelte.filter(Boolean).length;

  function scegli(slug: string) {
    setScelte((s) => s.map((v, i) => (i === indice ? slug : v)));
  }

  async function consegna() {
    setInvio(true);
    setErrore(null);
    try {
      const res = await fetch("/api/orecchio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giorno, scelte }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrore(json.error ?? "Non siamo riusciti a registrare la partita.");
        return;
      }
      setEsito(json.data);
    } catch {
      setErrore("Connessione persa. Le risposte sono ancora qui: riprova.");
    } finally {
      setInvio(false);
    }
  }

  if (esito) return <Risultato domande={domande} scelte={scelte} esito={esito} massimo={massimo} />;

  return (
    <div className="card">
      {/* Il progresso prima di tutto: senza, non si sa se mancano due domande
          o venti, e chi non lo sa smette a metà. */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">
          Domanda {indice + 1} di {domande.length}
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {domande.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                scelte[i] ? "bg-brand-500" : i === indice ? "bg-brand-500/40" : "bg-surface-sunken"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="mt-5 text-fluid-lg font-bold">Di chi è questo lavoro?</h2>

      <div className="relative mt-5 min-h-40 overflow-hidden rounded-xl bg-brand-50 dark:bg-white/5">
        <SfondoLavoro tipo={d.lavoro.tipo} grande />
        {d.lavoro.tipo === "image" && (
          <Image
            src={d.lavoro.mediaUrl}
            alt={d.lavoro.titolo}
            width={900}
            height={600}
            className="relative h-auto w-full object-cover"
          />
        )}
        {d.lavoro.tipo === "video" && (
          <video
            controls
            preload="metadata"
            className="relative w-full"
            aria-label={d.lavoro.titolo}
            /* La chiave forza React a ricreare l'elemento cambiando domanda:
               senza, il browser tiene la sorgente precedente e si continua ad
               ascoltare il brano di prima sotto il titolo nuovo. */
            key={d.lavoro.slug}
          >
            <source src={d.lavoro.mediaUrl} />
          </video>
        )}
        {d.lavoro.tipo === "audio" && (
          <audio
            controls
            preload="metadata"
            className="relative w-full p-6"
            aria-label={d.lavoro.titolo}
            key={d.lavoro.slug}
          >
            <source src={d.lavoro.mediaUrl} />
          </audio>
        )}
      </div>

      <p className="mt-4 text-fluid-base font-semibold">{d.lavoro.titolo}</p>
      {d.lavoro.descrizione && (
        <p className="mt-1 line-clamp-3 text-fluid-sm text-ink-muted">{d.lavoro.descrizione}</p>
      )}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {d.opzioni.map((o) => {
          const scelta = scelte[indice] === o.slug;
          return (
            <li key={o.slug}>
              <button
                type="button"
                onClick={() => scegli(o.slug)}
                aria-pressed={scelta}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left text-fluid-sm font-medium transition-colors ${
                  scelta
                    ? "border-brand-500 bg-brand-500/12 text-ink"
                    : "border-line text-ink-muted hover:border-brand-400/50 hover:text-ink"
                }`}
              >
                {o.nome}
                {scelta && <Check className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>

      {errore && (
        <p role="alert" className="mt-4 text-fluid-sm text-esito-no">
          {errore}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <button
          type="button"
          onClick={() => setIndice((i) => Math.max(0, i - 1))}
          disabled={indice === 0}
          className="btn-ghost min-h-11 disabled:opacity-40"
        >
          Indietro
        </button>

        {ultima ? (
          <button type="button" onClick={consegna} disabled={invio} className="btn-primary min-h-11">
            {invio ? "Correggo…" : "Consegna"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndice((i) => i + 1)}
            className="btn-primary min-h-11"
          >
            Avanti
          </button>
        )}
      </div>

      {/* Saltare è legittimo, e va detto: senza, si tira a indovinare — e una
          risposta a caso non fa imparare nessun nome, che è il motivo per cui
          questo gioco esiste. */}
      {ultima && risposte < domande.length && (
        <p className="mt-3 text-fluid-xs text-ink-faint">
          {conta(domande.length - risposte, "domanda senza risposta", "domande senza risposta")}.
          Puoi consegnare comunque: valgono come sbagliate, non tolgono punti.
        </p>
      )}
    </div>
  );
}

/**
 * Il risultato, con le soluzioni.
 *
 * È qui che il gioco fa il suo lavoro vero: ogni riga porta il nome di un
 * artista e il collegamento al suo profilo. Chi ha appena ascoltato cinque
 * brani ha esattamente adesso il massimo interesse a sapere chi li ha fatti —
 * fra dieci minuti non più.
 */
function Risultato({
  domande,
  scelte,
  esito,
  massimo,
}: {
  domande: Domanda[];
  scelte: (string | null)[];
  esito: Esito;
  massimo: number;
}) {
  const nomeDi = (slug: string) =>
    domande.flatMap((d) => d.opzioni).find((o) => o.slug === slug)?.nome ?? slug;

  return (
    <div className="space-y-6">
      <div className="card text-center">
        <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Turno di oggi</p>
        <p className="mt-3">
          <span className="text-fluid-3xl font-bold tabular-nums">{esito.punteggio}</span>
          <span className="text-fluid-base text-ink-faint">/{massimo}</span>
        </p>
        <p className="mt-2 text-fluid-sm text-ink-muted">
          {esito.corrette} su {domande.length} indovinate
        </p>

        {esito.monete > 0 && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-500/12 px-4 py-2 text-fluid-sm font-semibold text-gold-400">
            <Coins className="h-4 w-4" aria-hidden="true" />+{esito.monete} monete
          </p>
        )}

        <p className="mt-5 flex items-center justify-center gap-2 text-fluid-xs text-ink-faint">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Il turno cambia domani, ed è lo stesso per tutti.
        </p>
      </div>

      <section className="card">
        <h2 className="flex items-center gap-2 text-fluid-lg font-bold">
          <Trophy className="h-5 w-5 text-gold-400" aria-hidden="true" />
          Chi erano
        </h2>
        <p className="mt-1 text-fluid-sm text-ink-muted">
          Cinque persone che in questo momento cercano un ingaggio. Se qualcosa
          ti è piaciuto, il profilo è a un clic.
        </p>

        <ul className="mt-5 space-y-3">
          {domande.map((d, i) => {
            const giusta = esito.soluzioni.find((s) => s.lavoro === d.lavoro.slug)?.giusta ?? "";
            const indovinata = scelte[i] === giusta;
            return (
              <li key={d.lavoro.slug} className="flex flex-wrap items-center gap-3 border-t pt-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    indovinata ? "bg-esito-si-tinta/15 text-esito-si" : "bg-esito-no-tinta/15 text-esito-no"
                  }`}
                  aria-label={indovinata ? "indovinata" : "sbagliata"}
                >
                  {indovinata ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <Link
                    href={`/portfolio/${d.lavoro.slug}`}
                    className="text-fluid-sm font-medium transition-colors hover:text-brand-600"
                  >
                    {d.lavoro.titolo}
                  </Link>
                  <span className="block text-fluid-xs text-ink-muted">
                    di{" "}
                    <Link href={`/artisti/${giusta}`} className="text-brand-600 hover:underline">
                      {nomeDi(giusta)}
                    </Link>
                    {!indovinata && scelte[i] && <> — tu avevi detto {nomeDi(scelte[i]!)}</>}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
