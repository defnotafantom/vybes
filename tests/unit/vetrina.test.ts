import { describe, it, expect } from "vitest";
import { inVetrina, fraQuantiGiorni, giornoDi } from "@/lib/vetrina";

const lista = (n: number) => Array.from({ length: n }, (_, i) => `a${i}`);

describe("inVetrina", () => {
  it("con meno candidati dei posti li mostra tutti", () => {
    expect(inVetrina(lista(2), 3, 0)).toEqual(["a0", "a1"]);
  });

  it("non mostra niente se non c'è nessuno", () => {
    expect(inVetrina([], 3, 5)).toEqual([]);
  });

  it("ogni giorno la finestra avanza di uno: uno esce, uno entra", () => {
    const oggi = inVetrina(lista(10), 3, 4);
    const domani = inVetrina(lista(10), 3, 5);
    expect(oggi).toEqual(["a4", "a5", "a6"]);
    expect(domani).toEqual(["a5", "a6", "a7"]);
    // Due su tre restano: la home cambia, ma non diventa un'altra pagina.
    expect(domani.filter((x) => oggi.includes(x))).toHaveLength(2);
  });

  it("gira in tondo alla fine dell'elenco", () => {
    expect(inVetrina(lista(5), 3, 4)).toEqual(["a4", "a0", "a1"]);
  });

  it("in `totale` giorni tocca a tutti, e a nessuno due volte", () => {
    // È la proprietà che rende questa una fila e non un podio: se qualcuno
    // non comparisse mai, l'incentivo — «completa il profilo e prima o poi
    // sei in home» — sarebbe una promessa falsa.
    const n = 17;
    const visti = new Set<string>();
    for (let g = 0; g < n; g++) for (const x of inVetrina(lista(n), 3, g)) visti.add(x);
    expect(visti.size).toBe(n);
  });

  it("un giorno negativo non rompe la rotazione", () => {
    // `%` in JavaScript su un numero negativo restituisce un negativo, e un
    // indice negativo in un array dà `undefined`: la home si riempirebbe di
    // buchi. Non capita in produzione, ma capita nei test e in chi ci
    // scherza con le date.
    expect(inVetrina(lista(5), 2, -3)).toEqual(["a2", "a3"]);
  });
});

describe("fraQuantiGiorni", () => {
  it("zero per chi è in vetrina adesso", () => {
    expect(fraQuantiGiorni(4, 10, 3, 4)).toBe(0);
    expect(fraQuantiGiorni(6, 10, 3, 4)).toBe(0);
  });

  it("dice quanti giorni mancano a chi aspetta", () => {
    expect(fraQuantiGiorni(7, 10, 3, 4)).toBe(3);
  });

  it("zero per tutti se i posti bastano", () => {
    expect(fraQuantiGiorni(1, 2, 3, 99)).toBe(0);
  });

  it("nessuno aspetta più di un giro completo", () => {
    const totale = 12;
    for (let i = 0; i < totale; i++) {
      expect(fraQuantiGiorni(i, totale, 3, 7)).toBeLessThan(totale);
    }
  });
});

describe("giornoDi", () => {
  it("cambia a mezzanotte italiana, non a quella di Londra", () => {
    // 23:30 UTC del 1° marzo in Italia sono già le 00:30 del 2.
    const primaDiMezzanotteUTC = new Date("2026-03-01T23:30:00Z");
    const dopoMezzanotteUTC = new Date("2026-03-02T00:30:00Z");
    expect(giornoDi(primaDiMezzanotteUTC)).toBe(giornoDi(dopoMezzanotteUTC));
  });

  it("due giorni consecutivi differiscono di uno", () => {
    const a = giornoDi(new Date("2026-03-01T12:00:00Z"));
    const b = giornoDi(new Date("2026-03-02T12:00:00Z"));
    expect(b - a).toBe(1);
  });
});
