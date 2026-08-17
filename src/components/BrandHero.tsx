"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/constants";

/**
 * Marchio grande della landing, con l'esplosione a inchiostro.
 *
 * Tenendo premuto il marchio, questo cresce; oltre la soglia di carica scoppia
 * e schizza il fondo di macchie, che poi svaniscono.
 *
 * ── Perché tenere premuto e non cliccare ──
 *
 * Un clic è istantaneo e non lascia spazio a nulla: l'esplosione arriverebbe
 * senza preavviso, e metà dell'effetto è l'attesa. Tenere premuto costruisce
 * la tensione — si vede il marchio caricarsi — e il rilascio la scarica. È lo
 * stesso motivo per cui in Splatoon il colpo carico si carica.
 *
 * Un tocco breve non resta però senza risposta: sotto la soglia esplode
 * comunque, in piccolo. Un comando che non fa niente sembra rotto, e la
 * maggior parte delle persone al primo tentativo tocca e basta.
 *
 * ── Il costo, dichiarato ──
 *
 * Questo è l'unico componente client della landing. Serve davvero: la durata
 * della pressione va misurata, e nessuna combinazione di CSS la misura.
 * Il resto della pagina resta renderizzato sul server.
 */

/** Millisecondi di pressione per la carica piena. */
const CARICA_PIENA = 900;
/** Sotto questa soglia è un tocco: esplosione ridotta. */
const SOGLIA_TOCCO = 140;



export function BrandHero() {
  const [carica, setCarica] = useState(false);

  /**
   * Di quanto il marchio è inclinato, in gradi.
   *
   * Sta in stato di React e non in una variabile perché qui il valore *è* il
   * rendering: cambia poche volte al secondo — la transizione CSS copre il
   * resto — e non a ogni pixel come nel campo d'onda dietro, dove infatti si
   * usa una variabile.
   */
  const [inclina, setInclina] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Chi ha disattivato le animazioni non riceve nemmeno questa: un oggetto
    // che si muove seguendo il cursore è esattamente il tipo di movimento
    // periferico che dà fastidio a chi ha un disturbo vestibolare.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function segui(e: PointerEvent) {
      // Rispetto al centro della finestra, non del marchio: usando il marchio
      // l'inclinazione si azzererebbe ogni volta che il cursore ci passa
      // sopra, cioè proprio quando qualcuno lo sta guardando.
      const dx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setInclina({
        // L'asse X ruota **contro** il movimento verticale: è quello che dà
        // l'impressione di guardare un oggetto da sopra o da sotto invece di
        // vederlo scivolare.
        x: Math.max(-12, Math.min(12, -dy * 12)),
        y: Math.max(-12, Math.min(12, dx * 12)),
      });
    }

    window.addEventListener("pointermove", segui, { passive: true });
    return () => window.removeEventListener("pointermove", segui);
  }, []);
  const inizio = useRef(0);
  const timerScoppio = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulizia all'uscita: un timer che scatta su un componente smontato
  // aggiornerebbe uno stato che non esiste più.
  useEffect(
    () => () => {
      if (timerScoppio.current) clearTimeout(timerScoppio.current);
    },
    []
  );

  /**
   * Lo scoppio, adesso che non ci sono più macchie.
   *
   * Rilasciando, il marchio scarica un impulso **nel campo dietro**: le frange
   * si allargano di colpo e poi tornano. È la cosa che il concetto chiedeva
   * dall'inizio — una vibrazione si propaga, non schizza — e che la vernice
   * impediva di vedere, perché copriva mezzo schermo proprio nell'istante in
   * cui il campo avrebbe dovuto reagire.
   *
   * L'impulso viaggia su un evento del documento e non per proprietà: il campo
   * è un fratello nell'albero, non un figlio, e farlo risalire fino a un
   * antenato comune per poi ridiscendere avrebbe legato due componenti che non
   * hanno altro da dirsi.
   */
  const esplodi = useCallback((forza: number) => {
    window.dispatchEvent(new CustomEvent("vybes:impulso", { detail: { forza } }));
  }, []);

  const premi = useCallback(() => {
    inizio.current = Date.now();
    setCarica(true);
    // Chi tiene premuto all'infinito non resta in attesa all'infinito: a
    // carica piena parte da sé.
    timerScoppio.current = setTimeout(() => {
      setCarica(false);
      esplodi(1);
      inizio.current = 0;
    }, CARICA_PIENA);
  }, [esplodi]);

  const rilascia = useCallback(() => {
    if (timerScoppio.current) clearTimeout(timerScoppio.current);
    if (!inizio.current) return; // già esploso da sé
    const tenuto = Date.now() - inizio.current;
    inizio.current = 0;
    setCarica(false);
    esplodi(tenuto < SOGLIA_TOCCO ? 0.35 : Math.min(1, tenuto / CARICA_PIENA));
  }, [esplodi]);

  return (
    <>
      {/* ── Gli schizzi d'inchiostro sono stati tolti ──

          Erano il terzo linguaggio visivo di questa pagina, dopo il marchio
          reso in tre dimensioni e il campo d'onda: una texture pittorica, con
          una sua tavolozza, sopra due cose che non c'entravano niente con la
          pittura. Non stonavano per un colore sbagliato — stonavano perché
          raccontavano un'altra storia.

          Erano nati quando la landing non aveva un concetto: allora un
          divertimento valeva per sé. Adesso il concetto c'è — vibrazioni,
          fronti che si propagano — e una macchia di vernice non è una
          vibrazione. Tolti.

          La pressione resta: il marchio si carica e reagisce, e quel gesto è
          la cosa che la gente prova. Cambia solo cosa produce, e lo produce
          il campo dietro. */}
      <div className="brand flex flex-col items-center">
        <button
          type="button"
          // Un elemento interattivo va annunciato per quello che fa. È un
          // divertimento, non una funzione — ma chi naviga da tastiera ha
          // diritto di saperlo e di provarlo.
          aria-label="Tieni premuto per far esplodere il logo"
          className="brand-innesco"
          onPointerDown={premi}
          onPointerUp={rilascia}
          onPointerLeave={rilascia}
          onPointerCancel={rilascia}
          /* Su Android tenere premuto apriva il menu contestuale sopra
             l'animazione — e sull'SVG «salva immagine», che di questo marchio
             salverebbe un fotogramma a caso.
             Qui si può togliere senza rimpianti: non è un collegamento, è
             l'innesco di un'animazione, e non esiste un uso sensato del tasto
             destro su un innesco. Sul logotipo in barra invece il menu resta,
             perché lì «apri in una scheda nuova» è una cosa che la gente fa. */
          onContextMenu={(e) => e.preventDefault()}
          // Spazio e Invio: `repeat` scarta le ripetizioni automatiche del
          // tasto tenuto giù, che altrimenti farebbero ripartire il timer
          // decine di volte al secondo.
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              premi();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") rilascia();
          }}
        >
          {/* ── L'inclinazione ──

              Il marchio prende una prospettiva e si inclina verso chi guarda,
              seguendo il puntatore. Non è un'animazione che parte da sola: è
              una **risposta**, e la differenza si sente — un oggetto che
              reagisce sembra avere una posizione nello spazio, uno che ruota
              per conto suo sembra una GIF.

              Sono trasformazioni CSS, non una scena 3D: la spirale è già un
              disegno, e farla diventare geometria vera costerebbe una libreria
              intera per un risultato che a questa scala non si distingue.

              L'ampiezza è deliberatamente piccola, dodici gradi. Oltre, il
              marchio si deforma abbastanza da non essere più leggibile come
              marchio — e un logo che a tratti non si riconosce ha smesso di
              fare il suo mestiere. */}
          <div
            className="brand-glow brand-float relative"
            style={{
              transform: `perspective(900px) rotateX(${inclina.x}deg) rotateY(${inclina.y}deg)`,
              transformStyle: "preserve-3d",
              // Segue con un ritardo percettibile ma breve: senza transizione
              // scatta a ogni pixel, con più di 300ms sembra che il marchio
              // arrivi in ritardo alle intenzioni di chi lo muove.
              transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div className="brand-scale">
              <div className="brand-spin">
                <Image
                  src="/logo-vybes.png"
                  alt=""
                  width={512}
                  height={512}
                  priority
                  // Il marchio è l'elemento più grande sopra la piega: se
                  // arriva tardi è lui a definire l'LCP.
                  //
                  // La misura è relativa alla finestra e non ai breakpoint:
                  // 34vmin è poco più di un terzo del lato corto, quindi la
                  // proporzione fra marchio e spazio libero resta la stessa su
                  // un telefono e su un monitor.
                  className="h-[clamp(10rem,34vmin,24rem)] w-[clamp(10rem,34vmin,24rem)] object-contain drop-shadow-2xl"
                  sizes="(max-width: 640px) 60vw, 34vmin"
                  draggable={false}
                />
              </div>
            </div>

            {/*
              A caricarsi è la scritta, non il marchio.

              Prima cresceva il logo intero, e il gesto si leggeva come uno
              zoom. Così invece nasce qualcosa dal centro della spirale e preme
              per uscire: la scritta è il contenuto, la spirale è il
              contenitore, e l'esplosione è la seconda che cede alla prima.

              Il tetto di espansione la tiene dentro la spirale — arriva a poco
              più di metà del suo diametro. Superarlo romperebbe il racconto:
              qualcosa che è già uscito non ha più motivo di scoppiare.

              `aria-hidden`: il nome del prodotto è già nel titolo sotto, e un
              lettore di schermo non deve sentirlo due volte.
            */}
            {/*
              Tutta bianca, senza il gradiente che «Vy» ha nella barra. Lì
              serve a legare il logotipo al marchio; qui il marchio è già
              intorno, con gli stessi colori, e ripeterli farebbe sparire la
              scritta dentro la spirale. Due materiali diversi si distinguono,
              due volte lo stesso no.
            */}
            <span
              aria-hidden="true"
              className={`brand-scritta ${carica ? "brand-scritta-carica" : ""}`}
            >
              Vybes
            </span>
          </div>
        </button>

        <p className="mt-10 text-center text-fluid-xs font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {SITE.tagline}
        </p>
      </div>
    </>
  );
}
