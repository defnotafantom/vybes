/**
 * Il campo d'onda, in un posto solo.
 *
 * ── Perché questo file esiste ──
 *
 * Sulla landing tre superfici disegnano lo **stesso fenomeno**: lo sfondo a
 * pieno campo, le lettere del titolo, e il marchio. La coerenza fra le tre non
 * è un dettaglio estetico — è l'unica ragione per cui l'effetto è difendibile
 * invece di essere una decorazione presa da una galleria.
 *
 * Con tre copie del GLSL, cambiare una costante in una sola darebbe tre onde
 * diverse e nessun errore: è la forma di difetto numero due di COLLOQUIO.md,
 * la regola scritta in più posti e nessuno che la faccia rispettare. Qui la
 * formula sta scritta una volta e i tre frammenti la includono.
 *
 * ── L'ancora ──
 *
 * Le sorgenti non orbitano più intorno al centro dell'hero, ma intorno al
 * **marchio**: è lui a emettere, e la figura è ciò che emette. È la differenza
 * fra un logo appoggiato su uno sfondo animato e un logo che quello sfondo lo
 * causa.
 *
 * La posizione viaggia in questo oggetto e non per proprietà di React: chi la
 * scrive (il marchio) e chi la legge (lo sfondo, il titolo) sono fratelli in
 * punti diversi dell'albero, e farla risalire a un antenato comune per poi
 * ridiscendere legherebbe tre componenti che non hanno altro da dirsi. Il
 * valore cambia a ogni ridimensionamento e viene letto a ogni fotogramma:
 * passarlo per stato vorrebbe dire un rendering per pixel di scorrimento.
 *
 * Il valore di partenza è il centro dell'hero: senza marchio in pagina, il
 * campo si comporta esattamente come prima.
 */
export const ANCORA = { x: 0, y: 0 };

/**
 * Il prelude comune ai tre frammenti: uniform condivise, l'onda, e le due
 * funzioni che traducono un frammento in un punto del campo.
 *
 * Va incollato subito dopo la riga `precision`. Ogni componente aggiunge le
 * proprie uniform e il proprio `main`.
 */
export const CAMPO_GLSL = `
// Il riquadro in cui il campo e' definito — l'hero — e la posizione di questa
// tela dentro di esso, in pixel del dispositivo (y dal basso, come WebGL).
// Per la tela che copre tutto l'hero valgono la propria misura e (0,0).
uniform vec2  finestra;
uniform vec2  origine;
uniform float tempo;
uniform float scorrimento;
uniform vec2  puntatore;
uniform float impulso;
// Dove sta il marchio, in coordinate del campo: le sorgenti gli orbitano
// intorno. Vale (0,0) quando il marchio non c'e', cioe' il centro dell'hero.
uniform vec2  ancora;

// Un fronte d'onda a spirale emesso da una sorgente.
//
// fase = k*r - omega*t + bracci*theta e' l'equazione di una spirale: a raggio
// crescente la fase avanza, nel tempo il fronte si allontana, e il termine
// angolare e' cio' che trasforma i cerchi in spirali — il motivo per cui un
// faro rotante disegna un vortice e non un cerchio.
//
// L'ampiezza cala col raggio: un'onda che non si attenua riempie lo schermo di
// righe uniformi e smette di somigliare a un'onda.
float onda(vec2 p, vec2 sorgente, float k, float omega, float bracci, float t) {
  vec2 d = p - sorgente;
  float r = length(d);
  float th = atan(d.y, d.x);
  return sin(k * r - omega * t + bracci * th) / (1.0 + r * 1.8);
}

// Da frammento a punto del campo. Coordinate centrate sull'hero e
// indipendenti dal formato: senza la divisione per il lato minore, i fronti
// circolari diventano ellissi su uno schermo largo.
vec2 punto(vec2 frammento) {
  return (frammento + origine - 0.5 * finestra) / min(finestra.x, finestra.y);
}

// L'interferenza: tre sorgenti che orbitano intorno all'ancora a velocita'
// diverse. I numeri sono primi fra loro di proposito — con periodi in rapporto
// semplice la figura si ripete a occhio ogni pochi secondi e si riconosce il
// ciclo.
float campo(vec2 p) {
  vec2 s1 = ancora + 0.45 * vec2(cos(tempo * 0.23), sin(tempo * 0.23));
  vec2 s2 = ancora + 0.38 * vec2(cos(-tempo * 0.17 + 2.1), sin(-tempo * 0.17 + 2.1));
  vec2 s3 = ancora + 0.55 * vec2(cos(tempo * 0.11 + 4.2), sin(tempo * 0.11 + 4.2));

  // La prima sorgente segue chi guarda, ma per meta' strada: seguendo il
  // cursore esattamente il campo diventa un riflesso del mouse e smette di
  // sembrare un fenomeno che esiste per conto suo. A meta', lo si trascina.
  s1 = mix(s1, puntatore, 0.5);

  // Scorrendo i fronti si infittiscono e rallentano; l'impulso li allarga al
  // contrario. Sono le due mani del visitatore sul campo.
  float k = (1.0 + scorrimento * 1.6) * (1.0 - impulso * 0.55);
  float w = 1.0 - scorrimento * 0.45;

  return onda(p, s1, 26.0 * k, 1.30 * w, 2.0, tempo)
       + onda(p, s2, 19.0 * k, 0.95 * w, 3.0, tempo)
       + onda(p, s3, 33.0 * k, 1.70 * w, 1.0, tempo);
}

// Le frange: le righe sottili dove i fronti si sommano.
//
// Si isolano prendendo la distanza dal massimo piu' vicino invece di una
// soglia sull'ampiezza — che e' la differenza fra disegnare una linea e
// riempire una regione, e il motivo per cui la prima versione sembrava una
// lampada lava invece che interferenza.
//
// fwidth() dice quanto vale un pixel in questa scala: dividendo per quello la
// linea resta spessa un pixel sia al centro sia ai bordi, dove i fronti sono
// piu' fitti. Senza, verso il bordo le righe si impastano in un grigio.
float frange(float a) {
  float d = abs(fract(a * 3.0) - 0.5);
  return 1.0 - smoothstep(0.0, fwidth(a * 3.0) * 1.6 + 0.008, d);
}

const vec3 VIOLA = vec3(0.545, 0.361, 0.965);
const vec3 CIANO = vec3(0.024, 0.714, 0.831);
const vec3 ROSA  = vec3(0.925, 0.282, 0.600);
`;
