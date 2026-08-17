"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Il marchio, in tre dimensioni vere.
 *
 * ── Perché smette di essere un'immagine ──
 *
 * Il marchio era un PNG: un oggetto reso altrove, lucido, con la propria luce
 * e i propri riflessi. Sotto c'era il campo d'onda, disegnato qui, piatto e
 * fatto di linee. Due grammatiche visive diverse sulla stessa schermata —
 * l'una renderizzata, l'altra tracciata — e nessuna quantità di ritocchi le
 * avrebbe fatte convivere, perché il problema non era il colore: era che
 * raccontavano due storie.
 *
 * Adesso il marchio è disegnato **dallo stesso motore, con la stessa
 * tavolozza e dallo stesso fenomeno** del campo dietro: fronti d'onda emessi
 * da una sorgente che ruota. Là sono frange su un piano, qui sono solchi su
 * un anello. È la stessa equazione in due e in tre dimensioni.
 *
 * ── Che cos'è, geometricamente ──
 *
 * Un toro la cui sezione è increspata da un'onda che avanza lungo la
 * circonferenza. Non è un modello caricato da un file: è una **funzione di
 * distanza con segno**, cioè una formula che per ogni punto dello spazio dice
 * quanto dista dalla superficie. Il raggio la percorre a passi grandi quanto
 * quella distanza — finché non tocca.
 *
 * ── Perché senza Three.js ──
 *
 * Three.js serve a comporre una scena: mesh, materiali, luci, un grafo. Qui
 * non c'è nessuna di quelle cose. C'è una formula e un raggio, e la libreria
 * non avrebbe niente da gestire — porterebbe centinaia di kilobyte per
 * disegnare un quadrato su cui gira del codice che avrei scritto comunque.
 * Le dipendenze di produzione restano sedici.
 *
 * ── Il ripiego, che qui conta più del solito ──
 *
 * Questo è il marchio, non uno sfondo: se non si disegna, la pagina perde la
 * propria identità. Quindi finché WebGL non ha davvero prodotto un
 * fotogramma resta l'immagine di prima, e solo allora si scambiano. Nessun
 * istante in cui il posto del logo è vuoto.
 */

const VERTICE = `#version 300 es
in vec2 posizione;
void main() { gl_Position = vec4(posizione, 0.0, 1.0); }`;

const FRAMMENTO = `#version 300 es
precision highp float;

uniform vec2  risoluzione;
uniform float tempo;
uniform vec2  puntatore;   // inclinazione voluta, gia' addolcita dal lato JS
uniform float carica;      // 0..1 mentre si tiene premuto il marchio
out vec4 colore;

const vec3 VIOLA = vec3(0.545, 0.361, 0.965);
const vec3 CIANO = vec3(0.024, 0.714, 0.831);
const vec3 ROSA  = vec3(0.925, 0.282, 0.600);

// Raggio maggiore dell'anello e della sua sezione.
const float R = 0.62;
const float r = 0.20;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

/*
 * La superficie.
 *
 * Un toro, piu' un'increspatura che dipende da due angoli: quello lungo la
 * circonferenza e quello attorno alla sezione. Il termine nel tempo la fa
 * scorrere, ed e' cio' che rende i solchi **fronti d'onda** invece di
 * scanalature ferme.
 *
 * La carica gonfia l'increspatura: tenendo premuto il marchio si vede
 * l'energia accumularsi nella superficie prima di essere rilasciata nel campo.
 */
float superficie(vec3 p) {
  float ang = atan(p.z, p.x);
  vec2  q   = vec2(length(p.xz) - R, p.y);
  float sez = atan(q.y, q.x);

  float onda = sin(3.0 * ang + 7.0 * sez - tempo * 1.1);
  float ampiezza = 0.030 + carica * 0.045;

  return length(q) - (r + onda * ampiezza);
}

// La normale, per differenze finite: quattro campionamenti invece di sei,
// disposti sui vertici di un tetraedro.
vec3 normale(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0012;
  return normalize(
      e.xyy * superficie(p + e.xyy)
    + e.yyx * superficie(p + e.yyx)
    + e.yxy * superficie(p + e.yxy)
    + e.xxx * superficie(p + e.xxx)
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * risoluzione) / min(risoluzione.x, risoluzione.y);

  // Camera fissa che guarda l'origine. Non c'e' una matrice di proiezione:
  // per una scena con un oggetto solo, costruire il raggio a mano e' piu'
  // corto di qualunque astrazione.
  vec3 origine = vec3(0.0, 0.0, 2.35);
  vec3 raggio  = normalize(vec3(uv * 1.25, -1.6));

  // L'inclinazione segue chi guarda, e l'oggetto ruota lentamente per conto
  // suo: senza la seconda, fermando il cursore il marchio diventa una figura
  // ferma e si vede che e' un disegno.
  float bx = -puntatore.y * 0.5;
  float by =  puntatore.x * 0.7 + tempo * 0.22;

  // ── Il taglio che rende questo sostenibile ──
  //
  // Il toro sta tutto dentro una sfera di raggio R + r + un margine. I pixel
  // il cui raggio non la interseca — la maggioranza, perche' il marchio
  // occupa una frazione del quadrato — escono qui senza fare un solo passo di
  // marcia. Senza questo controllo ogni pixel del riquadro pagherebbe
  // quarantotto valutazioni della superficie per restituire trasparenza.
  float b = dot(origine, raggio);
  float c = dot(origine, origine) - (R + r + 0.12) * (R + r + 0.12);
  float disc = b * b - c;
  if (disc < 0.0) { colore = vec4(0.0); return; }

  float t = max(0.0, -b - sqrt(disc));
  float tMax = -b + sqrt(disc);

  float d = 0.0;
  bool colpito = false;
  for (int i = 0; i < 48; i++) {
    vec3 p = origine + raggio * (t + d);
    // Il punto si porta nel sistema dell'oggetto ruotando *lui* invece della
    // superficie: una rotazione sul punto costa due moltiplicazioni, ruotare
    // la formula costerebbe riscriverla.
    vec3 q = p;
    q.yz *= rot(bx);
    q.xz *= rot(by);

    float dist = superficie(q);
    if (dist < 0.0016) { colpito = true; break; }
    d += dist;
    if (t + d > tMax) break;
  }

  if (!colpito) { colore = vec4(0.0); return; }

  vec3 p = origine + raggio * (t + d);
  vec3 q = p;
  q.yz *= rot(bx);
  q.xz *= rot(by);
  vec3 n = normale(q);

  // ── La luce ──
  //
  // Nessuna lampada: il colore viene dalla **direzione** della superficie e
  // dalla fase dell'onda che la increspa. E' la ragione per cui il marchio
  // sta insieme al campo dietro — non e' illuminato, e' acceso, come le
  // frange.
  float bordo = pow(1.0 - abs(dot(n, -raggio)), 2.2);          // fresnel
  float luce  = 0.5 + 0.5 * dot(n, normalize(vec3(0.4, 0.8, 0.6)));

  float ang = atan(q.z, q.x);
  vec2  sq  = vec2(length(q.xz) - R, q.y);
  float fase = sin(3.0 * ang + 7.0 * atan(sq.y, sq.x) - tempo * 1.1);

  vec3 tinta = mix(VIOLA, CIANO, 0.5 + 0.5 * fase);
  tinta = mix(tinta, ROSA, 0.30 * bordo);
  tinta *= 0.35 + 0.85 * luce;
  // Il bordo si accende: e' quello che da' a un oggetto senza texture l'aria
  // di avere un volume invece di essere una silhouette colorata.
  tinta += bordo * 0.55 * mix(VIOLA, CIANO, 0.5);

  colore = vec4(tinta, 1.0);
}`;

function compila(gl: WebGL2RenderingContext, tipo: number, sorgente: string) {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, sorgente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[MarchioWebGL] shader:\n${gl.getShaderInfoLog(s) ?? ""}`);
    }
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function MarchioWebGL({
  className,
  carica = 0,
  onVivo,
}: {
  className?: string;
  /** 0..1 mentre il marchio è tenuto premuto. */
  carica?: number;
  /** Chiamato quando il primo fotogramma è davvero uscito. */
  onVivo?: () => void;
}) {
  const tela = useRef<HTMLCanvasElement>(null);
  const caricaRef = useRef(carica);
  const [, forza] = useState(0);
  caricaRef.current = carica;

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compila(gl, gl.VERTEX_SHADER, VERTICE);
    const fs = compila(gl, gl.FRAGMENT_SHADER, FRAMMENTO);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "posizione");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRis = gl.getUniformLocation(prog, "risoluzione");
    const uTempo = gl.getUniformLocation(prog, "tempo");
    const uPunt = gl.getUniformLocation(prog, "puntatore");
    const uCarica = gl.getUniformLocation(prog, "carica");

    const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // L'inclinazione insegue il puntatore invece di saltarci sopra: la stessa
    // ragione del campo dietro — un oggetto che si allinea di scatto sembra
    // un valore, uno che ci arriva sembra avere un peso.
    const verso = { x: 0, y: 0 };
    const ora = { x: 0, y: 0 };

    function segui(e: PointerEvent) {
      verso.x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      verso.y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    }

    function misura() {
      if (!canvas || !gl) return;
      // Il marchio è piccolo e il raymarching costa: densità a 1 sotto i 640px
      // e comunque mai oltre 1,5.
      const dens = Math.min(1.5, window.devicePixelRatio || 1, window.innerWidth < 640 ? 1 : 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dens));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dens));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    let primo = true;
    function disegna(sec: number) {
      if (!gl || !canvas) return;
      misura();
      ora.x += (verso.x - ora.x) * 0.12;
      ora.y += (verso.y - ora.y) * 0.12;
      gl.uniform2f(uRis, canvas.width, canvas.height);
      gl.uniform1f(uTempo, sec);
      gl.uniform2f(uPunt, ora.x, ora.y);
      gl.uniform1f(uCarica, caricaRef.current);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (primo) {
        primo = false;
        // Solo adesso l'immagine di ripiego può sparire: prima di questo
        // istante il posto del marchio sarebbe rimasto vuoto.
        onVivo?.();
        forza((n) => n + 1);
      }
    }

    let richiesta = 0;
    const inizio = performance.now();
    function ciclo(t: number) {
      disegna((t - inizio) / 1000);
      richiesta = requestAnimationFrame(ciclo);
    }

    disegna(4.0);
    if (!menoMovimento) {
      richiesta = requestAnimationFrame(ciclo);
      window.addEventListener("pointermove", segui, { passive: true });
    }

    const osservatore = new IntersectionObserver(([v]) => {
      if (menoMovimento) return;
      if (v.isIntersecting && !richiesta) richiesta = requestAnimationFrame(ciclo);
      else if (!v.isIntersecting && richiesta) {
        cancelAnimationFrame(richiesta);
        richiesta = 0;
      }
    });
    osservatore.observe(canvas);

    return () => {
      if (richiesta) cancelAnimationFrame(richiesta);
      osservatore.disconnect();
      window.removeEventListener("pointermove", segui);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [onVivo]);

  return <canvas ref={tela} aria-hidden="true" className={className} />;
}
