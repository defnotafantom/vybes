/**
 * Geometria delle macchie d'inchiostro.
 *
 * Le forme sono generate una volta sola, al caricamento del modulo, da un
 * generatore pseudocasuale con seme fisso. Non è un ripiego: `Math.random()`
 * chiamato durante il rendering produrrebbe forme diverse sul server e nel
 * browser, e React se ne accorgerebbe al momento dell'idratazione. Con il seme
 * fisso i due lati generano esattamente lo stesso disegno.
 *
 * La varietà non ne soffre, perché le macchie che compaiono sono scelte a caso
 * *fra* queste al momento dell'esplosione, con posizione, rotazione e scala
 * decise lì: la casualità sta nella combinazione, non nella forma.
 */

/**
 * Generatore mulberry32: trentadue bit di stato, una manciata di operazioni.
 * Basta ampiamente per disporre delle macchie, e non porta con sé una
 * dipendenza per fare una cosa che sta in sei righe.
 */
function seminato(seme: number): () => number {
  let a = seme;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Macchia = {
  /** Il contorno principale, in un sistema di coordinate 100×100. */
  corpo: string;
  /** Gocce staccate: sono ciò che distingue uno schizzo da una pozza. */
  gocce: { cx: number; cy: number; r: number }[];
};

const CENTRO = 50;
const BASE = 31;

const punto = (r: number, a: number): [number, number] => [
  CENTRO + r * Math.cos(a),
  CENTRO + r * Math.sin(a),
];
const fmt = ([x, y]: [number, number]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/**
 * Il contorno, costruito a lobi.
 *
 * Raggi che alternano picchi e valli, uniti da quadratiche il cui punto di
 * controllo sta *oltre* il picco — una quadratica passa a metà strada fra il
 * controllo e la corda, quindi va sopravanzata perché il lobo arrivi davvero
 * dove deve.
 *
 * Le proporzioni contano più della struttura, e due tentativi lo hanno
 * dimostrato. Con curve passanti per i punti medi vengono bolle lisce: il
 * livellamento cancella proprio le irregolarità che fanno la macchia. Con
 * valli profonde e sopravanzo alto vengono stelle. Una macchia di vernice è
 * una massa piena e bitorzoluta — valli poco sotto i picchi — da cui partono
 * *uno o due* schizzi lunghi. Il numero basso è essenziale: otto protuberanze
 * uguali sono un asterisco, due sono uno schizzo.
 */
function corpo(rnd: () => number): string {
  const lobi = 8 + Math.floor(rnd() * 4);

  const schizzi = new Set<number>();
  const quanti = 1 + Math.floor(rnd() * 2);
  while (schizzi.size < quanti) schizzi.add(Math.floor(rnd() * lobi));

  const valli: { a: number; r: number }[] = [];
  const picchi: { a: number; r: number; stretto: boolean }[] = [];

  for (let i = 0; i < lobi; i++) {
    valli.push({
      a: (i / lobi) * 2 * Math.PI + (rnd() - 0.5) * 0.18,
      r: BASE * (0.74 + rnd() * 0.14),
    });

    const stretto = schizzi.has(i);
    picchi.push({
      a: ((i + 0.5) / lobi) * 2 * Math.PI + (rnd() - 0.5) * 0.14,
      r: BASE * (0.94 + rnd() * 0.18) * (stretto ? 1.45 + rnd() * 0.45 : 1),
      stretto,
    });
  }

  let d = `M${fmt(punto(valli[0].r, valli[0].a))}`;
  for (let i = 0; i < lobi; i++) {
    const p = picchi[i];
    const v = valli[(i + 1) % lobi];
    d += `Q${fmt(punto(p.r * (p.stretto ? 1.28 : 1.12), p.a))} ${fmt(punto(v.r, v.a))}`;
  }
  return `${d}Z`;
}

/** Gocce sparse fuori dal corpo: dentro si confonderebbero con esso. */
function gocce(rnd: () => number) {
  const quante = 4 + Math.floor(rnd() * 5);
  return Array.from({ length: quante }, () => {
    const ang = rnd() * 2 * Math.PI;
    const dist = 40 + rnd() * 24;
    return {
      cx: Number((CENTRO + dist * Math.cos(ang)).toFixed(1)),
      cy: Number((CENTRO + dist * Math.sin(ang)).toFixed(1)),
      r: Number((1.2 + rnd() * 3.6).toFixed(1)),
    };
  });
}

/** Dodici forme: abbastanza perché due esplosioni non si somiglino. */
export const MACCHIE: Macchia[] = Array.from({ length: 12 }, (_, i) => {
  const rnd = seminato(0x5bf03 + i * 7919);
  return { corpo: corpo(rnd), gocce: gocce(rnd) };
});

/**
 * L'inchiostro esce dalla scritta, quindi ne ha i colori.
 *
 * Sono le tre fermate esatte di `.text-gradient`: brand-400, brand-500,
 * accent-400 — lo stesso gradiente che colora «Vy» nella barra e la scritta
 * che si carica al centro del marchio.
 *
 * Prima erano cinque tinte prese dalla tavolozza generale, e il legame fra ciò
 * che scoppia e ciò che schizza non si vedeva: sembravano due cose diverse
 * capitate nello stesso istante.
 */
export const INCHIOSTRI = ["#a78bfa", "#8b5cf6", "#22d3ee"];
