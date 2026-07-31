import { describe, it, expect } from "vitest";
import { xpForLevel, levelFromXp, levelProgress } from "@/lib/levels";

describe("curva dei livelli", () => {
  it("parte dal livello 1 a zero esperienza", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it("è monotona crescente", () => {
    for (let level = 1; level < 30; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level));
    }
  });

  it("richiede sempre più XP per salire di livello", () => {
    const salto = (l: number) => xpForLevel(l + 1) - xpForLevel(l);
    for (let level = 2; level < 20; level++) {
      expect(salto(level)).toBeGreaterThanOrEqual(salto(level - 1));
    }
  });

  it("levelFromXp è coerente con xpForLevel", () => {
    for (let level = 1; level < 25; level++) {
      expect(levelFromXp(xpForLevel(level))).toBe(level);
      expect(levelFromXp(xpForLevel(level + 1) - 1)).toBe(level);
    }
  });
});

describe("levelProgress", () => {
  it("resta tra 0 e 100", () => {
    for (const xp of [0, 1, 99, 500, 5000, 100000]) {
      const p = levelProgress(xp);
      expect(p.percent).toBeGreaterThanOrEqual(0);
      expect(p.percent).toBeLessThanOrEqual(100);
    }
  });

  it("è a zero appena raggiunto un livello", () => {
    expect(levelProgress(xpForLevel(5)).percent).toBe(0);
  });

  it("non divide mai per zero", () => {
    expect(Number.isFinite(levelProgress(0).percent)).toBe(true);
  });
});
