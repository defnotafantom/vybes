"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { avviaCampo } from "@/lib/tela-campo";

/**
 * Il titolo della landing, attraversato dal campo.
 *
 * ── Perché il marchio grande è sparito da qui ──
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
 * 3. **Poche cose, enormi**, ancorate a un bordo invece che impilate al centro.
 * 4. **Quasi nessun colore**: l'impatto viene dalla scala e dal movimento.
 *
 * Il centro della pagina pretendeva un oggetto, e qualunque oggetto ci fosse
 * finito avrebbe stonato — perché doveva convivere con un campo che occupava
 * lo stesso spazio. Il marchio è tornato, ma piccolo e in cima alla colonna,
 * dove è la sorgente del campo invece di essere in gara con lui
 * (`MarchioCampo.tsx`).
 *
 * ── Cosa fa questo componente ──
 *
 * Il titolo diventa lui l'oggetto: le lettere sono una **finestra sul campo**.
 * La tela disegna la stessa figura d'interferenza dello sfondo, ma solo dentro
 * i glifi, e li sposta lungo la fase dell'onda — le parole vibrano.
 *
 * ── Perché combacia con lo sfondo invece di essere una seconda onda ──
 *
 * Le tre tele valutano la **stessa funzione nello stesso sistema di
 * riferimento**: ognuna riceve la propria posizione dentro l'hero e la somma
 * alle coordinate del frammento. Le frange attraversano il bordo delle lettere
 * senza uno scalino. Senza quell'accorgimento si vedrebbero onde diverse, ed è
 * precisamente il difetto — più linguaggi visivi in una pagina sola — che si
 * sta correggendo.
 *
 * ── Perché il testo non è disegnato dallo shader ──
 *
 * Perché non tocca a lui impaginarlo. La tela **copia l'impaginazione che il
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

const FRAMMENTO = `
uniform sampler2D testo;   // le lettere, gia' impaginate dal browser
uniform float carica;      // 0..1 mentre si tiene premuto

void main() {
  vec2 p = punto(gl_FragCoord.xy);
  float a = campo(p);

  // ── Le lettere vibrano ──
  //
  // Si campiona la maschera in un punto spostato lungo la fase dell'onda: dove
  // il fronte passa, il bordo del glifo si sposta di un paio di pixel. Non e'
  // un tremolio casuale — e' lo stesso valore che disegna le frange, quindi la
  // deformazione e la figura si muovono insieme.
  //
  // L'ampiezza a riposo e' volutamente piccola: a fermarsi a guardarla si
  // vede, leggendo no. Un titolo che si muove mentre lo si legge non e' uno
  // stile, e' un ostacolo. Cresce solo quando lo si tiene premuto, cioe'
  // quando muoversi e' la risposta a un gesto.
  //
  // La correzione sul secondo asse serve perche' le coordinate di trama vanno
  // da 0 a 1 su entrambi i lati: senza, uno spostamento diagonale su una tela
  // larga e bassa diventa quasi orizzontale.
  float ampiezza = 0.0011 + carica * 0.0055 + impulso * 0.0035;
  vec2 spinta = vec2(cos(a * 3.0), sin(a * 3.0)) * ampiezza;
  spinta.y *= risoluzione.x / max(1.0, risoluzione.y);

  float maschera = texture(testo, gl_FragCoord.xy / risoluzione + spinta).a;

  // Le frange si calcolano **prima** dello scarto. fwidth() e' una derivata:
  // la ricava confrontando frammenti vicini, e un discard eseguito prima
  // toglie di mezzo proprio quei vicini. La derivata sul contorno delle
  // lettere diventerebbe indefinita — sfarfallio esattamente sul bordo, cioe'
  // nell'unico posto dove lo si guarda.
  float linea = frange(a);
  if (maschera <= 0.001) discard;

  vec3 tinta = mix(VIOLA, CIANO, 0.5 + 0.5 * sin(a * 0.9));
  tinta = mix(tinta, ROSA, 0.14 * smoothstep(0.7, 1.3, abs(a)));

  // ── Perche' le lettere non sono *fatte* di frange ──
  //
  // Riempire i glifi con il solo motivo li renderebbe striati e a tratti
  // trasparenti: un titolo che si legge a fatica non e' uno stile, e' un
  // titolo rotto. La base resta il colore del testo del tema, pieno; le frange
  // lo accendono attraversandolo. Il contrasto e' quello di prima, il
  // movimento e' nuovo.
  vec3 inchiostro = mix(vec3(0.965, 0.960, 0.985), vec3(0.055, 0.055, 0.075), chiaro);
  vec3 c = mix(inchiostro, tinta, 0.14 + 0.40 * linea);

  colore = vec4(c, maschera);
}`;

/** Millisecondi di pressione per la carica piena. */
const CARICA_PIENA = 900;
/** Sotto questa soglia è un tocco: impulso ridotto. */
const SOGLIA_TOCCO = 140;

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
  // ogni volta che il componente si ridisegna — compreso il rendering che
  // `setVivo` provoca da sé.
  const testoRighe = useRef(righe);
  testoRighe.current = righe;
  const chiave = righe.join("\n");

  const titolo = useRef<HTMLHeadingElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const carica = useRef(0);
  const premuto = useRef(0);

  /**
   * La tela ha disegnato almeno un fotogramma?
   *
   * Finché è falso il titolo è quello normale. Non è prudenza generica: è
   * l'`h1` sopra la piega, e un istante in cui il titolo della pagina non c'è
   * si nota più di qualunque effetto.
   */
  const [vivo, setVivo] = useState(false);
  const segnalaVivo = useCallback(() => setVivo(true), []);

  const premi = useCallback(() => {
    premuto.current = Date.now();
    carica.current = 1;
    // Il marchio è la sorgente: mentre il titolo si carica, si carica anche
    // lui. È l'unico momento in cui i due si muovono insieme, ed è quello che
    // rende visibile che sono la stessa cosa.
    window.dispatchEvent(new CustomEvent("vybes:carica", { detail: { valore: 1 } }));
  }, []);

  const rilascia = useCallback(() => {
    if (!premuto.current) return;
    const tenuto = Date.now() - premuto.current;
    premuto.current = 0;
    carica.current = 0;
    window.dispatchEvent(new CustomEvent("vybes:carica", { detail: { valore: 0 } }));
    window.dispatchEvent(
      new CustomEvent("vybes:impulso", {
        detail: { forza: tenuto < SOGLIA_TOCCO ? 0.35 : Math.min(1, tenuto / CARICA_PIENA) },
      })
    );
  }, []);

  useEffect(() => {
    const canvas = tela.current;
    const h1 = titolo.current;
    if (!canvas || !h1) return;

    let trama: WebGLTexture | null = null;
    let caricaOra = 0;

    /**
     * La trama delle lettere.
     *
     * Non impagina niente: legge dall'`h1` reale corpo, peso, famiglia,
     * crenatura, allineamento e interlinea, e ridisegna le stesse righe nelle
     * stesse posizioni. È una copia della decisione del browser, non una
     * seconda decisione.
     *
     * La base di riga combacia per costruzione e non per fortuna: la CSS
     * centra la scatola ascendente/discendente dentro la riga, e
     * `textBaseline = "middle"` centra la stessa scatola. Vale per qualunque
     * interlinea, compresa una più stretta dei glifi.
     */
    function componiTesto(
      gl: WebGL2RenderingContext,
      larghezza: number,
      altezza: number,
      densita: number,
      riquadroTela: DOMRect
    ) {
      if (!h1 || larghezza === 0 || altezza === 0) return;
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
      // `letterSpacing` non esiste su tutti i browser: dove manca il disegno
      // resta un filo più largo del testo vero. È una differenza di frazioni
      // di pixel su un titolo che comunque copre l'originale.
      const c2d = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
      if ("letterSpacing" in c2d) c2d.letterSpacing = stile.letterSpacing;
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";

      const rt = h1.getBoundingClientRect();
      const centrato = stile.textAlign === "center";
      ctx.textAlign = centrato ? "center" : "left";
      const sinistra = rt.left - riquadroTela.left;
      const alto = rt.top - riquadroTela.top;
      const x = centrato ? sinistra + rt.width / 2 : sinistra;

      testoRighe.current.forEach((riga, i) => {
        ctx.fillText(riga, x, alto + interlinea * (i + 0.5));
      });

      gl.bindTexture(gl.TEXTURE_2D, trama);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, d);
    }

    return avviaCampo(canvas, {
      nome: "TitoloOnda",
      frammento: FRAMMENTO,
      uniformi: ["testo", "carica"],
      // Il primo disegno aspetta il font. Disegnando subito, la trama
      // conterrebbe le lettere del carattere di ripiego — larghezze diverse,
      // quindi un titolo sfalsato rispetto a quello vero sotto. È l'unica
      // attesa di questo componente, e finché dura si vede il titolo normale.
      attendi: document.fonts?.ready,
      suVivo: segnalaVivo,
      suProgramma: (gl, posti) => {
        trama = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, trama);
        // `CLAMP_TO_EDGE`: la maschera viene campionata **spostata**, quindi
        // vicino al bordo si legge fuori dalla trama. Ripetendola, un glifo
        // del margine destro ricomparirebbe a sinistra.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.uniform1i(posti.testo, 0);
      },
      suMisura: ({ gl, larghezza, altezza, densita, tela: t }) =>
        componiTesto(gl, larghezza, altezza, densita, t),
      suFotogramma: (gl, posti) => {
        // La carica insegue: comparendo di colpo, il gonfiarsi delle lettere
        // sembrerebbe uno scatto invece di una tensione che sale.
        caricaOra += (carica.current - caricaOra) * 0.12;
        gl.uniform1f(posti.carica, caricaOra);
      },
    });
  }, [chiave, segnalaVivo]);

  return (
    <div className={`relative ${className}`}>
      <h1
        ref={titolo}
        className={classeTitolo}
        // Trasparente, non nascosto: il testo resta nel documento e
        // nell'albero di accessibilità, e continua a occupare lo stesso spazio
        // — la tela ci disegna sopra, allineata al pixel.
        style={vivo ? { color: "transparent" } : undefined}
      >
        {righe.map((riga) => (
          // `whitespace-nowrap` non è un gusto, è un requisito: la tela disegna
          // **una riga per elemento**, e una riga che andasse a capo da sé
          // comparirebbe nel documento su due righe e sulla tela su una. Le
          // interruzioni le decide chi passa `righe`, e la misura del titolo va
          // scelta perché la più lunga ci stia.
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
