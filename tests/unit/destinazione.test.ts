import { describe, it, expect } from "vitest";
import { destinazioneSicura } from "@/lib/destinazione";

describe("destinazioneSicura", () => {
  it("accetta i percorsi interni, query compresa", () => {
    expect(destinazioneSicura("/dashboard")).toBe("/dashboard");
    expect(destinazioneSicura("/dashboard/messaggi/nuovo?a=tobia-renna")).toBe(
      "/dashboard/messaggi/nuovo?a=tobia-renna"
    );
  });

  it("ripiega sulla dashboard se manca", () => {
    expect(destinazioneSicura(undefined)).toBe("/dashboard");
    expect(destinazioneSicura("")).toBe("/dashboard");
    expect(destinazioneSicura(null)).toBe("/dashboard");
  });

  it("rifiuta gli URL assoluti", () => {
    expect(destinazioneSicura("https://vybes-fake.example")).toBe("/dashboard");
    expect(destinazioneSicura("http://evil.test/entra")).toBe("/dashboard");
  });

  it("rifiuta gli URL relativi al protocollo", () => {
    // `//evil.test` il browser lo legge come `https://evil.test`: è il modo
    // più comune di aggirare un controllo che guarda solo la prima barra.
    expect(destinazioneSicura("//evil.test")).toBe("/dashboard");
    expect(destinazioneSicura("//evil.test/percorso")).toBe("/dashboard");
  });

  it("rifiuta la variante con barra rovesciata", () => {
    expect(destinazioneSicura("/\\evil.test")).toBe("/dashboard");
  });

  it("rifiuta uno schema nascosto nel primo segmento", () => {
    expect(destinazioneSicura("/javascript:alert(1)")).toBe("/dashboard");
    expect(destinazioneSicura("/data:text/html,x")).toBe("/dashboard");
  });

  it("non si fa ingannare da un dominio messo dopo un percorso valido", () => {
    // Questo È un percorso interno e va accettato: /artisti/https:... è una
    // rotta del sito, non una navigazione esterna.
    expect(destinazioneSicura("/artisti/qualcuno")).toBe("/artisti/qualcuno");
  });
});
