"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Il titolo della landing, disegnato dal campo d'onda.
 *
 * ── Perché il marchio è sparito da qui ──
 *
 * Per tre versioni il problema è sembrato il logo: prima un PNG lucido, poi un
 * anello raymarchato. Non era il logo. Era la **composizione**: una pila
 * centrata di undici elementi — sfumatura, griglia, campo, velo, marchio che
 * galleggia e ruota, logotipo dentro il marchio, sottotitolo maiuscolo,
 * etichetta con icona, titolo su tre righe, paragrafo, due pulsanti — cioè lo
 * schema esatto di ogni landing di ogni prodotto, con sopra un effetto.
 *
 * Nessuno dei siti premiati fa così. La loro grammatica è un'altra:
 *
 * 1. **Il testo è l'immagine.** Nessun oggetto decorativo al centro; il
 *    marchio sta piccolo in un angolo, che è il posto di un marchio.
 * 2. **Un medium solo, a pieno campo**, non un livello dietro una scheda.
 * 3. **Poche cose, enormi**, ancorate ai bordi invece che impilate al centro.
 * 4. **Quasi nessun colore**: l'impatto viene dalla scala e dal movimento.
 *
 * Il centro della pagina chiedeva un oggetto, e qualunque oggetto ci fosse
 * finito avrebbe stonato — perché doveva convivere con un campo che occupava
 * lo stesso spazio. Tolto l'oggetto, il conflitto non esiste più.
 *
 * ── Cosa fa questo componente ──
 *
 * Il titolo diventa lui l'oggetto: le lettere sono una **finestra sul campo**.
 * La tela disegna la stessa figura d'interferenza dello sfondo, ma solo dentro
 * i glifi, e le sposta lungo la fase dell'onda — le parole vibrano.
 *
 * ── Perché combacia con lo sfondo invece di essere una seconda onda ──
 *
 * Le due tele valutano la **stessa funzione nello stesso sistema di
 * riferimento**: questa riceve la propria posizione dentro l'hero e la somma
 * alle coordinate del frammento. Le frange attraversano il bordo delle lettere
 * senza uno scalino. Senza quell'accorgimento si vedrebbero due onde diverse,
 * ed è precisamente il difetto — due linguaggi visivi — che si sta correggendo.
 *
 * ── Perché il testo non è disegnato dallo shader ──
 *
 * Perché non sono io a impaginarlo. La tela **copia l'impaginazione che il
 * browser ha già fatto**: legge posizione, corpo, peso e crenatura dell'`h1`
 * vero e ridisegna le stesse righe nello stesso punto. Cambiando una classe di
 * Tailwind il disegno segue da sé. L'alternativa — misure scritte a mano nel
 * componente — è la forma di difetto numero due di COLLOQUIO.md: due copie
 * della stessa regola, e una che smette di valere senza dirlo.
 *
 * ── Accessibilità e SEO ──
 *
 * L'`h1` resta nel documento, con il suo testo, nel suo posto: Google lo legge
 * e un lettore di schermo lo annuncia. Quando la tela ha davvero disegnato, il
 * testo diventa `transparent` — **non** `hidden`, che lo toglierebbe
 * dall'albero di accessibilità, e nemmeno `sr-only`, che ne farebbe collassare
 * l'ingombro e sposterebbe mezza pagina.
 *
 * Se WebGL non c'è, o il contesto non si crea, o il font non arriva: resta il
 * titolo normale. Il ripiego non è un caso limite, è lo stato iniziale.
 */

const VERTICE = `#version 300 es
in vec2 posizione;
void main() { gl_Position = vec4(posizione, 0.0, 1.0); }`;

/**
 * Il frammento.
 *
 * Il campo è identico a quello di OndeWebGL — stesse tre sorgenti rotanti,
 * stessa attenuazione, stessa estrazione delle frange. Deve esserlo: le due
 * tele disegnano un unico fenomeno, e una costante diversa qui farebbe
 * comparire una discontinuità sul bordo delle lettere.
 */
const FRAMMENTO = `#version 300 es
precision highp float;

uniform vec2  risoluzione;   // la tela, in pixel del dispositivo
uniform vec2  finestra;      // l'hero: il riquadro in cui il campo e' definito
uniform vec2  origine;       // dove sta la tela dentro l'hero (y dal basso)
uniform float tempo;
uniform float chiaro;        // 1.0 su tema chiaro, 0.0 su scuro
uniform float scorrimento;
uniform vec2  puntatore;
uniform float impulso;
uniform float carica;        // 0..1 mentre si tiene premuto
uniform sampler2D testo;     // le lettere, gia' impaginate dal browser
out vec4 colore;

const vec3 VIOLA = vec3(0.545, 0.361, 0.965);
const vec3 CIANO = vec3(0.024, 0.714, 0.831);
const vec3 ROSA  = vec3(0.925, 0.282, 0.600);

float onda(vec2 p, vec2 sorgente, float k, float omega, float bracci, float t) {
  vec2 d = p - sorgente;
  float r = length(d);
  float th = atan(d.y, d.x);
  return sin(k * r - omega * t + bracci * th) / (1.0 + r * 1.8);
}

void main() {
  // Il punto, misurato nell'hero e non nella tela: e' questa riga che tiene
  // insieme le due superfici. Togliendo origine/finestra il campo dentro le
  // lettere resterebbe bello e non sarebbe piu' lo stesso campo di fuori.
  vec2 g = gl_FragCoord.xy + origine;
  vec2 p = (g - 0.5 * finestra) / min(finestra.x, finestra.y);

  vec2 s1 = 0.45 * vec2(cos(tempo * 0.23), sin(tempo * 0.23));
  vec2 s2 = 0.38 * vec2(cos(-tempo * 0.17 + 2.1), sin(-tempo * 0.17 + 2.1));
  vec2 s3 = 0.55 * vec2(cos(tempo * 0.11 + 4.2), sin(tempo * 0.11 + 4.2));
  s1 = mix(s1, puntatore, 0.5);

  float k = (1.0 + scorrimento * 1.6) * (1.0 - impulso * 0.55);
  float w = 1.0 - scorrimento * 0.45;

  float a = onda(p, s1, 26.0 * k, 1.30 * w, 2.0, tempo)
          + onda(p, s2, 19.0 * k, 0.95 * w, 3.0, tempo)
          + onda(p, s3, 33.0 * k, 1.70 * w, 1.0, tempo);

  // ── Le lettere vibrano ──
  //
  // Si campiona la maschera in un punto spostato lungo la fase dell'onda: dove
  // il fronte passa, il bordo del glifo si sposta di qualche pixel. Non e' un
  // tremolio casuale — e' lo stesso valore che disegna le frange, quindi la
  // deformazione e la figura si muovono insieme.
  //
  // La correzione sul secondo asse serve perche' le coordinate di trama vanno
  // da 0 a 1 su entrambi i lati: senza, uno spostamento diagonale su una tela
  // larga e bassa diventa quasi orizzontale.
  float ampiezza = 0.0022 + carica * 0.010 + impulso * 0.007;
  vec2 spinta = vec2(cos(a * 3.0), sin(a * 3.0)) * ampiezza;
  spinta.y *= risoluzione.x / max(1.0, risoluzione.y);

  vec2 uv = gl_FragCoord.xy / risoluzione + spinta;
  float maschera = texture(testo, uv).a;

  // ── Le frange si calcolano **prima** dello scarto ──
  //
  // fwidth() e' una derivata: la ricava confrontando frammenti vicini. Un
  // discard eseguito prima toglie di mezzo proprio quei vicini, e la derivata
  // sul bordo delle lettere diventa indefinita — righe che sfarfallano lungo i
  // contorni, cioe' l'unico posto dove si guardano. Si calcola per tutti e si
  // scarta dopo.
  float frangia = abs(fract(a * 3.0) - 0.5);
  float linea = 1.0 - smoothstep(0.0, fwidth(a * 3.0) * 1.6 + 0.008, frangia);

  // Fuori dalle lettere non si disegna niente: il campo di fondo c'e' gia',
  // ed e' l'altra tela a farlo. Due strati sullo stesso pixel raddoppierebbero
  // l'intensita' proprio dove il testo deve restare leggibile.
  if (maschera <= 0.001) discard;

  vec3 tinta = mix(VIOLA, CIANO, 0.5 + 0.5 * sin(a * 0.9));
  tinta = mix(tinta, ROSA, 0.14 * smoothstep(0.7, 1.3, abs(a)));

  // ── Perche' le lettere non sono *fatte* di frange ──
  //
  // Riempire i glifi con il solo motivo li renderebbe striati e a tratti
  // trasparenti: un titolo che si legge a fatica non e' uno stile, e' un
  // titolo rotto. La base resta il colore del testo del tema, pieno; le
  // frange lo accendono attraversandolo. Il contrasto e' quello di prima,
  // il movimento e' nuovo.
  vec3 inchiostro = mix(vec3(0.965, 0.960, 0.985), vec3(0.055, 0.055, 0.075), chiaro);
  vec3 c = mix(inchiostro, tinta, 0.22 + 0.55 * linea);

  colore = vec4(c, maschera);
}`;

/** Densità massima: oltre 1,5 non si distingue e la GPU lavora il doppio. */
const DENSITA_MASSIMA = 1.5;
/** Millisecondi di pressione per la carica piena. */
const CARICA_PIENA = 900;
/** Sotto questa soglia è un tocco: impulso ridotto. */
const SOGLIA_TOCCO = 140;

function compila(gl: WebGL2RenderingContext, tipo: number, sorgente: string) {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, sorgente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[TitoloOnda] shader non compilato:\n${gl.getShaderInfoLog(s) ?? "nessun dettaglio"}`
      );
    }
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export function TitoloOnda({
  righe,
  className = "",
  classeTitolo = "",
}: {
  /** Le righe del titolo, già spezzate: la tela userà le stesse. */
  righe: string[];
  className?: string;
  classeTitolo?: string;
}) {
  // Le righe viaggiano per riferimento e la dipendenza è la loro **chiave
  // testuale**: un array letterale cambia identità a ogni rendering, e con
  // quello nelle dipendenze il contesto WebGL verrebbe distrutto e ricreato
  // ogni volta che questo componente si ridisegna — compreso il rendering che
  // `setVivo` provoca da sé.
  const testoRighe = useRef(righe);
  testoRighe.current = righe;
  const chiave = righe.join("\n");

  const scatola = useRef<HTMLDivElement>(null);
  const titolo = useRef<HTMLHeadingElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);

  /**
   * La tela ha disegnato almeno un fotogramma?
   *
   * Finché è falso il titolo è quello normale. Non è prudenza generica: è
   * l'`h1` sopra la piega, e un istante in cui il titolo della pagina non c'è
   * si nota più di qualunque effetto.
   */
  const [vivo, setVivo] = useState(false);
  const carica = useRef(0);
  const premuto = useRef(0);

  const impulsoDa = useCallback((forza: number) => {
    window.dispatchEvent(new CustomEvent("vybes:impulso", { detail: { forza } }));
  }, []);

  const premi = useCallback(() => {
    premuto.current = Date.now();
    carica.current = 1;
  }, []);

  const rilascia = useCallback(() => {
    if (!premuto.current) return;
    const tenuto = Date.now() - premuto.current;
    premuto.current = 0;
    carica.current = 0;
    impulsoDa(tenuto < SOGLIA_TOCCO ? 0.35 : Math.min(1, tenuto / CARICA_PIENA));
  }, [impulsoDa]);

  useEffect(() => {
    const canvas = tela.current;
    const box = scatola.current;
    const h1 = titolo.current;
    if (!canvas || !box || !h1) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

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
        console.warn(`[TitoloOnda] programma non collegato:\n${gl.getProgramInfoLog(programma)}`);
      }
      return;
    }
    gl.useProgram(programma);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const attrib = gl.getAttribLocation(programma, "posizione");
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uRisoluzione = gl.getUniformLocation(programma, "risoluzione");
    const uFinestra = gl.getUniformLocation(programma, "finestra");
    const uOrigine = gl.getUniformLocation(programma, "origine");
    const uTempo = gl.getUniformLocation(programma, "tempo");
    const uChiaro = gl.getUniformLocation(programma, "chiaro");
    const uScorrimento = gl.getUniformLocation(programma, "scorrimento");
    const uPuntatore = gl.getUniformLocation(programma, "puntatore");
    const uImpulso = gl.getUniformLocation(programma, "impulso");
    const uCarica = gl.getUniformLocation(programma, "carica");
    const uTesto = gl.getUniformLocation(programma, "testo");

    const trama = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, trama);
    // `CLAMP_TO_EDGE`: la maschera viene campionata **spostata**, quindi vicino
    // al bordo si legge fuori dalla trama. Ripetendola, un glifo del margine
    // destro ricomparirebbe a sinistra.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.uniform1i(uTesto, 0);

    let larghezza = 0;
    let altezza = 0;
    let densita = 1;

    /**
     * La trama delle lettere.
     *
     * Non impagina niente: legge dall'`h1` reale corpo, peso, famiglia,
     * crenatura, allineamento e interlinea, e ridisegna le stesse righe nelle
     * stesse posizioni. È una copia della decisione del browser, non una
     * seconda decisione.
     */
    function componiTesto() {
      if (!gl || !canvas || !h1 || larghezza === 0) return;
      const d = document.createElement("canvas");
      d.width = larghezza;
      d.height = altezza;
      const ctx = d.getContext("2d");
      if (!ctx) return;

      const stile = getComputedStyle(h1);
      const corpo = parseFloat(stile.fontSize);
      const interlinea =
        stile.lineHeight === "normal" ? corpo * 1.2 : parseFloat(stile.lineHeight);

      ctx.scale(densita, densita);
      ctx.font = `${stile.fontStyle} ${stile.fontWeight} ${corpo}px ${stile.fontFamily}`;
      // `letterSpacing` non esiste su tutti i browser: dove manca, il disegno
      // resta un filo più largo del testo vero. È una differenza di frazioni di
      // pixel su un titolo che comunque copre l'originale.
      const c2d = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ("letterSpacing" in c2d) c2d.letterSpacing = stile.letterSpacing;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";

      const rt = h1.getBoundingClientRect();
      const rc = canvas.getBoundingClientRect();
      const sinistra = rt.left - rc.left;
      const alto = rt.top - rc.top;
      const centrato = stile.textAlign === "center";
      ctx.textAlign = centrato ? "center" : "left";
      const x = centrato ? sinistra + rt.width / 2 : sinistra;

      testoRighe.current.forEach((riga, i) => {
        // Il centro della riga, non la sua base: `middle` toglie di mezzo la
        // metrica dell'ascendente, che varia da font a font e che leggere
        // richiederebbe di misurare un glifo campione.
        ctx.fillText(riga, x, alto + interlinea * (i + 0.5));
      });

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, d);
    }

    function ridimensiona() {
      if (!canvas || !gl) return false;
      densita = Math.min(
        DENSITA_MASSIMA,
        window.devicePixelRatio || 1,
        window.innerWidth < 640 ? 1 : DENSITA_MASSIMA
      );
      const w = Math.floor(canvas.clientWidth * densita);
      const h = Math.floor(canvas.clientHeight * densita);
      if (w === larghezza && h === altezza) return false;
      larghezza = w;
      altezza = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    }

    let impulso = 0;
    let caricaOra = 0;
    let scorrimentoVerso = 0;
    let scorrimentoOra = 0;
    const puntatoreVerso = { x: 0, y: 0 };
    const puntatoreOra = { x: 0, y: 0 };

    /** L'hero: il riquadro in cui il campo di fondo è definito. */
    function riferimento() {
      return (canvas?.closest("[data-campo]") as HTMLElement | null) ?? null;
    }

    function leggiGeometria() {
      if (!canvas) return;
      const rif = riferimento();
      const r = rif ? rif.getBoundingClientRect() : canvas.getBoundingClientRect();
      const rc = canvas.getBoundingClientRect();
      scorrimentoVerso = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      if (gl) {
        gl.uniform2f(uFinestra, r.width * densita, r.height * densita);
        // L'asse verticale di WebGL parte dal basso: l'origine è la distanza
        // fra il fondo dell'hero e il fondo della tela, non fra i due alti.
        gl.uniform2f(uOrigine, (rc.left - r.left) * densita, (r.bottom - rc.bottom) * densita);
      }
    }

    function suPuntatore(e: PointerEvent) {
      const rif = riferimento();
      if (!rif) return;
      const r = rif.getBoundingClientRect();
      const lato = Math.min(r.width, r.height);
      puntatoreVerso.x = (e.clientX - r.left - r.width / 2) / lato;
      puntatoreVerso.y = -((e.clientY - r.top - r.height / 2) / lato);
    }

    const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function disegna(secondi: number) {
      if (!gl || !canvas) return;
      if (ridimensiona()) {
        componiTesto();
        leggiGeometria();
      }
      gl.uniform2f(uRisoluzione, canvas.width, canvas.height);
      gl.uniform1f(uTempo, secondi);
      gl.uniform1f(uChiaro, document.documentElement.classList.contains("dark") ? 0 : 1);

      scorrimentoOra += (scorrimentoVerso - scorrimentoOra) * 0.2;
      puntatoreOra.x += (puntatoreVerso.x - puntatoreOra.x) * 0.2;
      puntatoreOra.y += (puntatoreVerso.y - puntatoreOra.y) * 0.2;
      // La carica insegue anche lei: comparendo di colpo, il gonfiarsi delle
      // lettere sembrerebbe uno scatto invece di una tensione che sale.
      caricaOra += (carica.current - caricaOra) * 0.12;
      gl.uniform1f(uScorrimento, scorrimentoOra);
      gl.uniform2f(uPuntatore, puntatoreOra.x, puntatoreOra.y);
      gl.uniform1f(uCarica, caricaOra);
      impulso *= 0.94;
      gl.uniform1f(uImpulso, impulso);
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

    /**
     * Il primo disegno aspetta il font.
     *
     * Disegnando subito, la trama conterrebbe le lettere del carattere di
     * ripiego — larghezze diverse, quindi un titolo sfalsato rispetto a quello
     * vero sotto. È l'unica attesa di questo componente, e finché dura la
     * pagina mostra il titolo normale: non si perde niente.
     */
    let smontato = false;
    function primoDisegno() {
      if (smontato) return;
      ridimensiona();
      componiTesto();
      leggiGeometria();
      disegna(6.5);
      setVivo(true);
      if (!menoMovimento) avvia();
    }
    if (document.fonts?.status === "loaded") primoDisegno();
    else document.fonts?.ready.then(primoDisegno).catch(() => {});

    function suGesto() {
      leggiGeometria();
      if (menoMovimento) disegna(6.5);
    }

    window.addEventListener("scroll", suGesto, { passive: true });
    window.addEventListener("resize", suGesto, { passive: true });
    window.addEventListener("pointermove", suPuntatore, { passive: true });

    const suImpulso = (e: Event) => {
      const forza = (e as CustomEvent<{ forza: number }>).detail?.forza ?? 1;
      impulso = Math.min(1, impulso + forza);
      if (menoMovimento) disegna(6.5);
    };
    window.addEventListener("vybes:impulso", suImpulso);

    // Il testo va ricomposto quando cambia il suo ingombro: rotazione del
    // telefono, font caricato in ritardo, o una riga che va a capo diversamente
    // perché la finestra si è stretta.
    const osservaMisura = new ResizeObserver(() => {
      if (!ridimensiona()) {
        componiTesto();
        leggiGeometria();
      }
      if (menoMovimento) disegna(6.5);
    });
    osservaMisura.observe(box);

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
      smontato = true;
      ferma();
      osservaMisura.disconnect();
      osservatore.disconnect();
      document.removeEventListener("visibilitychange", suVisibilita);
      window.removeEventListener("scroll", suGesto);
      window.removeEventListener("resize", suGesto);
      window.removeEventListener("pointermove", suPuntatore);
      window.removeEventListener("vybes:impulso", suImpulso);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [chiave]);

  return (
    <div ref={scatola} className={`relative ${className}`}>
      <h1
        ref={titolo}
        className={classeTitolo}
        // Trasparente, non nascosto: il testo resta nel documento e
        // nell'albero di accessibilità, e continua a occupare lo stesso
        // spazio — la tela ci disegna sopra, allineata al pixel.
        style={vivo ? { color: "transparent" } : undefined}
      >
        {righe.map((riga) => (
          // `whitespace-nowrap` non è un gusto, è un requisito: la tela
          // disegna **una riga per elemento**, e una riga che va a capo da sé
          // comparirebbe nel documento su due righe e sulla tela su una. Le
          // interruzioni le decide chi passa `righe`, e la dimensione del
          // titolo va scelta perché la più lunga ci stia.
          <span key={riga} className="block whitespace-nowrap">
            {riga}
          </span>
        ))}
      </h1>

      <canvas
        ref={tela}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* ── L'innesco ──
          Un pulsante trasparente sopra il titolo, invece di gestori sull'`h1`.
          Un titolo è un titolo: dandogli `role="button"` il suo testo
          diventerebbe l'etichetta del comando, e un lettore di schermo
          annuncerebbe l'intestazione della pagina come se fosse un pulsante.
          Così restano due cose distinte, e chi naviga da tastiera trova
          comunque il gesto. */}
      <button
        type="button"
        aria-label="Tieni premuto per far vibrare il titolo"
        className="absolute inset-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ring))] focus-visible:ring-offset-4 focus-visible:ring-offset-[rgb(var(--bg))]"
        onPointerDown={premi}
        onPointerUp={rilascia}
        onPointerLeave={rilascia}
        onPointerCancel={rilascia}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            premi();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") rilascia();
        }}
      />
    </div>
  );
}
