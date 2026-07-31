import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildMetadata, metaDescription, alternateLanguages, absoluteUrl, localizedPath } from "@/lib/seo";

const SITE = "https://vybeshub.art";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = SITE;
});
afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("metaDescription", () => {
  it("tiene le descrizioni corte così come sono", () => {
    expect(metaDescription("Cantautrice indie-pop a Milano.")).toBe("Cantautrice indie-pop a Milano.");
  });

  it("taglia sotto i 155 caratteri senza spezzare le parole", () => {
    const out = metaDescription("parolalunga ".repeat(40));
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("...")).toBe(true);
    expect(out).not.toMatch(/parolalu\.\.\.$/);
  });

  it("normalizza gli spazi multipli", () => {
    expect(metaDescription("uno   due\n\ntre")).toBe("uno due tre");
  });

  it("usa il fallback quando il testo è vuoto", () => {
    expect(metaDescription("", "fallback")).toBe("fallback");
    expect(metaDescription(null, "fallback")).toBe("fallback");
  });
});

describe("URL canonici", () => {
  it("costruisce URL assoluti dal path", () => {
    expect(absoluteUrl("/artisti/mario")).toBe(`${SITE}/artisti/mario`);
    expect(absoluteUrl("artisti/mario")).toBe(`${SITE}/artisti/mario`);
  });

  it("la lingua di default non ha prefisso", () => {
    expect(localizedPath("/eventi", "it")).toBe("/eventi");
  });

  it("le altre lingue vengono prefissate", () => {
    expect(localizedPath("/eventi", "en")).toBe("/en/eventi");
    expect(localizedPath("/", "en")).toBe("/en");
  });
});

describe("alternateLanguages", () => {
  it("emette solo le lingue pubblicate, più x-default", () => {
    const alt = alternateLanguages("/artisti");
    // Con LOCALES = ["it"] non deve comparire /en: un hreflang verso una
    // pagina inesistente è un errore segnalato da Search Console.
    expect(alt).toHaveProperty("it-IT", `${SITE}/artisti`);
    expect(alt).toHaveProperty("x-default", `${SITE}/artisti`);
    expect(alt).not.toHaveProperty("en");
  });
});

describe("buildMetadata", () => {
  it("imposta canonical, robots indicizzabili e Open Graph", () => {
    const meta = buildMetadata({ title: "Artisti", description: "Elenco", path: "/artisti" });
    expect(meta.alternates?.canonical).toBe(`${SITE}/artisti`);
    expect(meta.robots).toMatchObject({ index: true, follow: true });
    expect(meta.openGraph?.url).toBe(`${SITE}/artisti`);
  });

  it("con noindex esclude dall'indice ma lascia seguire i link", () => {
    const meta = buildMetadata({ title: "Cerca", path: "/cerca", noindex: true });
    expect(meta.robots).toMatchObject({ index: false, follow: true });
  });

  it("usa l'immagine social di default quando non ne viene passata una", () => {
    const meta = buildMetadata({ title: "Home", path: "/" });
    const images = meta.openGraph?.images as { url: string }[];
    expect(images[0].url).toContain("/og-default.png");
  });

  it("rende assoluti gli URL delle immagini relative", () => {
    const meta = buildMetadata({ title: "X", path: "/x", images: [{ url: "/uploads/a.jpg" }] });
    const images = meta.openGraph?.images as { url: string }[];
    expect(images[0].url).toBe(`${SITE}/uploads/a.jpg`);
  });

  it("lascia intatti gli URL già assoluti", () => {
    const remote = "https://cdn.example.com/a.jpg";
    const meta = buildMetadata({ title: "X", path: "/x", images: [{ url: remote }] });
    const images = meta.openGraph?.images as { url: string }[];
    expect(images[0].url).toBe(remote);
  });
});
