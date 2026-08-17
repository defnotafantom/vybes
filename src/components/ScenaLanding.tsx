"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { MarchioCampo } from "@/components/MarchioCampo";
import { OndeWebGL } from "@/components/OndeWebGL";

/**
 * La landing: una scena sola, che avanza mentre si scorre.
 *
 * ── Cosa è stato tolto, e perché non è una perdita ──
 *
 * Prima qui c'erano nove sezioni: vetrina artisti, prossimi ingaggi, nastro
 * delle città, discipline, riquadri, FAQ. Materiale utile — a chi ha già
 * deciso. A chi arriva per la prima volta chiedevano di leggere una rivista
 * per capire una cosa che si dice in una riga.
 *
 * Adesso la prima schermata fa una cosa sola: dire cos'è questo posto, e
 * chiedere di entrare. Il resto del sito non è sparito — esiste, è indicizzato
 * e il piè di pagina ci porta. Ha smesso di essere il primo ostacolo.
 *
 * ── Perché scorrendo, e non con un'animazione che parte da sola ──
 *
 * Un'animazione automatica ha un ritmo che non è quello di chi guarda: o
 * corre, o fa aspettare. Legandola allo scorrimento il ritmo lo decide il
 * visitatore — si può tornare indietro, fermarsi a metà di una frase,
 * arrivare in fondo in mezzo secondo. È la differenza fra guardare un video e
 * muovere una cosa.
 *
 * ── Come è fatta, e perché così ──
 *
 * Un contenitore alto quattro schermate, e dentro un riquadro `sticky` alto
 * uno. Scorrendo, il contenitore scorre e il riquadro resta: la posizione
 * dello scorrimento dentro il contenitore è l'avanzamento della scena.
 *
 * **Non si intercetta la rotellina.** I siti che lo fanno rompono la barra di
 * scorrimento, il tasto Fine, la ricerca nella pagina, il trascinamento su
 * telefono e la navigazione da tastiera — in cambio di un controllo che qui
 * non serve. `position: sticky` ottiene lo stesso effetto restando dentro le
 * regole del browser.
 *
 * L'avanzamento diventa **una variabile CSS**, non uno stato di React: cambia
 * a ogni pixel di scorrimento, e passarlo per stato vorrebbe dire un rendering
 * per pixel. Con `--avanzamento` il browser ricalcola solo le proprietà che la
 * usano, e sono tutte trasformazioni e opacità — le due cose che sa animare
 * senza toccare il layout.
 *
 * ── Accessibilità ──
 *
 * Il testo delle scene è tutto nel documento fin dall'inizio: nessuna frase
 * viene creata dallo scorrimento. Chi usa un lettore di schermo le sente tutte
 * in ordine, e Google le legge tutte. Lo scorrimento cambia solo opacità e
 * posizione.
 *
 * Con `prefers-reduced-motion` la scena non si comporta come una scena: le
 * frasi restano visibili una sotto l'altra e si scorre come una pagina
 * normale. Non è una versione degradata — è la stessa informazione senza il
 * movimento, che per chi ha un disturbo vestibolare è l'unica versione
 * utilizzabile.
 */

/**
 * Le scene, in ordine.
 *
 * Sono quattro perché quattro è il numero di cose che si ricordano: chi c'è
 * da una parte, chi c'è dall'altra, cosa di solito sta in mezzo, e perché qui
 * non c'è. Toglierne una lascia un buco nel ragionamento; aggiungerne una lo
 * trasforma in una presentazione.
 */
const SCENE = [
  {
    testo: "Qualcuno suona.",
    nota: "Musicisti, DJ, band, ballerini, performer.",
  },
  {
    testo: "Qualcuno lo cerca.",
    nota: "Locali, festival, agenzie, organizzatori.",
  },
  {
    testo: "In mezzo, di solito, c'è qualcun altro.",
    nota: "Un'agenzia, una percentuale, due settimane di attesa.",
  },
  {
    testo: "Qui no.",
    nota: "Vybes è il posto dove si trovano, e basta.",
  },
];

export function ScenaLanding() {
  const pista = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);

  /**
   * A fine corsa compaiono i pulsanti.
   *
   * Questo sì che è uno stato di React, e non una variabile CSS: cambia una
   * volta sola in tutta la scena, e da esso dipende se dei collegamenti sono
   * raggiungibili da tastiera. Un pulsante nascosto solo dall'opacità resta
   * focalizzabile, e chi naviga con il tabulatore ci finirebbe dentro mentre
   * sullo schermo non c'è niente.
   */
  const [arrivato, setArrivato] = useState(false);

  useEffect(() => {
    const p = pista.current;
    const s = palco.current;
    if (!p || !s) return;

    const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (menoMovimento) {
      s.style.setProperty("--avanzamento", "1");
      setArrivato(true);
      return;
    }

    let richiesta = 0;
    let ultimo = -1;

    function misura() {
      richiesta = 0;
      if (!p || !s) return;
      const r = p.getBoundingClientRect();
      // Quanto della pista è già passato sopra il bordo alto, fra 0 e 1.
      // `r.height - innerHeight` è la corsa utile: il riquadro resta appiccicato
      // finché la pista non è finita, e quella differenza è esattamente quanto
      // si può scorrere restando dentro la scena.
      const corsa = Math.max(1, r.height - window.innerHeight);
      const a = Math.min(1, Math.max(0, -r.top / corsa));
      // Si scrive solo se è cambiato di almeno mezzo millesimo: sotto quella
      // soglia non si vede niente e si risparmiano ricalcoli di stile.
      if (Math.abs(a - ultimo) < 0.0005) return;
      ultimo = a;
      s.style.setProperty("--avanzamento", a.toFixed(4));
      setArrivato(a > 0.92);
      // Il campo dietro reagisce all'avanzamento come reagisce al puntatore:
      // è la stessa mano del visitatore su due superfici diverse.
      window.dispatchEvent(new CustomEvent("vybes:carica", { detail: { valore: a } }));
    }

    function suScorrimento() {
      // Un solo calcolo per fotogramma: l'evento di scorrimento può arrivare
      // molte volte fra due disegni, e ricalcolare in mezzo è lavoro buttato.
      if (!richiesta) richiesta = requestAnimationFrame(misura);
    }

    misura();
    window.addEventListener("scroll", suScorrimento, { passive: true });
    window.addEventListener("resize", suScorrimento, { passive: true });
    return () => {
      if (richiesta) cancelAnimationFrame(richiesta);
      window.removeEventListener("scroll", suScorrimento);
      window.removeEventListener("resize", suScorrimento);
    };
  }, []);

  return (
    <div ref={pista} className="scena-pista" data-campo>
      <div ref={palco} className="scena-palco">
        {/* Il campo d'onda, a pieno schermo dietro tutto. Se WebGL non c'è,
            resta il fondo scuro e la scena funziona lo stesso. */}
        <OndeWebGL className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />

        {/* ── Il marchio, al centro e sempre presente ──

            Non entra e non esce: è l'unica cosa che resta ferma mentre le
            parole si danno il cambio, e per questo diventa il perno della
            schermata invece di un elemento fra gli altri. Scorrendo si
            allontana e la sua luce si carica — il gesto lo tocca, e questo
            basta a farlo sembrare l'oggetto della pagina. */}
        <div className="scena-marchio">
          <MarchioCampo classeDisco="h-[min(58vw,20rem)] w-[min(58vw,20rem)]" />
        </div>

        {/* ── Le frasi ──

            Tutte nel documento fin dall'inizio, sovrapposte nello stesso
            punto: lo scorrimento sceglie quale è opaca. Nessuna viene creata o
            distrutta, quindi la pagina che Google legge e quella che un
            lettore di schermo annuncia contengono l'intero ragionamento. */}
        <div className="scena-testi">
          {SCENE.map((s, i) => (
            <div
              key={s.testo}
              className="scena-battuta"
              style={{ "--indice": i, "--totale": SCENE.length } as React.CSSProperties}
            >
              <p className="scena-frase">{s.testo}</p>
              <p className="scena-nota">{s.nota}</p>
            </div>
          ))}
        </div>

        {/* ── L'uscita ──

            Compare solo alla fine, ed è l'unica cosa cliccabile della scena:
            chi è arrivato in fondo ha ricevuto tutta la spiegazione, e a quel
            punto la domanda è una sola. `inert` finché non è il momento —
            l'opacità nasconde agli occhi, non al tabulatore. */}
        <div className="scena-uscita" aria-hidden={!arrivato} inert={!arrivato}>
          <Link href="/registrati" className="btn-primary px-8 py-4 text-fluid-base">
            Crea il tuo profilo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/accedi" className="btn-ghost px-8 py-4 text-fluid-base">
            Ho già un account
          </Link>
        </div>

        {/* Il suggerimento di scorrere sparisce appena si comincia: un invito
            che resta dopo essere stato accolto diventa un rimprovero. */}
        <div className="scena-invito" aria-hidden="true">
          <span className="scena-invito-linea" />
          scorri
        </div>
      </div>
    </div>
  );
}
