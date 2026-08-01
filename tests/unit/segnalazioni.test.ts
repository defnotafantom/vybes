import { describe, it, expect } from "vitest";
import {
  MOTIVI,
  MOTIVI_VALIDI,
  TIPI_SEGNALABILI,
  eUrgente,
  ordinaCoda,
  percorsoOggetto,
  ETICHETTE_TIPO,
  type TipoSegnalabile,
} from "@/lib/segnalazioni";

const g = (giorni: number) => new Date(2026, 0, giorni);

describe("urgenza", () => {
  it("considera urgenti i quattro motivi in cui il ritardo fa danno", () => {
    expect(eUrgente("MINORI")).toBe(true);
    expect(eUrgente("ILLEGALE")).toBe(true);
    expect(eUrgente("ODIO")).toBe(true);
    expect(eUrgente("MOLESTIE")).toBe(true);
  });

  it("non considera urgente lo spam", () => {
    expect(eUrgente("SPAM")).toBe(false);
    expect(eUrgente("PROPRIETA_INTELLETTUALE")).toBe(false);
  });
});

describe("ordinaCoda", () => {
  it("mette le urgenti davanti", () => {
    const coda = ordinaCoda([
      { reason: "SPAM", createdAt: g(1) },
      { reason: "MINORI", createdAt: g(5) },
    ]);
    expect(coda[0].reason).toBe("MINORI");
  });

  it("a parità di urgenza mette prima le più vecchie", () => {
    const coda = ordinaCoda([
      { reason: "SPAM", createdAt: g(9) },
      { reason: "SPAM", createdAt: g(2) },
      { reason: "SPAM", createdAt: g(5) },
    ]);
    expect(coda.map((c) => c.createdAt.getDate())).toEqual([2, 5, 9]);
  });

  it("non lascia una segnalazione non urgente in attesa indefinita", () => {
    // È il caso che il secondo criterio esiste per evitare: ordinando solo per
    // urgenza, la vecchia segnalazione di spam resterebbe in fondo per sempre.
    const coda = ordinaCoda([
      { reason: "SPAM", createdAt: g(1) },
      { reason: "ODIO", createdAt: g(20) },
      { reason: "SPAM", createdAt: g(21) },
    ]);
    expect(coda.map((c) => c.reason)).toEqual(["ODIO", "SPAM", "SPAM"]);
    expect(coda[1].createdAt.getDate()).toBe(1);
  });

  it("non modifica l'array ricevuto", () => {
    const originale = [
      { reason: "SPAM", createdAt: g(1) },
      { reason: "MINORI", createdAt: g(5) },
    ];
    ordinaCoda(originale);
    expect(originale[0].reason).toBe("SPAM");
  });

  it("regge una coda vuota", () => {
    expect(ordinaCoda([])).toEqual([]);
  });
});

describe("percorsoOggetto", () => {
  it("costruisce il percorso pubblico dei contenuti che ne hanno uno", () => {
    expect(percorsoOggetto("USER", "tobia-renna")).toBe("/artisti/tobia-renna");
    expect(percorsoOggetto("EVENT", "serata-blues")).toBe("/eventi/serata-blues");
    expect(percorsoOggetto("PORTFOLIO", "demo-2025")).toBe("/portfolio/demo-2025");
  });

  it("restituisce null per post e commenti, che non hanno una pagina propria", () => {
    expect(percorsoOggetto("POST", "abc")).toBeNull();
    expect(percorsoOggetto("COMMENT", "abc")).toBeNull();
  });
});

describe("coerenza delle tabelle", () => {
  it("ogni motivo ha etichetta, aiuto e livello di urgenza", () => {
    for (const m of MOTIVI_VALIDI) {
      expect(MOTIVI[m].label.length).toBeGreaterThan(3);
      expect(MOTIVI[m].aiuto.length).toBeGreaterThan(10);
      expect(typeof MOTIVI[m].urgente).toBe("boolean");
    }
  });

  it("ogni tipo segnalabile ha un'etichetta e un percorso definito", () => {
    for (const t of TIPI_SEGNALABILI) {
      expect(ETICHETTE_TIPO[t as TipoSegnalabile]).toBeTruthy();
      // Non deve lanciare: lo switch copre tutti i casi.
      expect(() => percorsoOggetto(t as TipoSegnalabile, "x")).not.toThrow();
    }
  });

  it("«Altro» non è urgente: è il raccoglitore, non un'emergenza", () => {
    expect(eUrgente("ALTRO")).toBe(false);
  });
});
