import { describe, it, expect } from "vitest";
import {
  distintiviDi,
  distintiviOttenuti,
  distintiviMancanti,
  SOGLIA_INGAGGIATO,
  SOGLIA_ORGANIZZATORE,
  SOGLIA_PORTFOLIO,
} from "@/lib/distintivi";

const nudo = {
  isVerified: false,
  createdAt: new Date("2026-03-01"),
  ingaggiConfermati: 0,
  ingaggiOrganizzati: 0,
  portfolio: 0,
  raggiungibile: false,
};

describe("distintivi", () => {
  it("un profilo appena aperto ne ha uno solo, e non è un merito", () => {
    const ottenuti = distintiviOttenuti(nudo);
    expect(ottenuti).toHaveLength(1);
    expect(ottenuti[0].chiave).toBe("dal");
    expect(ottenuti[0].etichetta).toContain("2026");
  });

  it("«Su Vybes dal…» non compare mai fra quelli da conquistare", () => {
    // Non è un obiettivo: mostrarlo fra le cose da fare suggerirebbe che ci
    // sia un modo di ottenerlo prima, e non c'è.
    expect(distintiviMancanti(nudo).map((d) => d.chiave)).not.toContain("dal");
  });

  it.each([
    ["ingaggiato", { ingaggiConfermati: SOGLIA_INGAGGIATO }],
    ["organizzatore", { ingaggiOrganizzati: SOGLIA_ORGANIZZATORE }],
    ["portfolio", { portfolio: SOGLIA_PORTFOLIO }],
    ["verificato", { isVerified: true }],
    ["raggiungibile", { raggiungibile: true }],
  ])("«%s» scatta esattamente alla soglia", (chiave, fatti) => {
    const trova = (f: object) =>
      distintiviDi({ ...nudo, ...f }).find((d) => d.chiave === chiave)!.ottenuto;

    expect(trova(fatti)).toBe(true);
  });

  it("sotto la soglia non scatta", () => {
    const sotto = distintiviDi({ ...nudo, ingaggiConfermati: SOGLIA_INGAGGIATO - 1 });
    expect(sotto.find((d) => d.chiave === "ingaggiato")!.ottenuto).toBe(false);
  });

  it("nessun distintivo si ottiene con l'attività", () => {
    // È il vincolo che li distingue da un sistema di trofei (ADR-042): niente
    // si ottiene aprendo il sito, pubblicando molto o scrivendo a tanta
    // gente. Se un giorno qualcuno aggiunge un campo del genere ai fatti,
    // questo test non lo vedrà — ma il tipo `FattiDistintivi` sì, ed è dove
    // la discussione deve avvenire.
    const chiavi = distintiviDi(nudo).map((d) => d.chiave);
    expect(chiavi).toEqual([
      "verificato",
      "ingaggiato",
      "organizzatore",
      "portfolio",
      "raggiungibile",
      "dal",
    ]);
  });

  it("ognuno spiega cosa significa per chi legge il profilo", () => {
    // Un'etichetta senza significato è un'icona decorativa: «Scelto 3 volte»
    // da solo si può fraintendere in dieci modi.
    for (const d of distintiviDi(nudo)) {
      expect(d.significato.length, `${d.chiave} senza significato`).toBeGreaterThan(20);
    }
  });
});
