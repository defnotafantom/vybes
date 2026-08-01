import { cn } from "@/lib/cn";

/**
 * Campo d'onda del marchio.
 *
 * Il marchio non è una spirale decorativa: è una vibrazione che si propaga —
 * è letteralmente il nome del prodotto.
 *
 * ── Perché spirali, e perché è la forma giusta ──
 *
 * Una sorgente ferma che emette a intervalli regolari produce cerchi
 * concentrici. Ma una sorgente che *ruota* mentre emette produce fronti a
 * spirale: ogni fronte parte in una direzione diversa dal precedente, e il
 * risultato è una spirale di Archimede. È la geometria dell'irrigatore da
 * giardino, del faro, della pulsar.
 *
 * Il marchio ruota. I suoi fronti d'onda sono spirali per necessità fisica,
 * non per scelta estetica — ed è anche la ragione per cui la forma delle onde
 * somiglia a quella del marchio: entrambe nascono dalla stessa rotazione.
 *
 * ── Perché la rotazione basta ad animare tutto ──
 *
 * Qui non si anima nessuna espansione. Le spirali sono disegnate una volta e
 * ruotano, punto. È l'illusione dell'irrigatore: mentre la spirale gira, ogni
 * suo punto sembra allontanarsi dal centro, perché la spirale interseca ogni
 * raggio a distanze che crescono col tempo. Il moto radiale è vero — chi si
 * mettesse fermo su un raggio vedrebbe i fronti passargli davanti a velocità
 * costante — e si ottiene con **una sola** trasformazione invece che con dieci
 * animazioni indipendenti.
 *
 * Il tentativo precedente traslava pacchetti sinusoidali rigidi. Era sbagliato
 * due volte: la sinusoide descrive l'ampiezza *nel tempo*, non la forma nello
 * spazio, e un pacchetto che si sposta senza deformarsi non è un'onda ma un
 * proiettile.
 *
 * ── Lo smorzamento ──
 *
 * L'ampiezza di un'onda circolare decade come 1/√r: l'energia si distribuisce
 * su una circonferenza che cresce con il raggio, quindi l'intensità va come
 * 1/r e l'ampiezza come la sua radice. Qui lo fa un gradiente radiale usato
 * come colore del tratto — nessuna animazione, nessun costo per fotogramma.
 *
 * Componente server: nessuno stato, nessun evento. L'hover lo intercetta il
 * CSS attraverso l'antenato `.brand`, quindi zero JavaScript spedito.
 */

/** Bracci: uno per pala del marchio. Sono anche i fronti visibili insieme. */
const BRACCI = 5;
/** Raggio a cui nasce la spirale: dentro il marchio, che la nasconde. */
const R0 = 5;
/** Raggio a cui esce dal riquadro. */
const R1 = 50;
/**
 * Giri compiuti da un braccio. Con cinque bracci sfasati di 72°, 1,25 giri
 * danno fronti distanziati di circa nove unità lungo ogni raggio — la
 * lunghezza d'onda. Alzarlo li infittisce finché non si leggono più come onde
 * ma come un retino.
 */
const GIRI = 1.25;
const CAMPIONI = 140;

/**
 * Oscillazione radiale sovrapposta alla spirale.
 *
 * La spirale è la *traiettoria* del fronte; la sinusoide è l'oscillazione del
 * mezzo attorno a essa. Sono due cose distinte e in un'onda vera convivono:
 * il fronte avanza, il mezzo vibra sul posto. Un'onda disegnata come linea
 * liscia mostra solo la prima metà.
 *
 * L'ampiezza cresce col raggio perché a distanza maggiore la stessa
 * oscillazione angolare copre più spazio: senza, l'ondulazione sparirebbe
 * proprio dove c'è più posto per vederla.
 */
const OSCILLAZIONI = 3.5;
const AMPIEZZA = 2.6;

/**
 * Una spirale di Archimede — raggio proporzionale all'angolo — centrata in
 * (50, 50), con l'oscillazione sovrapposta.
 *
 * La proporzionalità è ciò che tiene i fronti equidistanti lungo ogni raggio:
 * è la lunghezza d'onda, e in un mezzo omogeneo è costante.
 */
function spirale(): string {
  const punti: string[] = [];
  const thetaMax = GIRI * 2 * Math.PI;

  for (let i = 0; i <= CAMPIONI; i++) {
    const t = i / CAMPIONI;
    const theta = t * thetaMax;
    const r =
      R0 + (R1 - R0) * t + AMPIEZZA * t * Math.sin(2 * Math.PI * OSCILLAZIONI * t);
    punti.push(
      `${i === 0 ? "M" : "L"}${(50 + r * Math.cos(theta)).toFixed(2)} ` +
        `${(50 + r * Math.sin(theta)).toFixed(2)}`
    );
  }
  return punti.join("");
}

const TRACCIATO = spirale();

/**
 * Le fermate dello smorzamento, condivise dai due gradienti.
 *
 * Due gradienti espliciti e non uno con `currentColor`: dentro una fermata,
 * `currentColor` si risolve sul colore del gradiente stesso, non su quello
 * dell'elemento che lo usa. Tutti i bracci finirebbero della stessa tinta, e
 * l'alternanza viola/ciano — i due colori del progetto, separati nello spazio
 * invece che nel tempo — andrebbe persa.
 */
const SMORZAMENTO: [string, number][] = [
  ["0%", 1],
  ["18%", 0.74],
  ["38%", 0.54],
  ["60%", 0.36],
  ["82%", 0.17],
  ["100%", 0],
];

const TINTE = [
  { id: "vybe-viola", colore: "#a78bfa" },
  { id: "vybe-ciano", colore: "#22d3ee" },
];

export function VybeWaves({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      // 150vmax centrati sul marchio: il raggio del riquadro arriva a 75vmax,
      // appena oltre l'angolo più lontano di qualunque schermo. Un elemento
      // <svg> ritaglia il proprio riquadro, quindi il campo va dimensionato
      // sulla corsa dell'onda e non sul marchio fermo.
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax]",
        "-translate-x-1/2 -translate-y-1/2",
        className
      )}
    >
      <defs>
        {TINTE.map((t) => (
          // `userSpaceOnUse` ancora il gradiente al sistema di coordinate:
          // resta centrato sulla sorgente mentre le spirali ruotano, così la
          // dissolvenza dipende da dove si trova il tratto e non da come è
          // orientato. Con le unità predefinite seguirebbe il riquadro di
          // ciascun tracciato e ruoterebbe con lui.
          <radialGradient
            key={t.id}
            id={t.id}
            gradientUnits="userSpaceOnUse"
            cx="50"
            cy="50"
            r="50"
          >
            {SMORZAMENTO.map(([offset, opacita]) => (
              <stop key={offset} offset={offset} stopColor={t.colore} stopOpacity={opacita} />
            ))}
          </radialGradient>
        ))}

        {/*
          Il tracciato sta qui e non nel disegno: dentro <defs> non viene
          dipinto, esiste solo per essere richiamato. Ripeterlo per esteso
          cinque volte costerebbe cinque copie di centoquaranta coordinate —
          otto kilobyte e mezzo di HTML invece di uno e sette, su una pagina
          che deve caricare in fretta — per disegnare cinque volte la stessa
          curva.

          pathLength normalizza la lunghezza a 100, così il tratteggio vale una
          percentuale del percorso: i fronti restano nello stesso numero
          comunque cambino i parametri della spirale.
        */}
        <path id="vybe-braccio" className="vybe-onda" d={TRACCIATO} pathLength={100} />
      </defs>

      {/* La rotazione sta qui, su un solo elemento: i bracci sono lo stesso
          treno d'onda e devono girare insieme. Una trasformazione animata al
          posto di cinque. */}
      <g className="vybe-rotore">
        {Array.from({ length: BRACCI }, (_, i) => (
          <use
            key={i}
            href="#vybe-braccio"
            // Sfasamento di 360/5: un quinto di periodo fra un fronte e il
            // successivo. È posizione di partenza, non animazione.
            style={{ transform: `rotate(${(i * 360) / BRACCI}deg)`, transformOrigin: "50% 50%" }}
            // Lo stroke si eredita nell'albero richiamato, quindi il colore lo
            // decide chi usa il tracciato e non il tracciato stesso.
            stroke={`url(#${TINTE[i % TINTE.length].id})`}
          />
        ))}
      </g>
    </svg>
  );
}
