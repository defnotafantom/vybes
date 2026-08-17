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
 * ── L'ancora, provata e ritirata ──
 *
 * Per un commit le sorgenti orbitavano intorno al marchio invece che intorno
 * al centro: l'idea era che il logo *causasse* il campo. L'idea regge, la
 * realizzazione no.
 *
 * Il marchio sta in alto a sinistra, cioè a circa 0,9 unità dal centro in un
 * riquadro che ne misura 1 in altezza. Spostandoci le sorgenti, l'attenuazione
 * 1/(1+1,8·r) ha schiacciato l'ampiezza su tutta la metà destra dello schermo,
 * e la vignetta — che seguiva l'ancora — ha azzerato quel che restava. Le tre
 * superfici sono diventate: sfondo vuoto a destra, lettere senza frange,
 * marchio piatto. Un difetto solo, con tre sintomi che sembravano tre.
 *
 * La lezione vale più della funzione: **una costante tarata su un centro non
 * sopravvive allo spostamento del centro**. 0,25 e 0,78 erano i raggi di una
 * vignetta centrata; letti da un angolo diventano una maschera che copre
 * mezzo schermo. Spostare l'origine di un campo significa ritarare tutto
 * quello che da quell'origine dipendeva — e qui erano cinque numeri sparsi in
 * tre file.
 *
 * Il legame fra marchio e campo resta, ma dove non può rompere niente: è la
 * stessa formula, non la stessa posizione.
 */

/**
 * Il prelude comune ai tre frammenti: uniform condivise, l'onda, e le due
 * funzioni che traducono un frammento in un punto del campo.
 *
 * Va incollato subito dopo la riga `precision`. Ogni componente aggiunge le
 * proprie uniform e il proprio `main`.
 */
export const CAMPO_GLSL = `
// La tela, in pixel del dispositivo, e quale tema e' attivo.
//
// Stavano nel frammento di OndeWebGL e sono rimaste indietro quando la formula
// e' stata estratta qui: i tre shader continuavano a usarle, nessuno le
// dichiarava piu', e **non compilavano piu' nessuno dei tre**. In produzione il
// registro di compilazione e' muto per scelta, quindi la pagina non si e'
// rotta — ha semplicemente smesso di disegnare, e ho passato due giri a
// ritarare numeri di una cosa che non veniva eseguita.
//
// La lezione: spostare del codice condiviso vuol dire portarsi dietro anche
// cio' che gli sta intorno, e le dichiarazioni sono codice. Il controllo che
// ora lo impedisce sta in scripts/verifica-shader.mjs.
//
// (E niente apici inversi qui dentro: questo GLSL vive dentro un template
// literal di JavaScript, e un apice inverso lo chiude a meta'. E' gia'
// successo una volta, l'ho scritto in un commento, e l'ho rifatto nel commento
// stesso in cui lo raccontavo — un errore di sintassi a trenta righe dalla
// causa. Il compilatore l'ha preso: e' lui il controllo, e basta ascoltarlo.)
uniform vec2  risoluzione;
uniform float chiaro;        // 1.0 su tema chiaro, 0.0 su scuro

// Il riquadro in cui il campo e' definito — l'hero — e la posizione di questa
// tela dentro di esso, in pixel del dispositivo (y dal basso, come WebGL).
// Per la tela che copre tutto l'hero valgono la propria misura e (0,0).
uniform vec2  finestra;
uniform vec2  origine;
uniform float tempo;
uniform float scorrimento;
uniform vec2  puntatore;
uniform float impulso;

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

// L'interferenza: tre sorgenti che orbitano intorno al centro a velocita'
// diverse. I numeri sono primi fra loro di proposito — con periodi in rapporto
// semplice la figura si ripete a occhio ogni pochi secondi e si riconosce il
// ciclo.
float campo(vec2 p) {
  vec2 s1 = 0.45 * vec2(cos(tempo * 0.23), sin(tempo * 0.23));
  vec2 s2 = 0.38 * vec2(cos(-tempo * 0.17 + 2.1), sin(-tempo * 0.17 + 2.1));
  vec2 s3 = 0.55 * vec2(cos(tempo * 0.11 + 4.2), sin(tempo * 0.11 + 4.2));

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
//
// I due numeri sono lo **spessore**, e vanno chiesti invece che ereditati.
// Dentro le lettere del titolo la riga sta su un fondo pieno e un pixel basta;
// sullo sfondo sta su nero quasi puro, dove un pixel a bassa opacita' e' un
// grigio che non si vede. Con un valore solo per tutti, o il titolo diventa
// rigato o lo sfondo sparisce — l'ho visto succedere in tutte e due le
// direzioni prima di parametrizzarlo.
float frange(float a, float largo, float minimo) {
  float d = abs(fract(a * 3.0) - 0.5);
  return 1.0 - smoothstep(0.0, fwidth(a * 3.0) * largo + minimo, d);
}
float frange(float a) { return frange(a, 1.6, 0.008); }

const vec3 VIOLA = vec3(0.545, 0.361, 0.965);
const vec3 CIANO = vec3(0.024, 0.714, 0.831);
const vec3 ROSA  = vec3(0.925, 0.282, 0.600);
`;
