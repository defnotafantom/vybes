import { describe, it, expect } from "vitest";
import { conta, concorda } from "@/lib/testo";

/**
 * Lo stesso errore è arrivato in produzione due volte: «1 ARTISTI» sulla
 * pagina delle città, «1 messaggi» in cima a una conversazione. Non comunica
 * un difetto a chi legge: comunica che dietro non c'è nessuno che guarda.
 */
describe("conta", () => {
  it("usa il singolare per uno", () => {
    expect(conta(1, "messaggio", "messaggi")).toBe("1 messaggio");
  });

  it("usa il plurale per zero, che in italiano è la forma giusta", () => {
    expect(conta(0, "messaggio", "messaggi")).toBe("0 messaggi");
  });

  it("usa il plurale oltre uno", () => {
    expect(conta(7, "candidatura", "candidature")).toBe("7 candidature");
  });
});

describe("concorda", () => {
  it("restituisce solo il sostantivo, senza il numero", () => {
    expect(concorda(1, "artista", "artisti")).toBe("artista");
    expect(concorda(3, "artista", "artisti")).toBe("artisti");
    expect(concorda(0, "artista", "artisti")).toBe("artisti");
  });
});
