import { describe, it, expect } from "vitest";
import {
  CONFINI_ITALIA,
  LIMITI,
  ZOOM_MINIMO,
  ZOOM_INIZIALE,
  CENTRO_ITALIA,
  dentroItalia,
  raggruppa,
  riquadroDi,
} from "@/lib/mappa";

/**
 * Cosa proteggono questi test.
 *
 * Il raggruppamento è l'unica logica non banale della mappa, ed è anche quella
 * che sbagliata **non dà nessun errore**: dà una mappa leggermente sbagliata,
 * con qualche punto in meno di quelli che dovrebbe avere. Nessuno va a cercare
 * quello che non sa di non vedere.
 */

const p = (lat: number, lng: number, id = `${lat},${lng}`) => ({ lat, lng, id });

describe("i confini", () => {
  it("comprendono le estremità vere del paese", () => {
    // Se un giorno qualcuno stringesse il rettangolo per «centrare meglio», la
    // prima cosa a uscirne sarebbero le isole — che è dove serve di più una
    // piattaforma che mette in contatto artisti e locali.
    expect(dentroItalia(35.49, 12.61), "Lampedusa").toBe(true);
    expect(dentroItalia(47.09, 12.19), "Vetta d'Italia").toBe(true);
    expect(dentroItalia(38.12, 15.65), "Messina").toBe(true);
    expect(dentroItalia(41.13, 9.51), "Sardegna nord-est").toBe(true);
    expect(dentroItalia(45.44, 12.32), "Venezia").toBe(true);
  });

  it("escludono ciò che è fuori", () => {
    expect(dentroItalia(48.86, 2.35), "Parigi").toBe(false);
    expect(dentroItalia(40.71, -74.01), "New York").toBe(false);
    expect(dentroItalia(0, 0), "isola nulla").toBe(false);
  });

  it("una coordinata invertita cade fuori, ed è il punto", () => {
    // È l'errore di geocodifica più comune: lat e lng scambiate. Roma
    // (41.9, 12.5) diventa (12.5, 41.9), cioè il Corno d'Africa. Dentro una
    // mappa chiusa sarebbe un pin irraggiungibile, e il suo autore vedrebbe
    // «pubblicato» senza che nessuno lo trovi.
    expect(dentroItalia(41.9, 12.5)).toBe(true);
    expect(dentroItalia(12.5, 41.9)).toBe(false);
  });

  it("LIMITI è coerente con i confini, nell'ordine che vuole Leaflet", () => {
    // Scritti a mano sarebbero due copie dello stesso rettangolo: la seconda
    // si dimentica di seguire la prima, e la mappa lascerebbe navigare dove
    // il filtro dei dati non arriva.
    expect(LIMITI).toEqual([
      [CONFINI_ITALIA.sud, CONFINI_ITALIA.ovest],
      [CONFINI_ITALIA.nord, CONFINI_ITALIA.est],
    ]);
    expect(CONFINI_ITALIA.sud).toBeLessThan(CONFINI_ITALIA.nord);
    expect(CONFINI_ITALIA.ovest).toBeLessThan(CONFINI_ITALIA.est);
  });

  it("il centro di partenza è dentro i confini", () => {
    expect(dentroItalia(CENTRO_ITALIA.lat, CENTRO_ITALIA.lng)).toBe(true);
  });

  it("non ci si può aprire più stretti di quanto ci si possa allontanare", () => {
    // Con `ZOOM_INIZIALE < ZOOM_MINIMO` la mappa si aprirebbe già oltre il
    // proprio limite e verrebbe subito riportata indietro: un salto all'avvio
    // che sembra un difetto di caricamento.
    expect(ZOOM_INIZIALE).toBeGreaterThanOrEqual(ZOOM_MINIMO);
  });
});

describe("raggruppa", () => {
  it("non perde né duplica nessun punto", () => {
    // La proprietà che conta più di tutte. Un punto perso è un annuncio che
    // sparisce dalla mappa senza che niente lo segnali.
    const punti = Array.from({ length: 60 }, (_, i) =>
      p(41 + (i % 7) * 0.4, 9 + (i % 11) * 0.5, `x${i}`)
    );
    for (const zoom of [5, 7, 9, 12, 16]) {
      const dentro = raggruppa(punti, zoom).flatMap((g) => g.elementi);
      expect(dentro, `zoom ${zoom}`).toHaveLength(punti.length);
      expect(new Set(dentro.map((x) => x.id)).size, `zoom ${zoom}`).toBe(punti.length);
    }
  });

  it("da lontano accorpa, da vicino separa", () => {
    // Due punti a una decina di chilometri: alla scala del paese sono lo
    // stesso pixel, alla scala della città sono due posti diversi.
    const punti = [p(45.46, 9.19, "milano"), p(45.52, 9.25, "sesto")];
    expect(raggruppa(punti, 6)).toHaveLength(1);
    expect(raggruppa(punti, 14)).toHaveLength(2);
  });

  it("il numero di gruppi non cresce mai allontanandosi", () => {
    // Monotonia: se allontanandosi comparissero più simboli di prima, la
    // mappa si comporterebbe al contrario dell'intuizione di chiunque.
    const punti = Array.from({ length: 40 }, (_, i) => p(41 + i * 0.12, 12 + i * 0.09, `y${i}`));
    let precedente = Infinity;
    for (const zoom of [16, 14, 12, 10, 8, 6, 5]) {
      const quanti = raggruppa(punti, zoom).length;
      expect(quanti, `zoom ${zoom}`).toBeLessThanOrEqual(precedente);
      precedente = quanti;
    }
  });

  it("è stabile: l'ordine dei punti non cambia il risultato", () => {
    // Raggruppando per posizione assoluta e non per ordine di scansione, la
    // mappa non si ridispone quando cambia l'ordinamento della query.
    const punti = [p(45.4, 9.1, "a"), p(45.9, 9.9, "b"), p(41.9, 12.5, "c"), p(45.45, 9.15, "d")];
    const conta = (l: typeof punti) =>
      raggruppa(l, 8)
        .map((g) => g.elementi.map((e) => e.id).sort().join("+"))
        .sort();
    expect(conta([...punti].reverse())).toEqual(conta(punti));
  });

  it("il gruppo sta nel baricentro dei suoi membri, non al centro della cella", () => {
    const punti = [p(45.0, 9.0), p(45.2, 9.4)];
    const [g] = raggruppa(punti, 6);
    expect(g.elementi).toHaveLength(2);
    expect(g.lat).toBeCloseTo(45.1, 6);
    expect(g.lng).toBeCloseTo(9.2, 6);
  });

  it("un punto solo resta un punto solo", () => {
    const [g] = raggruppa([p(41.9, 12.5)], 10);
    expect(g.elementi).toHaveLength(1);
    expect(g.lat).toBe(41.9);
  });

  it("un elenco vuoto non produce gruppi", () => {
    expect(raggruppa([], 8)).toEqual([]);
  });

  it("uno zoom assurdo non fa sparire niente", () => {
    // `gradiPerPixel` con uno zoom enorme va a zero, e una divisione per zero
    // manderebbe ogni chiave a Infinity accorpando tutta l'Italia in un punto.
    // Il ripiego è mostrarli separati: sbagliato in grafica, mai in contenuto.
    const punti = [p(45.4, 9.1, "a"), p(41.9, 12.5, "b")];
    expect(raggruppa(punti, 1000)).toHaveLength(2);
    expect(raggruppa(punti, Number.NaN)).toHaveLength(2);
  });
});

describe("riquadroDi", () => {
  it("racchiude tutti i membri del gruppo", () => {
    const g = { lat: 45, lng: 9, elementi: [p(44.5, 8.5), p(45.5, 9.5), p(45, 9)] };
    expect(riquadroDi(g)).toEqual([
      [44.5, 8.5],
      [45.5, 9.5],
    ]);
  });

  it("su punti coincidenti è degenere, e chi chiama deve accorgersene", () => {
    // Non è un caso teorico: due annunci nello stesso locale. `fitBounds` su
    // un rettangolo di area zero salta allo zoom massimo mostrando quattro
    // isolati vuoti — la mappa ha «funzionato» e la persona ha perso il segno.
    const g = { lat: 45, lng: 9, elementi: [p(45, 9), p(45, 9)] };
    const [[a, b], [c, d]] = riquadroDi(g);
    expect(a).toBe(c);
    expect(b).toBe(d);
  });
});
