"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";

export type QuestVista = {
  key: string;
  titolo: string;
  descrizione: string;
  xp: number;
  target: number;
  current: number;
  completata: boolean;
};

export type Livello = { level: number; current: number; needed: number; percent: number };

/**
 * Le quest, con la ricompensa che si incassa.
 *
 * ── Perché livello ed elenco stanno nello stesso componente ──
 *
 * Perché l'animazione li lega: il numero parte dal pulsante di una quest e
 * atterra sulla barra del livello. Servono le posizioni di entrambi nello
 * stesso momento, e due componenti separati costringerebbero a farle passare
 * per un contesto o per il DOM globale — cioè a rendere fragile una cosa che
 * altrimenti è due `ref`.
 *
 * ── Cosa fa l'animazione, e perché non è decorazione ──
 *
 * Rende visibile una relazione di causa: **questo** sforzo è diventato
 * **quel** progresso. È l'unica informazione che il numero da solo non dà, e
 * il motivo per cui prima l'XP passava inosservato — arrivava mentre si stava
 * facendo altro, su una pagina che non si stava guardando.
 *
 * Dura ottocento millisecondi in tutto. Oltre il secondo un'animazione smette
 * di essere una risposta e diventa un'attesa, e la si comincia a saltare.
 *
 * ── Chi non vuole animazioni ──
 *
 * `prefers-reduced-motion` non è una preferenza estetica: per chi soffre di
 * disturbi vestibolari il movimento sullo schermo provoca nausea reale.
 * In quel caso il numero non vola: la barra si aggiorna e la quest esce, con
 * lo stesso esito e nessun movimento.
 */
export function ElencoQuest({
  iniziali,
  livelloIniziale,
}: {
  iniziali: QuestVista[];
  livelloIniziale: Livello;
}) {
  const [quests, setQuests] = useState(iniziali);
  const [livello, setLivello] = useState(livelloIniziale);
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [uscita, setUscita] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  /** Il numero in volo: coordinate di partenza e spostamento verso la barra. */
  const [volo, setVolo] = useState<{ x: number; y: number; dx: number; dy: number; xp: number } | null>(null);
  const [pulsa, setPulsa] = useState(false);

  const barra = useRef<HTMLDivElement>(null);

  const menoMovimento = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const riscuoti = useCallback(
    async (q: QuestVista, bottone: HTMLButtonElement) => {
      if (inCorso) return;
      setInCorso(q.key);
      setErrore(null);

      const res = await fetch(`/api/quest/${q.key}/riscuoti`, { method: "POST" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrore(json.error ?? "Non è stato possibile riscuotere");
        setInCorso(null);
        return;
      }

      const nuovoLivello: Livello = json.data.livello;

      const concludi = () => {
        setLivello(nuovoLivello);
        setPulsa(true);
        window.setTimeout(() => setPulsa(false), 600);
        // Prima si chiude, poi sparisce: togliere la scheda di colpo fa
        // saltare in su tutto l'elenco, e chi guardava perde il punto.
        setUscita(q.key);
        window.setTimeout(() => {
          setQuests((p) => p.filter((x) => x.key !== q.key));
          setUscita(null);
          setInCorso(null);
        }, 320);
      };

      const meta = barra.current?.getBoundingClientRect();
      if (!meta || menoMovimento()) {
        concludi();
        return;
      }

      const da = bottone.getBoundingClientRect();
      setVolo({
        x: da.left + da.width / 2,
        y: da.top + da.height / 2,
        dx: meta.left + meta.width / 2 - (da.left + da.width / 2),
        dy: meta.top + meta.height / 2 - (da.top + da.height / 2),
        xp: q.xp,
      });

      window.setTimeout(() => {
        setVolo(null);
        concludi();
      }, 620);
    },
    [inCorso]
  );

  // Prima quelle da riscuotere: sono le uniche su cui c'è qualcosa da fare, e
  // in fondo a un elenco un pulsante non lo trova nessuno.
  const ordinate = [...quests].sort((a, b) => Number(b.completata) - Number(a.completata));
  const daRiscuotere = quests.filter((q) => q.completata).length;

  return (
    <>
      {/* ── Il livello ── */}
      <div className="card mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Livello</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-fluid-3xl font-bold tabular-nums transition-transform duration-300 ${
                  pulsa ? "scale-110 text-brand-500" : ""
                }`}
              >
                {livello.level}
              </span>
              <span className="text-fluid-sm text-ink-muted">
                {livello.current}/{livello.needed} XP al {livello.level + 1}
              </span>
            </p>
          </div>
          <p className="max-w-sm text-fluid-xs text-ink-muted">
            Il livello è un progresso tuo e resta qui: non decide la tua
            posizione nella directory. Quella la determina la reputazione, che
            si calcola da altro.
          </p>
        </div>

        <div
          ref={barra}
          className={`mt-5 h-2.5 overflow-hidden rounded-full bg-surface-sunken transition-shadow duration-300 ${
            pulsa ? "shadow-[0_0_0_4px_rgb(var(--brand-500)/0.25)]" : ""
          }`}
          role="progressbar"
          aria-valuenow={livello.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso verso il livello ${livello.level + 1}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-[width] duration-700 ease-out"
            style={{ width: `${livello.percent}%` }}
          />
        </div>
      </div>

      {daRiscuotere > 0 && (
        <p role="status" className="mb-4 text-fluid-sm text-ink-muted">
          {daRiscuotere === 1
            ? "Una ricompensa ti aspetta."
            : `${daRiscuotere} ricompense ti aspettano.`}
        </p>
      )}

      {errore && (
        <p role="alert" className="mb-4 text-fluid-sm text-red-600 dark:text-red-400">
          {errore}
        </p>
      )}

      <ul className="space-y-3">
        {ordinate.map((q) => (
          <li
            key={q.key}
            className={`transition-all duration-300 ease-out ${
              uscita === q.key ? "-mb-3 max-h-0 scale-95 opacity-0" : "max-h-96 opacity-100"
            }`}
          >
            <div
              className={`card ${
                q.completata ? "border-brand-400/50 shadow-glow-brand" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      q.completata
                        ? "bg-brand-500 text-white"
                        : "border border-line-strong text-ink-faint"
                    }`}
                  >
                    {q.completata ? <Check className="h-3.5 w-3.5" /> : q.current}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-fluid-sm font-semibold">{q.titolo}</h2>
                    <p className="mt-1 text-fluid-sm text-ink-muted">{q.descrizione}</p>
                  </div>
                </div>

                {q.completata ? (
                  <button
                    type="button"
                    className="btn-primary shrink-0"
                    disabled={inCorso === q.key}
                    onClick={(e) => riscuoti(q, e.currentTarget)}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {inCorso === q.key ? "…" : `Riscuoti +${q.xp} XP`}
                  </button>
                ) : (
                  <span className="shrink-0 text-fluid-xs font-bold tabular-nums text-ink-faint">
                    +{q.xp} XP
                  </span>
                )}
              </div>

              {/* La barra solo dove misura qualcosa. Su una quest da 0/1 non
                  aggiunge niente al cerchietto accanto al titolo: era una
                  riga di rumore ripetuta otto volte. */}
              {q.target > 1 && (
                <>
                  <div
                    className="mt-4 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                    role="progressbar"
                    aria-valuenow={Math.round((q.current / q.target) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progresso: ${q.titolo}`}
                  >
                    <div
                      className={`h-full transition-[width] duration-500 ease-out ${
                        q.completata ? "bg-esito-ok-tinta" : "bg-brand-600"
                      }`}
                      style={{ width: `${Math.min(100, (q.current / q.target) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs muted">
                    {q.current}/{q.target}
                  </p>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {quests.length === 0 && (
        <div className="card text-center">
          <p className="text-fluid-base font-semibold">Le hai fatte tutte.</p>
          <p className="mt-2 text-fluid-sm text-ink-muted">
            Erano il percorso per rendere il profilo facile da trovare, e l&apos;hai
            finito. Da qui in avanti quello che conta succede fuori di qui:
            candidature, ingaggi, persone che ti scrivono.
          </p>
        </div>
      )}

      {/* Il numero in volo. `fixed` perché deve poter attraversare la pagina
          senza essere tagliato dagli `overflow` delle schede che sorvola. */}
      {volo && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 text-fluid-lg font-bold text-brand-500"
          /* L'animazione sta qui e non in una classe di Tailwind con valore
             arbitrario: quella conterrebbe virgole e parentesi — la curva di
             accelerazione — che il generatore deve poi ritrovare per intero
             nel sorgente, e basta una spaziatura diversa perché la regola non
             venga emessa. Una scritta a mano funziona sempre, e le due
             distanze sono comunque dinamiche. */
          style={
            {
              left: volo.x,
              top: volo.y,
              animation: "volo-xp 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
              "--dx": `${volo.dx}px`,
              "--dy": `${volo.dy}px`,
            } as React.CSSProperties
          }
        >
          +{volo.xp} XP
        </span>
      )}
    </>
  );
}
