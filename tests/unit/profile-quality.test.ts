import { describe, it, expect } from "vitest";
import { isProfileIndexable, missingForIndex, MIN_BIO } from "@/lib/profile-quality";

const bioLunga = "Cantautrice milanese, ".repeat(8); // ben oltre la soglia
const bioCorta = "Cantante.";

describe("isProfileIndexable", () => {
  it("accetta un profilo con disciplina e biografia sostanziosa", () => {
    expect(
      isProfileIndexable({ bio: bioLunga, disciplines: "cantante", portfolioCount: 0 })
    ).toBe(true);
  });

  it("accetta un profilo con disciplina e almeno un lavoro, anche senza biografia", () => {
    // Un fotografo o un ballerino si presentano mostrando, non scrivendo:
    // pretendere la biografia escluderebbe metà delle discipline.
    expect(isProfileIndexable({ bio: null, disciplines: "dj", portfolioCount: 3 })).toBe(true);
  });

  it("rifiuta un profilo senza disciplina, per quanto scritto bene", () => {
    // Senza disciplina la pagina non risponde a nessuna ricerca reale:
    // nessuno cerca "un artista", si cerca "un chitarrista a Bologna".
    expect(
      isProfileIndexable({ bio: bioLunga, disciplines: "", portfolioCount: 5 })
    ).toBe(false);
  });

  it("rifiuta un profilo vuoto — il caso 'kkkk' visto in produzione", () => {
    expect(isProfileIndexable({ bio: null, disciplines: "", portfolioCount: 0 })).toBe(false);
  });

  it("rifiuta una biografia troppo corta senza portfolio", () => {
    expect(
      isProfileIndexable({ bio: bioCorta, disciplines: "cantante", portfolioCount: 0 })
    ).toBe(false);
  });

  it("non lascia passare una biografia fatta di soli spazi", () => {
    expect(
      isProfileIndexable({ bio: " ".repeat(MIN_BIO + 50), disciplines: "cantante", portfolioCount: 0 })
    ).toBe(false);
  });

  it("tratta la soglia della biografia come inclusiva", () => {
    const esatta = "x".repeat(MIN_BIO);
    expect(
      isProfileIndexable({ bio: esatta, disciplines: "cantante", portfolioCount: 0 })
    ).toBe(true);
    expect(
      isProfileIndexable({ bio: esatta.slice(0, -1), disciplines: "cantante", portfolioCount: 0 })
    ).toBe(false);
  });
});

describe("missingForIndex", () => {
  it("non segnala nulla se il profilo è a posto", () => {
    expect(
      missingForIndex({ bio: bioLunga, disciplines: "cantante", portfolioCount: 0 })
    ).toEqual([]);
  });

  it("elenca entrambe le mancanze di un profilo vuoto", () => {
    const m = missingForIndex({ bio: null, disciplines: "", portfolioCount: 0 });
    expect(m).toHaveLength(2);
    expect(m[0]).toMatch(/disciplina/i);
  });

  it("dice quanto manca quando la biografia è iniziata ma corta", () => {
    const m = missingForIndex({ bio: bioCorta, disciplines: "dj", portfolioCount: 0 });
    expect(m).toHaveLength(1);
    expect(m[0]).toContain(`${bioCorta.length} caratteri`);
  });
});
