"use client";

import { useEffect, useRef } from "react";
import { avviaCampo } from "@/lib/tela-campo";

/**
 * Il campo d'onda della landing: lo sfondo.
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
 * Perché sono la stessa figura del marchio. La spirale del logo è fatta di
 * filamenti che si avvolgono intorno a un centro: esattamente ciò che disegna
 * una sorgente che ruota mentre emette. Qui è quel fenomeno grande e in
 * movimento, con tre sorgenti che orbitano e interferiscono. Non è una
 * decorazione presa da una galleria: è la stessa figura del logo, scalata e
 * messa in moto.
 *
 * ── Cosa fa questo file, adesso ──
 *
 * Quasi niente. Il motore — contesto, uniform, densità, ascoltatori,
 * sospensione, pulizia — sta in `lib/tela-campo.ts`, condiviso con le altre
 * due superfici; la formula sta in `lib/campo.ts`. Qui resta solo come questo
 * strato colora ciò che il campo restituisce.
 *
 * ── Le cinque cose che lo rendono innocuo ──
 *
 * 1. **Non blocca niente.** Vive dietro il contenuto, renderizzato sul server
 *    e visibile prima che questo componente esista. L'LCP non lo conosce.
 * 2. **Se WebGL non c'è, non succede niente.** Nessun errore, nessun
 *    rettangolo vuoto. Un effetto che si rompe è peggio di un effetto assente.
 * 3. **`prefers-reduced-motion` disegna un fotogramma e si ferma.** Chi ha
 *    disattivato le animazioni ha spesso una ragione medica — un campo che
 *    pulsa è esattamente ciò che scatena un disturbo vestibolare.
 * 4. **Si ferma quando non si vede.**
 * 5. **Costa poco per pixel.** Densità limitata, risoluzione dimezzata sotto
 *    i 640px.
 *
 * `aria-hidden` e `pointer-events-none`: non contiene informazione e non
 * intercetta gesti. Chi naviga da tastiera o con uno screen reader non lo
 * incontra mai — che per una decorazione è il comportamento corretto.
 */

const FRAMMENTO = `
void main() {
  vec2 p = punto(gl_FragCoord.xy);
  float a = campo(p);
  // Piu' spesse di quelle dentro il titolo: qui la riga sta su un fondo quasi
  // nero, dove un pixel a bassa opacita' non si legge.
  float linea = frange(a, 2.4, 0.020);

  // Il colore segue la fase, ma con poca strada fra le due tinte: un campo che
  // attraversa mezzo arcobaleno compete con il marchio, che ha i suoi colori.
  vec3 tinta = mix(VIOLA, CIANO, 0.5 + 0.5 * sin(a * 0.9));
  tinta = mix(tinta, ROSA, 0.14 * smoothstep(0.7, 1.3, abs(a)));

  // Si spegne verso i bordi: il campo deve sembrare emergere dal centro, e
  // soprattutto non deve arrivare a toccare i margini del riquadro, dove il
  // taglio netto rivelerebbe che e' un rettangolo.
  //
  // Il raggio esterno e' andato da 0,78 a 1,00. Quei numeri erano stati
  // scelti quando al centro c'era un marchio alto diciassette rem: il campo
  // doveva stargli intorno senza disturbarlo. Tolto quello, la stessa
  // vignetta lasciava un terzo di schermata semplicemente vuota.
  float vignetta = 1.0 - smoothstep(0.34, 1.05, length(p));

  // ── E si concentra in alto ──
  //
  // Non e' simmetria estetica: sopra c'e' il titolo, che il campo attraversa
  // e che sta su una tela sua; sotto c'e' un paragrafo di testo corrente, e
  // delle righe colorate dietro sedici pixel di testo sono rumore. A piena
  // opacita' su tutta l'altezza si leggeva peggio — verificato sul sito.
  float alto = mix(0.30, 1.0, smoothstep(-0.30, 0.30, p.y));

  // Molto trasparente, e piu' ancora su tema chiaro: li' il testo e' scuro su
  // fondo chiaro e qualunque colore saturo sotto ne abbassa il contrasto — che
  // e' un problema di leggibilita', non di gusto.
  //
  // Scendendo, il campo si ritira: sotto l'hero comincia il contenuto, e un
  // fondo che pulsa dietro un elenco di artisti e' rumore.
  // Piu' marcato di prima. Anche qui il valore veniva da una schermata che
  // aveva altre tre cose luminose sopra: da sola, quella opacita' spariva. Il
  // tema chiaro resta molto piu' basso, perche' li' il testo e' scuro su
  // fondo chiaro e ogni colore saturo sotto ne abbassa il contrasto — che e'
  // un problema di leggibilita', non di gusto.
  float alfa = linea * vignetta * alto * mix(0.85, 0.42, chiaro)
             * (1.0 - scorrimento * 0.7) * (1.0 + impulso * 1.6);

  colore = vec4(tinta, alfa);
}`;

export function OndeWebGL({ className }: { className?: string }) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;
    return avviaCampo(canvas, { nome: "OndeWebGL", frammento: FRAMMENTO });
  }, []);

  return (
    <canvas
      ref={tela}
      aria-hidden="true"
      className={className}
      style={{ pointerEvents: "none" }}
    />
  );
}
