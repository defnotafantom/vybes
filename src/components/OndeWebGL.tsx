"use client";

import { useEffect, useRef } from "react";

/**
 * Il campo d'onda della landing: il marchio, alla scala della pagina.
 *
 * ── Perché esiste, e perché **solo** qui ──
 *
 * Il resto del sito è uno strumento: un organizzatore che il martedì mattina
 * guarda chi si è candidato non vuole essere impressionato, vuole vedere le
 * candidature. Ogni ADR di questo progetto discende da lì, ed è il motivo per
 * cui l'idea di riscrivere l'applicazione in WebGL è stata scartata (ADR-051).
 *
 * La landing è l'unica pagina il cui mestiere **è** colpire: la si guarda una
 * volta, per tre secondi, e non la si rivede più dopo l'iscrizione — dove il
 * logo porta alla dashboard. Un momento visivo qui non toglie niente a
 * nessuno, e non ce n'è un secondo altrove.
 *
 * ── Perché *queste* onde e non un effetto qualsiasi ──
 *
 * È lo stesso fenomeno del marchio: **fronti d'onda emessi da una sorgente che
 * ruota**. Una sorgente ferma emette cerchi concentrici; una che ruota li
 * emette sfasati, e i fronti si avvolgono in spirali — è il motivo per cui un
 * faro rotante disegna un vortice e non un cerchio.
 *
 * Il marchio è quel fenomeno in piccolo e fermo. Qui è lo stesso, grande e in
 * movimento, con tre sorgenti che ruotano a velocità diverse e interferiscono.
 * Non è una decorazione presa da una galleria: è la stessa idea, scalata. La
 * differenza si vede, ed è la sola giustificazione che rende difendibile un
 * effetto su un prodotto che per il resto rifiuta gli effetti.
 *
 * ── Nessuna dipendenza ──
 *
 * WebGL2 diretto, un quadrilatero e un frammento. Three.js pesa quanto tutto
 * il resto del bundle e servirebbe a niente: qui non c'è una scena, non ci
 * sono luci né geometrie, c'è una funzione da valutare per pixel. Le
 * dipendenze di produzione restano sedici.
 *
 * ── Le cinque cose che lo rendono innocuo ──
 *
 * 1. **Non blocca niente.** Vive dietro il contenuto, che è renderizzato sul
 *    server e visibile prima che questo componente esista. L'LCP non lo
 *    conosce.
 * 2. **Se WebGL non c'è, non succede niente.** Nessun errore, nessun
 *    rettangolo vuoto: resta il gradiente che c'era già. Un effetto che si
 *    rompe è peggio di un effetto assente.
 * 3. **`prefers-reduced-motion` disegna un fotogramma e si ferma.** Chi ha
 *    disattivato le animazioni ha spesso una ragione medica — un campo che
 *    pulsa è esattamente ciò che scatena un disturbo vestibolare. Resta
 *    l'immagine, sparisce il movimento: nessuno perde qualcosa.
 * 4. **Si ferma quando non si vede.** Scheda in secondo piano o hero fuori
 *    schermo: il ciclo si sospende. Una GPU che macina per una pagina che
 *    nessuno guarda è batteria rubata.
 * 5. **Costa poco per pixel.** Densità limitata a 1,5 e risoluzione dimezzata
 *    sotto i 640px: il pubblico è fatto di artisti col telefono in mano.
 *
 * ── Accessibilità ──
 *
 * `aria-hidden` e `pointer-events-none`: non contiene informazione e non
 * intercetta gesti. Chi naviga da tastiera o con uno screen reader non lo
 * incontra mai — che per una decorazione è il comportamento corretto.
 */

const VERTICE = `#version 300 es
in vec2 posizione;
void main() { gl_Position = vec4(posizione, 0.0, 1.0); }`;

/**
 * Il frammento.
 *
 * `fase = k·r − ω·t + bracci·θ` è l'equazione di un fronte d'onda a spirale:
 * a raggio crescente la fase avanza, nel tempo il fronte si allontana, e il
 * termine angolare è ciò che trasforma i cerchi in spirali. Tre sorgenti in
 * posizioni e velocità diverse si sommano, e dove i fronti coincidono
 * l'ampiezza cresce: è interferenza vera, non un gradiente animato.
 */
const FRAMMENTO = `#version 300 es
precision highp float;

uniform vec2  risoluzione;
uniform float tempo;
uniform float chiaro;      // 1.0 su tema chiaro, 0.0 su scuro

// Le due mani del visitatore sul campo.
//
// scorrimento va da 0 in cima a 1 a fondo hero; puntatore e' dove sta il dito
// o il cursore, in coordinate centrate come p. Sono la differenza fra guardare
// un'animazione e suonare qualcosa: la stessa figura, ma il movimento e' tuo.
//
// (Niente apici inversi in questo commento: il frammento vive dentro un
// template literal di JavaScript, e un apice inverso lo chiuderebbe a meta'.
// Lo shader smetteva di compilare e il file smetteva di essere TypeScript
// valido — un errore di sintassi a trenta righe di distanza dalla causa.)
uniform float scorrimento;
uniform vec2  puntatore;
out vec4 colore;

const vec3 VIOLA = vec3(0.545, 0.361, 0.965);  // brand-500
const vec3 CIANO = vec3(0.024, 0.714, 0.831);  // accent
const vec3 ROSA  = vec3(0.925, 0.282, 0.600);

// Un fronte d'onda a spirale emesso da \`sorgente\`.
float onda(vec2 p, vec2 sorgente, float k, float omega, float bracci, float t) {
  vec2 d = p - sorgente;
  float r = length(d);
  float th = atan(d.y, d.x);
  // L'ampiezza cala col raggio: un'onda che non si attenua riempie lo schermo
  // di righe uniformi e smette di somigliare a un'onda.
  return sin(k * r - omega * t + bracci * th) / (1.0 + r * 1.8);
}

void main() {
  // Coordinate centrate e indipendenti dal formato: senza la correzione, i
  // fronti circolari diventano ellissi su uno schermo largo.
  vec2 p = (gl_FragCoord.xy - 0.5 * risoluzione) / min(risoluzione.x, risoluzione.y);

  // Tre sorgenti che ruotano su orbite e a velocità diverse. I numeri sono
  // primi fra loro di proposito: con periodi in rapporto semplice la figura si
  // ripete a occhio ogni pochi secondi e si riconosce il ciclo.
  vec2 s1 = 0.45 * vec2(cos(tempo * 0.23), sin(tempo * 0.23));
  vec2 s2 = 0.38 * vec2(cos(-tempo * 0.17 + 2.1), sin(-tempo * 0.17 + 2.1));
  vec2 s3 = 0.55 * vec2(cos(tempo * 0.11 + 4.2), sin(tempo * 0.11 + 4.2));

  // La prima sorgente segue chi guarda, ma per metà strada: seguendo il
  // cursore esattamente il campo diventa un riflesso del mouse e smette di
  // sembrare un fenomeno che esiste per conto suo. A metà, la si trascina.
  s1 = mix(s1, puntatore, 0.5);

  // Scorrendo, i fronti si infittiscono e rallentano: la figura si stringe
  // verso il basso invece di limitarsi a scorrere via. È l'unico legame fra
  // il gesto e il campo che si sente senza doverlo cercare.
  float k = 1.0 + scorrimento * 1.6;
  float w = 1.0 - scorrimento * 0.45;

  float a = onda(p, s1, 26.0 * k, 1.30 * w, 2.0, tempo)
          + onda(p, s2, 19.0 * k, 0.95 * w, 3.0, tempo)
          + onda(p, s3, 33.0 * k, 1.70 * w, 1.0, tempo);

  // Le creste, non tutta l'onda: \`smoothstep\` tiene solo i massimi e lascia
  // il resto al fondo. Mostrando l'onda intera si otterrebbe una zebratura
  // che compete con il testo che ci sta sopra.
  float cresta = smoothstep(0.35, 0.95, abs(a));

  // Il colore segue la fase: le tre tinte del progetto, non una scala a caso.
  vec3 tinta = mix(VIOLA, CIANO, 0.5 + 0.5 * sin(a * 1.7));
  tinta = mix(tinta, ROSA, 0.28 * smoothstep(0.6, 1.2, abs(a)));

  // Verso i bordi si spegne: il campo deve sembrare emergere dal centro, e
  // soprattutto non deve arrivare a toccare i margini del riquadro, dove il
  // taglio netto rivelerebbe che è un rettangolo.
  float vignetta = 1.0 - smoothstep(0.25, 0.78, length(p));

  // Molto trasparente, e più ancora su tema chiaro: lì il testo è scuro su
  // fondo chiaro e qualunque colore saturo sotto ne abbassa il contrasto —
  // che è un problema di leggibilità, non di gusto.
  // Scendendo il campo si ritira: sotto l'hero comincia il contenuto, e un
  // fondo che pulsa dietro un elenco di artisti è rumore.
  float alfa = cresta * vignetta * mix(0.55, 0.22, chiaro) * (1.0 - scorrimento * 0.7);

  colore = vec4(tinta, alfa);
}`;

/** Densità massima: oltre 1,5 non si distingue e la GPU lavora il doppio. */
const DENSITA_MASSIMA = 1.5;

/**
 * Compila uno shader.
 *
 * ── Silenzioso in produzione, rumoroso in sviluppo ──
 *
 * In produzione un errore di compilazione non deve rompere niente: si rinuncia
 * all'effetto e resta il gradiente. Un ornamento che manda in errore la pagina
 * che ornava è il difetto peggiore che possa produrre.
 *
 * Ma rinunciare **in silenzio anche in sviluppo** sarebbe la forma di difetto
 * numero uno di COLLOQUIO.md, scritta di mia mano: un refuso nel GLSL darebbe
 * una pagina identica a prima, e cercherei la causa nel montaggio del
 * componente per mezz'ora. Il registro di compilazione dice esattamente riga e
 * colonna: in sviluppo si stampa.
 */
function compila(gl: WebGL2RenderingContext, tipo: number, sorgente: string) {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, sorgente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[OndeWebGL] shader non compilato:\n${gl.getShaderInfoLog(s) ?? "nessun dettaglio"}`
      );
    }
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function OndeWebGL({ className }: { className?: string }) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      // La pagina non legge mai i pixel: dirlo permette al driver di scartare
      // il buffer dopo il disegno invece di conservarlo.
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // Niente WebGL2: resta il gradiente che c'era già.

    const vs = compila(gl, gl.VERTEX_SHADER, VERTICE);
    const fs = compila(gl, gl.FRAGMENT_SHADER, FRAMMENTO);
    if (!vs || !fs) return;

    const programma = gl.createProgram();
    if (!programma) return;
    gl.attachShader(programma, vs);
    gl.attachShader(programma, fs);
    gl.linkProgram(programma);
    if (!gl.getProgramParameter(programma, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[OndeWebGL] programma non collegato:\n${gl.getProgramInfoLog(programma)}`);
      }
      return;
    }
    gl.useProgram(programma);

    // Due triangoli che coprono lo schermo in coordinate di clip: nessuna
    // matrice, nessuna camera. Tutta la figura vive nel frammento.
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const attrib = gl.getAttribLocation(programma, "posizione");
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRisoluzione = gl.getUniformLocation(programma, "risoluzione");
    const uTempo = gl.getUniformLocation(programma, "tempo");
    const uChiaro = gl.getUniformLocation(programma, "chiaro");
    const uScorrimento = gl.getUniformLocation(programma, "scorrimento");
    const uPuntatore = gl.getUniformLocation(programma, "puntatore");

    /* ── I due valori che vengono da chi guarda ──
     *
     * Si tengono in variabili semplici e non in stato di React: cambiano a
     * ogni movimento del dito, e farli passare da un `useState` significherebbe
     * un rendering per pixel percorso. Qui il ciclo di disegno li legge
     * direttamente, ed è l'unico posto che li usa.
     *
     * ── Perché inseguono invece di saltare ──
     *
     * `verso` è il valore vero, `ora` quello disegnato, e a ogni fotogramma il
     * secondo si avvicina al primo di un quinto. Senza questo scatto, il campo
     * seguirebbe il cursore a strappi e ogni frenata sarebbe uno scossone. Con
     * l'inseguimento sembra che abbia una massa — che è quello che gli dà
     * l'aria di essere una cosa e non un valore.
     */
    let scorrimentoVerso = 0;
    let scorrimentoOra = 0;
    const puntatoreVerso = { x: 0, y: 0 };
    const puntatoreOra = { x: 0, y: 0 };

    function leggiScorrimento() {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      // Quanto dell'hero è già uscito dallo schermo, fra 0 e 1.
      scorrimentoVerso = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    }

    function suPuntatore(e: PointerEvent) {
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      const lato = Math.min(r.width, r.height);
      puntatoreVerso.x = ((e.clientX - r.left) - r.width / 2) / lato;
      // L'asse verticale è rovesciato: in WebGL lo zero sta in basso, nel
      // documento in alto. Senza il segno, il campo insegue il cursore
      // specchiato — che si nota subito e sembra un difetto di calibrazione.
      puntatoreVerso.y = -(((e.clientY - r.top) - r.height / 2) / lato);
    }

    const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function ridimensiona() {
      if (!canvas || !gl) return;
      // Metà risoluzione sotto i 640px: su un telefono la differenza non si
      // vede e il consumo si dimezza.
      const densita = Math.min(
        DENSITA_MASSIMA,
        window.devicePixelRatio || 1,
        window.innerWidth < 640 ? 1 : DENSITA_MASSIMA
      );
      const w = Math.floor(canvas.clientWidth * densita);
      const h = Math.floor(canvas.clientHeight * densita);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    function disegna(secondi: number) {
      if (!gl || !canvas) return;
      ridimensiona();
      gl.uniform2f(uRisoluzione, canvas.width, canvas.height);
      gl.uniform1f(uTempo, secondi);
      gl.uniform1f(
        uChiaro,
        document.documentElement.classList.contains("dark") ? 0 : 1
      );

      // L'inseguimento: un quinto della distanza per fotogramma.
      scorrimentoOra += (scorrimentoVerso - scorrimentoOra) * 0.2;
      puntatoreOra.x += (puntatoreVerso.x - puntatoreOra.x) * 0.2;
      puntatoreOra.y += (puntatoreVerso.y - puntatoreOra.y) * 0.2;
      gl.uniform1f(uScorrimento, scorrimentoOra);
      gl.uniform2f(uPuntatore, puntatoreOra.x, puntatoreOra.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    let richiesta = 0;
    let visibile = true;
    const inizio = performance.now();

    function ciclo(ora: number) {
      disegna((ora - inizio) / 1000);
      richiesta = requestAnimationFrame(ciclo);
    }

    function avvia() {
      if (menoMovimento || richiesta) return;
      richiesta = requestAnimationFrame(ciclo);
    }
    function ferma() {
      if (!richiesta) return;
      cancelAnimationFrame(richiesta);
      richiesta = 0;
    }

    // Un fotogramma c'è sempre: con `prefers-reduced-motion` è l'opera finita,
    // altrimenti è ciò che si vede nell'istante prima che il ciclo parta.
    disegna(6.5);
    if (!menoMovimento) avvia();

    // Fuori schermo o scheda in secondo piano: si sospende. Una GPU che macina
    // per una pagina che nessuno guarda è batteria rubata.
    /* Il campo deve rispondere anche a chi scorre **senza** che il ciclo sia
     * partito — con `prefers-reduced-motion` non parte affatto. In quel caso
     * si ridisegna un fotogramma per gesto: nessuna animazione continua, ma la
     * pagina non resta sorda a quello che si fa.
     */
    function suGesto() {
      leggiScorrimento();
      if (menoMovimento) disegna(6.5);
    }

    leggiScorrimento();
    window.addEventListener("scroll", suGesto, { passive: true });
    window.addEventListener("resize", suGesto, { passive: true });
    // `pointermove` copre mouse, penna e dito con un ascoltatore solo.
    // `passive`: non si chiama mai `preventDefault`, e dirlo permette al
    // browser di non aspettare prima di far scorrere la pagina.
    window.addEventListener("pointermove", suPuntatore, { passive: true });

    const osservatore = new IntersectionObserver(
      ([voce]) => {
        visibile = voce.isIntersecting;
        visibile && !document.hidden ? avvia() : ferma();
      },
      { threshold: 0 }
    );
    osservatore.observe(canvas);

    const suVisibilita = () => (document.hidden || !visibile ? ferma() : avvia());
    document.addEventListener("visibilitychange", suVisibilita);

    return () => {
      ferma();
      osservatore.disconnect();
      document.removeEventListener("visibilitychange", suVisibilita);
      window.removeEventListener("scroll", suGesto);
      window.removeEventListener("resize", suGesto);
      window.removeEventListener("pointermove", suPuntatore);
      // Il contesto si libera a mano: lasciarlo al raccoglitore significa
      // tenere occupata la GPU finché non gli va, e i contesti WebGL per
      // scheda sono un numero piccolo e finito.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={tela}
      aria-hidden="true"
      className={className}
      // `pointer-events-none`: sta sotto il marchio, che si tiene premuto per
      // farlo scoppiare. Senza, si mangerebbe quel gesto.
      style={{ pointerEvents: "none" }}
    />
  );
}
