import { describe, it, expect } from "vitest";
import { nonLetta } from "@/lib/attenzione";

const t = (ms: number) => new Date(2026, 0, 1, 12, 0, 0, ms);

describe("nonLetta", () => {
  it("una conversazione mai aperta con messaggi è da leggere", () => {
    expect(nonLetta(null, t(0))).toBe(true);
    expect(nonLetta(undefined, t(0))).toBe(true);
  });

  it("una conversazione vuota non è da leggere", () => {
    // Succede davvero: qualcuno preme «Contatta» e poi non scrive. Segnalarla
    // manderebbe l'altra persona a cercare un messaggio che non c'è.
    expect(nonLetta(null, undefined)).toBe(false);
    expect(nonLetta(t(0), undefined)).toBe(false);
  });

  it("è da leggere se l'ultimo messaggio è arrivato dopo l'apertura", () => {
    expect(nonLetta(t(100), t(200))).toBe(true);
  });

  it("non è da leggere se l'ultimo messaggio precede l'apertura", () => {
    expect(nonLetta(t(200), t(100))).toBe(false);
  });

  it("un messaggio nello stesso istante dell'apertura è stato visto", () => {
    // Confronto stretto: con `>=` ogni conversazione appena aperta
    // risulterebbe non letta, e il contatore non scenderebbe mai a zero.
    expect(nonLetta(t(100), t(100))).toBe(false);
  });
});
