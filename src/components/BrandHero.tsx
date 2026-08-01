"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/constants";
import { MACCHIE, INCHIOSTRI } from "@/lib/splat";

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
/** Quanto resta a schermo una macchia prima di sparire del tutto. */
const DURATA_MACCHIA = 2600;

type Schizzo = {
  id: number;
  indice: number;
  colore: string;
  /** Posizione in percentuale della finestra. */
  x: number;
  y: number;
  scala: number;
  rotazione: number;
  ritardo: number;
};

let contatore = 0;

/**
 * Le macchie escono dal centro verso l'esterno, mai al centro esatto: lì c'è
 * il marchio, e una macchia sopra di lui lo coprirebbe proprio nell'istante in
 * cui si guarda.
 */
function generaSchizzi(quanti: number, forza: number): Schizzo[] {
  return Array.from({ length: quanti }, () => {
    const ang = Math.random() * 2 * Math.PI;
    // Il minimo non è zero: sotto le venti unità la macchia finirebbe sopra il
    // marchio e lo coprirebbe proprio nell'istante in cui lo si sta guardando.
    const dist = 20 + Math.random() * 32 * forza;
    return {
      id: contatore++,
      indice: Math.floor(Math.random() * MACCHIE.length),
      colore: INCHIOSTRI[Math.floor(Math.random() * INCHIOSTRI.length)],
      // Le percentuali orizzontali corrono su una finestra più larga che alta:
      // senza allargare la componente x, gli schizzi si stringerebbero in una
      // colonna centrale invece di sporcare tutto lo schermo.
      x: 50 + dist * Math.cos(ang) * 1.7,
      y: 50 + dist * Math.sin(ang),
      scala: (0.5 + Math.random() * 0.9) * (0.6 + forza * 0.7),
      rotazione: Math.random() * 360,
      // Sfalsare le comparse di poche decine di millisecondi trasforma un
      // lampo simultaneo in uno schizzo che si propaga.
      ritardo: Math.random() * 180,
    };
  });
}

export function BrandHero() {
  const [carica, setCarica] = useState(false);
  const [schizzi, setSchizzi] = useState<Schizzo[]>([]);
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

  const esplodi = useCallback((forza: number) => {
    const nuovi = generaSchizzi(Math.round(5 + forza * 9), forza);
    setSchizzi((s) => [...s, ...nuovi]);
    // Rimozione dal DOM dopo la dissolvenza: senza, una pagina lasciata aperta
    // accumulerebbe centinaia di nodi invisibili.
    setTimeout(
      () => setSchizzi((s) => s.filter((x) => !nuovi.some((n) => n.id === x.id))),
      DURATA_MACCHIA + 400
    );
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
      {/* Le macchie stanno fuori dal marchio e coprono la finestra: sono lo
          sfondo che si sporca, non un ornamento del logo. `fixed` perché la
          vernice non deve scorrere con la pagina mentre svanisce. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {schizzi.map((s) => (
          <svg
            key={s.id}
            viewBox="-12 -12 124 124"
            className="macchia absolute"
            // La rotazione passa da una variabile CSS perché il `transform` è
            // già occupato dai keyframes: due dichiarazioni sulla stessa
            // proprietà si sovrascrivono, una variabile letta dentro i
            // keyframes no. Il cast serve perché `CSSProperties` non prevede
            // le proprietà personalizzate.
            style={
              {
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.scala * 17}vmin`,
                height: `${s.scala * 17}vmin`,
                color: s.colore,
                animationDelay: `${s.ritardo}ms`,
                "--rot": `${s.rotazione}deg`,
              } as React.CSSProperties
            }
          >
            <g fill="currentColor">
              <path d={MACCHIE[s.indice].corpo} />
              {MACCHIE[s.indice].gocce.map((g, i) => (
                <circle key={i} cx={g.cx} cy={g.cy} r={g.r} />
              ))}
            </g>
          </svg>
        ))}
      </div>

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
          <div className="brand-glow brand-float relative">
            <div className={carica ? "brand-carica" : "brand-scale"}>
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
          </div>
        </button>

        <p className="mt-10 text-center text-fluid-xs font-semibold uppercase tracking-[0.22em] text-ink-faint">
          {SITE.tagline}
        </p>
      </div>
    </>
  );
}
