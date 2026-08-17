"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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
 * Perché è fatto dello stesso materiale di tutto il resto della schermata:
 * nessuna luce, nessun riflesso, la stessa equazione e la stessa tavolozza.
 * Non è più un oggetto reso altrove e appoggiato sopra.
 *
 * Per un commit ha anche *causato* il campo — le sorgenti dello sfondo gli
 * orbitavano intorno. Bella idea, e ha spento le onde su mezza pagina: le
 * costanti dello sfondo erano tarate su un centro che non c'era più. La nota
 * sta in `lib/campo.ts`; il legame è rimasto dove è vero e non può rompere
 * niente.
 *
 * E la scala fa il resto. Il vecchio marchio era alto diciassette rem al
 * centro della pagina, dove pretendeva di essere il contenuto. Questo è un
 * segno in cima alla colonna, della misura di un segno — ma non di un'icona:
 * a cinquantasei pixel i filamenti si toccavano e restava un cerchio
 * colorato.
 *
 * ── Il ripiego ──
 *
 * Il PNG originale resta e sparisce solo quando la tela ha davvero disegnato.
 * Senza WebGL il marchio c'è comunque, con la sua immagine: è un logo, e
 * l'unica cosa peggiore di un logo che non si amalgama è un logo che manca.
 */

const FRAMMENTO = `
uniform float carica;

/*
 * ── Perche' il marchio ha un'onda tutta sua ──
 *
 * Prima leggeva il campo nel riferimento dell'hero, come le altre due
 * superfici: era l'idea di «finestra sullo stesso fenomeno». Su un disco di
 * cento pixel dentro un riquadro di settecento, pero', il campo cambia
 * pochissimo da un bordo all'altro. Il risultato non era una spirale: era una
 * macchia di colore quasi uniforme. Nessun errore, nessun sintomo — solo un
 * disegno campionato dove non c'e' niente da vedere.
 *
 * Un marchio deve leggersi alla propria misura. Qui le sorgenti stanno nelle
 * coordinate del disco e i numeri d'onda sono scelti perche' i filamenti
 * compiano il loro giro dentro il cerchio. Il legame con lo sfondo resta dov'e'
 * vero — stessa equazione, stessa tavolozza — e non dove sarebbe costato la
 * leggibilita' del logo.
 *
 * ── La cucitura, e come la si toglie ──
 *
 * atan() salta di 2π sull'asse negativo. Con un numero **intero** di bracci il
 * salto e' invisibile, perche' sin(x + 2πn) = sin(x). Il primo tentativo
 * smorzava l'angolo vicino alla sorgente moltiplicandolo per uno smoothstep —
 * e quel fattore rompeva l'interezza: attraverso il disco compariva una riga
 * dritta e bianca, netta come un graffio.
 *
 * Qui invece si fonde l'onda a spirale con quella **circolare**: entrambe sono
 * continue, la mescolanza pure, e vicino alla sorgente resta il fronte
 * circolare — che e' anche fisicamente giusto, perche' il termine a spirale
 * nasce dalla rotazione e a raggio nullo non c'e' rotazione da vedere.
 */
float ondaM(vec2 q, vec2 s, float k, float w, float bracci) {
  vec2 d = q - s;
  float r = length(d);
  float base = k * r - w * tempo;
  float m = smoothstep(0.0, 0.30, r);
  return mix(sin(base), sin(base + bracci * atan(d.y, d.x)), m) / (0.7 + r * 1.5);
}

void main() {
  // Il disco, in coordinate proprie: -1..1 sul lato corto della tela.
  vec2 q = (gl_FragCoord.xy - 0.5 * risoluzione) / (0.5 * min(risoluzione.x, risoluzione.y));
  float d = length(q);

  // Il bordo si ammorbidisce su un pixel, non su una frazione fissa del
  // raggio: cosi' il contorno e' netto uguale a ottanta pixel e a trecento.
  // Con un valore fisso, da piccolo sarebbe sfocato.
  float px = fwidth(d) * 1.5;
  float dentro = 1.0 - smoothstep(1.0 - px, 1.0, d);

  // Sotto pressione la figura si stringe verso il centro; al rilascio si
  // allarga. E' la sorgente che si carica prima di scaricare nel campo.
  vec2 qq = q * (1.0 + carica * 0.30 - impulso * 0.20);

  float a = ondaM(qq, 0.10 * vec2(cos(tempo * 0.55), sin(tempo * 0.55)), 6.0, 1.30, 3.0)
          + ondaM(qq, 0.55 * vec2(cos(tempo * 0.31 + 2.1), sin(tempo * 0.31 + 2.1)), 4.5, 0.95, 2.0)
          + ondaM(qq, 0.85 * vec2(cos(tempo * 0.23 + 4.2), sin(tempo * 0.23 + 4.2)), 5.5, 1.70, 1.0);

  // ── Filamenti chiari su fondo pieno, non il contrario ──
  //
  // Il primo tentativo teneva le bande colorate su un disco bianco: l'inverso
  // del logo, che e' un disco saturo attraversato da filamenti chiari. La
  // differenza non e' di gusto — e' che il marchio, per essere riconoscibile,
  // deve avere la stessa figura/sfondo dell'originale.
  //
  // Lo spessore minimo (il termine costante accanto a fwidth) e' quello che
  // tiene i filamenti visibili da lontano: lasciato al solo fwidth, sarebbero
  // spessi un pixel e a ottanta pixel di disco sparirebbero.
  float ph = a * 1.35;
  float dist = abs(fract(ph) - 0.5);
  float filo = 1.0 - smoothstep(0.0, fwidth(ph) * 1.5 + 0.11, dist);

  // Lo scarto viene **dopo** le derivate: fwidth() confronta frammenti vicini,
  // e uscendo prima si toglierebbero di mezzo proprio i vicini di chi sta sul
  // contorno del disco — l'unico posto in cui la si guarda.
  if (dentro <= 0.001) discard;

  // La tavolozza del logo: viola in alto a sinistra, ciano in basso a destra.
  // La diagonale e' quella dell'originale e resta fissa rispetto al disco — un
  // marchio deve essere riconoscibile, non cambiare tinta ogni secondo.
  vec3 tinta = mix(VIOLA, CIANO, clamp(0.5 + 0.5 * (q.x - q.y) - 0.12 * a, 0.0, 1.0));

  // Il fondo respira con la fase: e' cio' che nell'immagine sono le zone piu'
  // scure fra un filamento e l'altro, e senza il disco resterebbe piatto.
  vec3 fondo = tinta * (0.42 + 0.56 * (0.5 + 0.5 * sin(a * 1.1)));
  vec3 c = mix(fondo, mix(vec3(1.0), tinta, 0.06), filo);

  // Verso il bordo si scurisce appena: da' al disco il volume che l'immagine
  // otteneva con un'ombra, senza aggiungere una luce che qui non esiste.
  c *= 1.0 - 0.22 * smoothstep(0.55, 1.0, d);

  // Tenendo premuto il titolo la sorgente si accende; al rilascio scarica.
  c += (carica * 0.16 + impulso * 0.28) * tinta;

  colore = vec4(c, dentro);
}`;

export function MarchioCampo({
  className = "",
  /**
   * Il lato del disco, in classi Tailwind.
   *
   * Non diciassette rem come il vecchio marchio d'hero, che pretendeva di
   * essere il contenuto — ma nemmeno la misura di un'icona: a cinquantasei
   * pixel i filamenti si toccavano e la spirale si leggeva come un cerchio
   * colorato. Questa è la misura in cui il segno si riconosce e resta un segno.
   */
  classeDisco = "h-20 w-20 sm:h-28 sm:w-28",
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
      // Qui la densità va alzata. Il tetto di 1,5 difende una tela che copre
      // l'hero — centinaia di migliaia di pixel; questa ne ha diecimila, e a
      // 1,5 un contorno curvo di cento pixel si vede seghettato. Costa niente
      // e si nota subito: è esattamente il caso in cui un limite pensato per
      // un'altra superficie andava riaperto invece che ereditato.
      densitaMassima: 3,
      suVivo: segnalaVivo,
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
      stop();
    };
  }, [segnalaVivo]);

  return (
    <div ref={scatola} className={`relative ${classeDisco} ${className}`}>
      {!vivo && (
        <Image
          src="/logo-vybes.png"
          alt=""
          width={320}
          height={320}
          priority
          className="absolute inset-0 h-full w-full object-contain"
          sizes="112px"
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
