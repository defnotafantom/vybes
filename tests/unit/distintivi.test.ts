import { describe, it, expect } from "vitest";
import {
  distintiviDi,
  distintiviOttenuti,
  distintiviMancanti,
  SOGLIA_INGAGGIATO,
  SOGLIA_ORGANIZZATORE,
  SOGLIA_PORTFOLIO,
  SOGLIA_RISPOSTE,
  QUOTA_RISPOSTE,
  SOGLIA_ANNUNCI,
  SOGLIA_SCELTI,
} from "@/lib/distintivi";

const nudo = {
  isVerified: false,
  createdAt: new Date("2026-03-01"),
  ingaggiConfermati: 0,
  ingaggiOrganizzati: 0,
  portfolio: 0,
  raggiungibile: false,
  candidatureRicevute: 0,
  candidatureRisposte: 0,
  annunciPubblicati: 0,
  annunciRetribuiti: 0,
  artistiScelti: 0,
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

describe("i distintivi di chi ingaggia", () => {
  /**
   * Perché ne servivano di propri: l'elenco era uno solo, e quattro voci su
   * sei un organizzatore non può ottenerle. Sulla sua pagina pubblica
   * restavano due pillole — proprio dove un artista sta decidendo se
   * candidarsi a uno sconosciuto.
   */
  it("un locale non riceve i distintivi da artista", () => {
    const chiavi = distintiviDi(nudo, "RECRUITER").map((d) => d.chiave);
    expect(chiavi).not.toContain("portfolio");
    expect(chiavi).not.toContain("ingaggiato");
    expect(chiavi).not.toContain("raggiungibile");
  });

  it("un locale che fa bene il suo mestiere li prende tutti", () => {
    const bravo = {
      ...nudo,
      isVerified: true,
      ingaggiOrganizzati: 10,
      candidatureRicevute: 20,
      candidatureRisposte: 20,
      annunciPubblicati: 10,
      annunciRetribuiti: 10,
      artistiScelti: 10,
      // Nessun portfolio, nessuna disciplina: esattamente ciò che un locale
      // non avrà mai.
      portfolio: 0,
      raggiungibile: false,
    };
    const ottenuti = distintiviOttenuti(bravo, "RECRUITER");
    expect(ottenuti).toHaveLength(distintiviDi(bravo, "RECRUITER").length);
  });

  it("«risponde sempre» richiede un campione minimo", () => {
    // Con due candidature entrambe risposte la quota è 100%, e il distintivo
    // direbbe a un artista «fidati» sulla base di due eventi. Se poi non
    // riceve risposta, il danno l'ha fatto il distintivo.
    const poche = { ...nudo, candidatureRicevute: SOGLIA_RISPOSTE - 1, candidatureRisposte: SOGLIA_RISPOSTE - 1 };
    const abbastanza = { ...nudo, candidatureRicevute: SOGLIA_RISPOSTE, candidatureRisposte: SOGLIA_RISPOSTE };
    const trova = (f: typeof nudo) =>
      distintiviDi(f, "RECRUITER").find((d) => d.chiave === "risponde")!.ottenuto;

    expect(trova(poche)).toBe(false);
    expect(trova(abbastanza)).toBe(true);
  });

  it("«risponde sempre» si perde smettendo di rispondere", () => {
    // Dichiara un comportamento presente, non un merito passato: è il
    // distintivo più difficile da tenere, e deve esserlo.
    const sotto = {
      ...nudo,
      candidatureRicevute: 20,
      candidatureRisposte: Math.floor(20 * QUOTA_RISPOSTE) - 1,
    };
    expect(distintiviDi(sotto, "RECRUITER").find((d) => d.chiave === "risponde")!.ottenuto).toBe(false);
  });

  it("«annunci retribuiti» tollera qualche annuncio senza compenso", () => {
    // Una jam o un laboratorio non retribuiti non devono cancellare il
    // distintivo di chi paga quasi sempre.
    const quasi = { ...nudo, annunciPubblicati: 10, annunciRetribuiti: 9 };
    const mai = { ...nudo, annunciPubblicati: 10, annunciRetribuiti: 1 };
    const trova = (f: typeof nudo) =>
      distintiviDi(f, "RECRUITER").find((d) => d.chiave === "paga")!.ottenuto;

    expect(trova(quasi)).toBe(true);
    expect(trova(mai)).toBe(false);
  });

  it("«annunci retribuiti» non si ottiene con un annuncio solo", () => {
    const uno = { ...nudo, annunciPubblicati: SOGLIA_ANNUNCI - 1, annunciRetribuiti: SOGLIA_ANNUNCI - 1 };
    expect(distintiviDi(uno, "RECRUITER").find((d) => d.chiave === "paga")!.ottenuto).toBe(false);
  });

  it("conta gli artisti distinti, non le candidature accettate", () => {
    // Chi chiama dieci volte la stessa band ha costruito un rapporto, non una
    // rete: il fatto letto dal database è già `groupBy` per persona, e questa
    // prova fissa che il distintivo parli di quello.
    const soglia = { ...nudo, artistiScelti: SOGLIA_SCELTI };
    const sotto = { ...nudo, artistiScelti: SOGLIA_SCELTI - 1 };
    const trova = (f: typeof nudo) =>
      distintiviDi(f, "RECRUITER").find((d) => d.chiave === "scelti")!.ottenuto;

    expect(trova(soglia)).toBe(true);
    expect(trova(sotto)).toBe(false);
  });

  it("anche qui l'anzianità non è un obiettivo", () => {
    expect(distintiviMancanti(nudo, "RECRUITER").map((d) => d.chiave)).not.toContain("dal");
  });

  it("un ruolo sconosciuto ricade sull'artista", () => {
    expect(distintiviDi(nudo, "BOH").map((d) => d.chiave)).toEqual(
      distintiviDi(nudo, "ARTIST").map((d) => d.chiave)
    );
  });

  it("ogni distintivo si sa spiegare, in entrambi i ruoli", () => {
    for (const ruolo of ["ARTIST", "RECRUITER"]) {
      for (const d of distintiviDi(nudo, ruolo)) {
        expect(d.etichetta.trim().length, d.chiave).toBeGreaterThan(0);
        expect(d.significato.trim().length, d.chiave).toBeGreaterThan(0);
      }
      const chiavi = distintiviDi(nudo, ruolo).map((d) => d.chiave);
      expect(new Set(chiavi).size, ruolo).toBe(chiavi.length);
    }
  });
});
