import { describe, it, expect } from "vitest";
import { toSlug, uniqueSlug, fromCsv, toCsv } from "@/lib/slug";
import { haversineKm, SEED_CITIES, cityIntro } from "@/lib/cities";

describe("toSlug", () => {
  it("normalizza accenti e spazi", () => {
    expect(toSlug("Città di Milano")).toBe("citta-di-milano");
  });

  it("rimuove la punteggiatura e traduce la e commerciale in italiano", () => {
    expect(toSlug("Rock & Roll, che passione!")).toBe("rock-e-roll-che-passione");
  });

  it("non restituisce mai stringa vuota", () => {
    expect(toSlug("...")).toBe("");
    expect(toSlug("")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("tiene lo slug base se libero", async () => {
    expect(await uniqueSlug("Mario Rossi", async () => false)).toBe("mario-rossi");
  });

  it("aggiunge un suffisso progressivo in caso di collisione", async () => {
    const taken = new Set(["mario-rossi", "mario-rossi-2"]);
    expect(await uniqueSlug("Mario Rossi", async (s) => taken.has(s))).toBe("mario-rossi-3");
  });

  it("usa un fallback se il nome non produce slug", async () => {
    expect(await uniqueSlug("!!!", async () => false)).toBe("vybes");
  });
});

describe("csv helper", () => {
  it("fa il giro completo senza perdere valori", () => {
    expect(fromCsv(toCsv(["dj", "band"]))).toEqual(["dj", "band"]);
  });

  it("elimina i duplicati", () => {
    expect(toCsv(["dj", "dj", "band"])).toBe("dj,band");
  });

  it("gestisce null e stringa vuota", () => {
    expect(fromCsv(null)).toEqual([]);
    expect(fromCsv("")).toEqual([]);
  });

  it("scarta gli spazi vuoti", () => {
    expect(fromCsv("dj, , band")).toEqual(["dj", "band"]);
  });
});

describe("haversineKm", () => {
  it("è zero sullo stesso punto", () => {
    expect(haversineKm({ lat: 45, lng: 9 }, { lat: 45, lng: 9 })).toBe(0);
  });

  it("stima Milano–Roma intorno ai 480 km", () => {
    const milano = { lat: 45.4642, lng: 9.19 };
    const roma = { lat: 41.9028, lng: 12.4964 };
    expect(haversineKm(milano, roma)).toBeGreaterThan(450);
    expect(haversineKm(milano, roma)).toBeLessThan(510);
  });

  it("è simmetrica", () => {
    const a = { lat: 45, lng: 9 };
    const b = { lat: 41, lng: 12 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

describe("dati città", () => {
  it("ha slug unici", () => {
    const slugs = SEED_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("ha coordinate plausibili per l'Italia", () => {
    for (const c of SEED_CITIES) {
      expect(c.lat).toBeGreaterThan(35);
      expect(c.lat).toBeLessThan(48);
      expect(c.lng).toBeGreaterThan(6);
      expect(c.lng).toBeLessThan(19);
    }
  });

  it("genera intro diverse per città diverse: niente contenuto duplicato", () => {
    const intros = SEED_CITIES.map(cityIntro);
    expect(new Set(intros).size).toBe(intros.length);
  });
});
