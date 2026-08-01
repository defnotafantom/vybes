import { cn } from "@/lib/cn";

/**
 * Campo d'onda del marchio.
 *
 * Il marchio non è una spirale decorativa: è una vibrazione che si propaga —
 * è letteralmente il nome del prodotto. All'hover cinque pacchetti d'onda
 * partono da dietro di lui e attraversano lo schermo.
 *
 * Ogni fronte è una sinusoide, non un arco: è la forma con cui si disegna
 * un'onda, e rende leggibile la direzione di marcia. L'oscillazione è
 * trasversale al verso di propagazione, come in un'onda che viaggia su una
 * corda.
 *
 * L'inviluppo `sin(πt)` smorza l'ampiezza ai due capi del pacchetto: senza,
 * la sinusoide comincerebbe e finirebbe di netto, e si leggerebbe come un
 * frammento ritagliato invece che come un impulso.
 *
 * I 72° di sfasamento fra un fronte e l'altro sono 360/5: la simmetria del
 * marchio. Ogni onda parte dalla direzione di una pala, e lungo la corsa
 * ruota ancora un po', così la traiettoria prosegue il verso della spirale
 * invece di contraddirlo.
 *
 * Viola e ciano si alternano: i due colori del gradiente del progetto,
 * separati nel tempo invece che nello spazio.
 *
 * Componente server: nessuno stato, nessun evento. L'hover lo intercetta il
 * CSS attraverso l'antenato `.brand`, quindi zero JavaScript spedito.
 */

/** Direzioni di emissione: una per pala del marchio. */
const DIREZIONI = 5;
/**
 * Pacchetti in circolo. Sono il doppio delle direzioni perché ognuna emette
 * due volte per giro: con un solo pacchetto per direzione lo schermo resta
 * vuoto per lunghi tratti, dato che ciascuno esce di scena molto prima che il
 * ciclo finisca. Le direzioni restano cinque — la simmetria non cambia,
 * cambia la cadenza.
 */
const PACCHETTI = DIREZIONI * 2;

/** Il pacchetto nasce nel centro: il marchio, disegnato sopra, lo nasconde
 *  finché non ne esce. Farlo cominciare più in là lo staccava dalla sorgente,
 *  e l'onda sembrava comparire dal nulla a mezzo schermo. */
const R0 = 0;
/** Lunghezza del pacchetto, in unità del sistema di riferimento. */
const LUNGHEZZA = 26;
/** Oscillazioni contenute nel pacchetto. */
const ONDULAZIONI = 1.7;
const AMPIEZZA = 4.6;
/** Durata di un giro completo, in millisecondi. Deve restare allineata con
 *  l'animazione `vybe-propaga` in globals.css. */
const CICLO = 2800;
/** Punti campionati: abbastanza per una curva liscia, non tanti da pesare. */
const CAMPIONI = 36;

/**
 * Un pacchetto d'onda disegnato lungo l'asse x, con il centro del sistema in
 * (50, 50). La rotazione e la corsa gliele dà il CSS: qui c'è solo la forma.
 */
function pacchetto(): string {
  const punti: string[] = [];
  for (let s = 0; s <= CAMPIONI; s++) {
    const t = s / CAMPIONI;
    const inviluppo = Math.sin(Math.PI * t) ** 0.65;
    const x = 50 + R0 + LUNGHEZZA * t;
    const y = 50 + AMPIEZZA * inviluppo * Math.sin(2 * Math.PI * ONDULAZIONI * t);
    punti.push(`${s === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return punti.join("");
}

const ONDA = pacchetto();

export function VybeWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      // 150vmax centrati sul marchio. Il raggio del riquadro arriva così a
      // 75vmax, appena oltre l'angolo più lontano di qualunque schermo: le
      // onde escono di scena fuori dalla vista invece di sparire a metà.
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax]",
        "-translate-x-1/2 -translate-y-1/2",
        className
      )}
    >
      {Array.from({ length: PACCHETTI }, (_, k) => (
        <g
          key={k}
          // L'orientamento di partenza sta sul gruppo, la corsa sul tracciato:
          // due animazioni sulla stessa proprietà `transform` si
          // sovrascriverebbero a vicenda.
          //
          // Le emissioni girano fra le cinque direzioni una alla volta, così
          // partenze consecutive non escono mai dalla stessa parte.
          className={cn(
            "vybe-raggio",
            k % 2 === 0 ? "text-brand-400" : "text-accent-400"
          )}
          style={{ transform: `rotate(${((k % DIREZIONI) * 360) / DIREZIONI}deg)` }}
        >
          {/* Sfasamento uniforme sull'intero ciclo, non un ritardo breve: i
              pacchetti escono di scena, quindi se partissero raggruppati
              resterebbero lunghi tratti di schermo vuoto fra un gruppo e il
              successivo. Così ce n'è sempre qualcuno in viaggio. */}
          <path
            className="vybe-onda"
            d={ONDA}
            style={{ animationDelay: `${Math.round((k * CICLO) / PACCHETTI)}ms` }}
          />
        </g>
      ))}
    </svg>
  );
}
