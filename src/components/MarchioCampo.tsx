"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ANCORA } from "@/lib/campo";
import { avviaCampo } from "@/lib/tela-campo";

/**
 * Il marchio, rivisitato: la spirale disegnata dal campo che emette.
 *
 * ── Che cos'era, e cosa non andava ──
 *
 * Il logo è un disco di filamenti che si avvolgono intorno a un centro, dal
 * viola al blu al ciano, con i vuoti bianchi. Come immagine era un oggetto
 * reso altrove: lucido, con la propria luce e i propri riflessi, appoggiato su
 * una pagina che di luci e riflessi non ne ha. Non stonava per un colore
 * sbagliato — stonava perché era di un altro materiale.
 *
 * ── L'osservazione che risolve tutto ──
 *
 * Quei filamenti **sono già** dei fronti d'onda a spirale. È esattamente la
 * figura che disegna una sorgente che ruota mentre emette, cioè la formula che
 * la pagina sta già valutando per lo sfondo e per il titolo.
 *
 * Quindi il marchio non viene reimportato: viene **rigenerato**. Stessa
 * funzione delle altre due superfici, ritagliata su un disco, con le frange
 * ispessite in nastri invece che ridotte a linee — che è la sola differenza
 * fra il logo e lo sfondo, e la ragione per cui a quarantotto pixel il logo si
 * legge e un reticolo di righe no.
 *
 * ── Perché adesso ci sta ──
 *
 * Perché non è più un oggetto appoggiato sul campo: è la sua **sorgente**.
 * Pubblica la propria posizione in `ANCORA`, e le tre sorgenti dello sfondo
 * orbitano intorno a quel punto. Le spirali partono di lì, visibilmente. Un
 * logo che causa quello che ha intorno non ha bisogno di essere amalgamato:
 * lo è per costruzione.
 *
 * E la scala aiuta quanto il resto. Prima era alto diciassette rem al centro
 * della pagina, dove pretendeva di essere il contenuto. Adesso è un segno in
 * cima a una colonna, della misura di un segno.
 *
 * ── Il ripiego ──
 *
 * Il PNG originale resta e sparisce solo quando la tela ha davvero disegnato.
 * Senza WebGL il marchio c'è comunque, con la sua immagine: è un logo, e
 * l'unica cosa peggiore di un logo che non si amalgama è un logo che manca.
 */

const FRAMMENTO = `
uniform float carica;

void main() {
  // Il disco, in coordinate proprie: -1..1 sul lato corto della tela.
  vec2 q = (gl_FragCoord.xy - 0.5 * risoluzione) / (0.5 * min(risoluzione.x, risoluzione.y));
  float d = length(q);

  // Il bordo si ammorbidisce su un pixel, non su una frazione fissa del
  // raggio: cosi' il contorno e' netto uguale a quarantotto pixel e a
  // duecento. Con un valore fisso, da piccolo sarebbe sfocato.
  float px = fwidth(d) * 1.5;
  float dentro = 1.0 - smoothstep(1.0 - px, 1.0, d);

  // Il campo, letto nel riferimento dell'hero come le altre due superfici: i
  // filamenti del marchio sono la continuazione di quelli dello sfondo.
  float a = campo(punto(gl_FragCoord.xy));

  // ── Nastri, non righe ──
  //
  // Lo sfondo tiene la distanza dal massimo piu' vicino e ne fa una linea di
  // un pixel. Qui serve il contrario: bande larghe, come i filamenti del logo.
  // Si prende la stessa fase e la si squadra con una soglia morbida — meta'
  // pieno, meta' vuoto — e l'ampiezza del passaggio resta legata a fwidth,
  // altrimenti da piccolo le bande si impastano in un grigio.
  float f = fract(a * 1.6);
  float bordo = fwidth(a * 1.6) * 1.5 + 0.02;
  float nastro = smoothstep(0.5 - bordo, 0.5 + bordo, f);

  // Lo scarto viene **dopo** le derivate. fwidth() confronta frammenti vicini:
  // uscendo prima si toglierebbero di mezzo proprio i vicini di chi sta sul
  // contorno del disco, e la larghezza delle bande diventerebbe indefinita
  // lungo tutto il bordo — l'unico posto in cui la si guarda.
  if (dentro <= 0.001) discard;

  // La tavolozza del logo: viola in alto a sinistra, ciano in basso a destra.
  // La diagonale e' quella dell'originale, e resta fissa rispetto al disco —
  // il marchio deve essere riconoscibile, non cambiare colore ogni secondo.
  vec3 tinta = mix(VIOLA, CIANO, clamp(0.5 + 0.42 * (q.x - q.y), 0.0, 1.0));
  tinta = mix(tinta, ROSA, 0.10 * smoothstep(0.6, 1.2, abs(a)));

  // I pieni sono la tinta scurita, i vuoti sono i filamenti chiari
  // dell'originale — che sul tema scuro non diventano grigi: restano chiari,
  // perche' e' quel contrasto a rendere leggibile la spirale.
  vec3 pieno = tinta * 0.62;
  vec3 vuoto = mix(vec3(1.0), tinta, 0.18);
  vec3 c = mix(vuoto, pieno, nastro);

  // Verso il bordo si scurisce appena: da' al disco il volume che l'immagine
  // otteneva con un'ombra, senza aggiungere una luce che qui non esiste.
  c *= 1.0 - 0.22 * smoothstep(0.55, 1.0, d);

  // Tenendo premuto il titolo, la sorgente si carica; al rilascio scarica.
  // E' l'unico momento in cui il marchio si illumina, ed e' anche l'unico in
  // cui sta succedendo qualcosa che lo riguarda.
  c += (carica * 0.18 + impulso * 0.30) * tinta;

  colore = vec4(c, dentro);
}`;

export function MarchioCampo({
  className = "",
  /** Il lato del disco, in classi Tailwind: è un segno, non un'illustrazione. */
  classeDisco = "h-14 w-14",
}: {
  className?: string;
  classeDisco?: string;
}) {
  const scatola = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [vivo, setVivo] = useState(false);
  const segnalaVivo = useCallback(() => setVivo(true), []);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;

    /**
     * La carica arriva dal titolo, che è il pezzo che si tiene premuto.
     *
     * Un secondo evento accanto a `vybes:impulso`, invece di una proprietà:
     * marchio e titolo sono fratelli in punti diversi dell'albero, e legarli
     * per proprietà obbligherebbe a far risalire lo stato fino all'hero e
     * ridiscendere — con un rendering di React per ogni fotogramma di
     * pressione, che è esattamente ciò che si sta evitando.
     */
    let carica = 0;
    let caricaOra = 0;
    const suCarica = (e: Event) => {
      carica = (e as CustomEvent<{ valore: number }>).detail?.valore ?? 0;
    };
    window.addEventListener("vybes:carica", suCarica);

    const stop = avviaCampo(canvas, {
      nome: "MarchioCampo",
      frammento: FRAMMENTO,
      uniformi: ["carica"],
      suVivo: segnalaVivo,
      // ── Il marchio pubblica dov'è ──
      //
      // In coordinate del campo: le stesse in cui gli shader ragionano, così
      // chi legge non deve sapere niente di pixel né di densità. Da qui le
      // sorgenti dello sfondo prendono il loro centro d'orbita.
      suMisura: ({ tela: t, campo: h }) => {
        const lato = Math.min(h.width, h.height) || 1;
        ANCORA.x = (t.left + t.width / 2 - h.left - h.width / 2) / lato;
        ANCORA.y = -(t.top + t.height / 2 - h.top - h.height / 2) / lato;
      },
      // Insegue invece di saltare, con la stessa costante del titolo: i due si
      // gonfiano allo stesso ritmo, ed è quello che li fa leggere come un
      // pezzo solo invece che come due animazioni che partono insieme.
      suFotogramma: (gl, posti) => {
        caricaOra += (carica - caricaOra) * 0.12;
        gl.uniform1f(posti.carica, caricaOra);
      },
    });

    return () => {
      window.removeEventListener("vybes:carica", suCarica);
      // L'ancora torna al centro: smontando la landing, un valore rimasto
      // fermo su una posizione che non esiste più sposterebbe il campo di
      // un'altra pagina senza che niente lo spieghi.
      ANCORA.x = 0;
      ANCORA.y = 0;
      stop();
    };
  }, [segnalaVivo]);

  return (
    <div ref={scatola} className={`relative ${classeDisco} ${className}`}>
      {!vivo && (
        <Image
          src="/logo-vybes.png"
          alt=""
          width={256}
          height={256}
          priority
          className="absolute inset-0 h-full w-full object-contain"
          sizes="56px"
          draggable={false}
        />
      )}
      <canvas
        ref={tela}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
