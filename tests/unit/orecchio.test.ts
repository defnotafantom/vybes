import { describe, it, expect } from "vitest";
import {
  componiTurno,
  mescola,
  punteggio,
  punteggioMassimo,
  settimanaDi,
  primoGiornoDi,
  giorniAllaFine,
  DOMANDE_PER_TURNO,
  POSSIBILITA,
  SERIE_MASSIMA,
  PUNTI_BASE,
  type Lavoro,
} from "@/lib/orecchio";

/**
 * Cosa proteggono questi test.
 *
 * Un turno con la risposta giusta assente dalle opzioni non solleva nessun
 * errore: dà una partita che nessuno può vincere, e chi la gioca pensa di
 * essere scarso. È il difetto che questo file esiste per rendere impossibile.
 *
 * L'altro è più sottile e riguarda la classifica: se il turno non fosse
 * identico per tutti, confrontare i punteggi non significherebbe niente — e
 * nessuno se ne accorgerebbe, perché i numeri sarebbero tutti plausibili.
 */

const artista = (n: number) => ({ slug: `a${n}`, nome: `Artista ${n}` });

function lavoriDi(quanti: number): Lavoro[] {
  return Array.from({ length: quanti }, (_, i) => ({
    slug: `l${i}`,
    titolo: `Lavoro ${i}`,
    descrizione: null,
    tipo: "audio",
    mediaUrl: `https://esempio/l${i}`,
    artistaSlug: `a${i}`,
    artistaNome: `Artista ${i}`,
  }));
}

const ARTISTI = Array.from({ length: 12 }, (_, i) => artista(i));
const LAVORI = lavoriDi(12);

describe("il turno è lo stesso per tutti, nello stesso giorno", () => {
  it("stesso giorno, stesso turno", () => {
    // È la condizione senza la quale la classifica non è una classifica ma un
    // elenco di persone che hanno giocato a giochi diversi.
    const a = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 20_300 });
    const b = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 20_300 });
    expect(a).toEqual(b);
  });

  it("giorni diversi, turni diversi", () => {
    const a = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 20_300 });
    const b = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 20_301 });
    expect(a).not.toEqual(b);
  });

  it("lo stesso giorno di mesi fa dà ancora quel turno", () => {
    // Nessuno stato conservato: si può ricalcolare un turno passato per
    // controllare una contestazione sulla classifica.
    const vecchio = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 19_000 });
    expect(componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 19_000 })).toEqual(vecchio);
  });
});

describe("ogni domanda si può vincere", () => {
  const turno = componiTurno({ lavori: LAVORI, artisti: ARTISTI, giorno: 20_300 });

  it("la risposta giusta è sempre fra le opzioni", () => {
    // Il difetto classico: memorizzare l'indice della risposta e poi mescolare
    // le opzioni. Nessun tipo se ne accorge, e la partita diventa invincibile.
    for (const d of turno) {
      expect(d.opzioni.map((o) => o.slug), d.lavoro.slug).toContain(d.risposta);
    }
  });

  it("le opzioni sono quante dichiarato e tutte distinte", () => {
    for (const d of turno) {
      expect(d.opzioni).toHaveLength(POSSIBILITA);
      expect(new Set(d.opzioni.map((o) => o.slug)).size, d.lavoro.slug).toBe(POSSIBILITA);
    }
  });

  it("nessun lavoro compare due volte nello stesso turno", () => {
    const slug = turno.map((d) => d.lavoro.slug);
    expect(new Set(slug).size).toBe(slug.length);
  });

  it("nessun artista è la risposta di due domande dello stesso turno", () => {
    // La seconda diventerebbe un tiro a segno: il nome è appena stato letto.
    const risposte = turno.map((d) => d.risposta);
    expect(new Set(risposte).size).toBe(risposte.length);
  });

  it("il turno ha la lunghezza dichiarata quando c'è materiale a sufficienza", () => {
    expect(turno).toHaveLength(DOMANDE_PER_TURNO);
  });

  it("la risposta non trapela dal lavoro mostrato", () => {
    // Il tipo `Domanda` non espone l'autore, e questa prova lo fissa: bastava
    // passare l'oggetto intero invece di ricostruirlo per regalare la
    // soluzione a chiunque aprisse gli strumenti di sviluppo.
    for (const d of turno) {
      expect(Object.keys(d.lavoro)).not.toContain("artistaSlug");
      expect(Object.keys(d.lavoro)).not.toContain("artistaNome");
    }
  });
});

describe("quando i dati non bastano, il gioco non si apre", () => {
  it("meno artisti delle opzioni: nessun turno", () => {
    // Con tre artisti e quattro opzioni una si ripeterebbe, e la domanda si
    // risolverebbe senza guardare niente. Meglio dire «torna più avanti» che
    // offrire una partita truccata.
    const pochi = ARTISTI.slice(0, POSSIBILITA - 1);
    expect(componiTurno({ lavori: LAVORI, artisti: pochi, giorno: 1 })).toEqual([]);
  });

  it("nessun lavoro: nessun turno", () => {
    expect(componiTurno({ lavori: [], artisti: ARTISTI, giorno: 1 })).toEqual([]);
  });

  it("con pochi lavori il turno si accorcia invece di ripeterli", () => {
    const turno = componiTurno({ lavori: lavoriDi(3), artisti: ARTISTI, giorno: 7 });
    expect(turno).toHaveLength(3);
    expect(new Set(turno.map((d) => d.lavoro.slug)).size).toBe(3);
  });

  it("un artista con dieci lavori non riempie il turno da solo", () => {
    const stesso: Lavoro[] = Array.from({ length: 10 }, (_, i) => ({
      ...LAVORI[0],
      slug: `x${i}`,
      titolo: `Pezzo ${i}`,
    }));
    const turno = componiTurno({ lavori: stesso, artisti: ARTISTI, giorno: 3 });
    expect(turno).toHaveLength(1);
  });
});

describe("mescola", () => {
  it("non tocca l'originale", () => {
    // Mescolando sul posto, l'elenco arrivato dal database cambierebbe ordine
    // sotto ai piedi di chi lo ha passato, e il difetto salterebbe fuori
    // altrove.
    const dentro = [1, 2, 3, 4, 5];
    const copia = [...dentro];
    mescola(dentro, () => 0.42);
    expect(dentro).toEqual(copia);
  });

  it("non perde né duplica elementi", () => {
    const dentro = Array.from({ length: 30 }, (_, i) => i);
    let s = 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const fuori = mescola(dentro, rnd);
    expect(fuori.slice().sort((a, b) => a - b)).toEqual(dentro);
  });
});

describe("punteggio", () => {
  it("un turno sbagliato in pieno vale zero", () => {
    expect(punteggio([false, false, false, false, false])).toBe(0);
  });

  it("una sola esatta vale il punteggio base", () => {
    expect(punteggio([true])).toBe(PUNTI_BASE);
  });

  it("la serie moltiplica: cinque di fila valgono più di cinque sparse", () => {
    const filata = punteggio([true, true, true, true, true]);
    const sparse = punteggio([true, false, true, false, true]);
    expect(filata).toBeGreaterThan(sparse * 1.5);
  });

  it("il moltiplicatore ha un tetto", () => {
    // Senza tetto un turno perfetto varrebbe quindici volte una risposta sola,
    // e la classifica smetterebbe di essere una gara.
    const dieci = punteggio(Array.from({ length: 10 }, () => true));
    expect(dieci).toBeLessThanOrEqual(10 * PUNTI_BASE * SERIE_MASSIMA);
  });

  it("un errore azzera la serie ma non toglie punti", () => {
    // Sottrarre spingerebbe a non rispondere quando non si sa, e una domanda
    // saltata non mostra il lavoro a nessuno: che è tutto il motivo per cui
    // questo gioco esiste.
    expect(punteggio([true, true, false])).toBe(punteggio([true, true]));
    expect(punteggio([false, true])).toBe(PUNTI_BASE);
  });

  it("il punteggio non scende mai aggiungendo una risposta esatta", () => {
    let precedente = 0;
    for (let n = 1; n <= 8; n++) {
      const p = punteggio(Array.from({ length: n }, () => true));
      expect(p).toBeGreaterThan(precedente);
      precedente = p;
    }
  });

  it("il massimo dichiarato è raggiungibile e non superabile", () => {
    const max = punteggioMassimo();
    expect(punteggio(Array.from({ length: DOMANDE_PER_TURNO }, () => true))).toBe(max);
    for (const esiti of [[true, false, true, true, true], [false, true, true, true, true]]) {
      expect(punteggio(esiti)).toBeLessThan(max);
    }
  });
});

describe("la settimana della classifica", () => {
  it("comincia di lunedì", () => {
    // Il giorno 0 di `giornoDi()` è il 1° gennaio 1970, un giovedì. Senza la
    // correzione di quattro giorni le classifiche si azzererebbero di giovedì:
    // non sbagliato, ma inspiegabile a chiunque.
    const lunedi = new Date("2026-08-03T12:00:00Z");
    const domenica = new Date("2026-08-09T12:00:00Z");
    const g = (d: Date) => Math.floor((d.getTime() + 3_600_000) / 86_400_000);

    expect(settimanaDi(g(lunedi))).toBe(settimanaDi(g(domenica)));
    expect(settimanaDi(g(lunedi) - 1)).toBe(settimanaDi(g(lunedi)) - 1);
    expect(settimanaDi(g(domenica) + 1)).toBe(settimanaDi(g(lunedi)) + 1);
  });

  it("sette giorni per settimana, senza buchi né sovrapposizioni", () => {
    const base = 20_300;
    const settimane = Array.from({ length: 21 }, (_, i) => settimanaDi(base + i));
    for (const s of new Set(settimane)) {
      const quanti = settimane.filter((x) => x === s).length;
      expect(quanti).toBeLessThanOrEqual(7);
    }
    expect(new Set(settimane).size).toBeGreaterThanOrEqual(3);
  });

  it("primoGiornoDi è l'inverso di settimanaDi", () => {
    for (const g of [19_000, 20_300, 20_301, 20_306, 20_307]) {
      const s = settimanaDi(g);
      const primo = primoGiornoDi(s);
      expect(settimanaDi(primo)).toBe(s);
      expect(primo).toBeLessThanOrEqual(g);
      expect(g - primo).toBeLessThan(7);
    }
  });

  it("il conto alla rovescia sta fra uno e sette", () => {
    for (let i = 0; i < 14; i++) {
      const r = giorniAllaFine(20_300 + i);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(7);
    }
  });
});
