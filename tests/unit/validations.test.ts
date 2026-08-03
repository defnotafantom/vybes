import { describe, it, expect } from "vitest";
import {
  registerSchema,
  passwordSchema,
  eventSchema,
  eventNuovoSchema,
  postSchema,
  profileSchema,
  stripHtml,
} from "@/lib/validations";

describe("passwordSchema", () => {
  it("accetta una password conforme", () => {
    expect(passwordSchema.safeParse("PasswordSicura1").success).toBe(true);
  });

  it.each([
    ["troppo corta", "Abc12345"],
    ["senza maiuscole", "passwordlunga1"],
    ["senza minuscole", "PASSWORDLUNGA1"],
    ["senza numeri", "PasswordLunghissima"],
  ])("rifiuta password %s", (_, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("normalizza l'email in minuscolo", () => {
    const out = registerSchema.parse({
      name: "Mario",
      email: "Mario.Rossi@Example.COM",
      password: "PasswordSicura1",
    });
    expect(out.email).toBe("mario.rossi@example.com");
  });

  it("assegna ARTIST come ruolo di default", () => {
    const out = registerSchema.parse({ name: "Mario", email: "m@e.it", password: "PasswordSicura1" });
    expect(out.role).toBe("ARTIST");
  });

  it("rifiuta i ruoli non previsti", () => {
    const res = registerSchema.safeParse({
      name: "Mario", email: "m@e.it", password: "PasswordSicura1", role: "ADMIN",
    });
    expect(res.success).toBe(false);
  });
});

describe("eventSchema", () => {
  const valid = {
    title: "Cercasi cantautore",
    description: "Descrizione sufficientemente lunga per superare il minimo richiesto.",
    startsAt: "2026-09-01T20:00",
    citySlug: "milano",
    latitude: 45.46,
    longitude: 9.19,
  };

  it("accetta un ingaggio valido", () => {
    expect(eventSchema.safeParse(valid).success).toBe(true);
  });

  it("rifiuta una fine precedente all'inizio", () => {
    const res = eventSchema.safeParse({ ...valid, endsAt: "2026-08-31T20:00" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.errors[0].path).toContain("endsAt");
  });

  it("pretende il compenso minimo se l'ingaggio è retribuito", () => {
    const res = eventSchema.safeParse({ ...valid, isPaid: true });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.errors[0].path).toContain("feeMin");
  });

  it("accetta un ingaggio retribuito con compenso indicato", () => {
    expect(eventSchema.safeParse({ ...valid, isPaid: true, feeMin: 250 }).success).toBe(true);
  });

  it("rifiuta coordinate fuori scala", () => {
    expect(eventSchema.safeParse({ ...valid, latitude: 120 }).success).toBe(false);
  });

  it("rifiuta descrizioni troppo brevi per essere utili", () => {
    expect(eventSchema.safeParse({ ...valid, description: "corta" }).success).toBe(false);
  });
});

describe("postSchema", () => {
  it("valorizza i campi con default invece di lasciarli undefined", () => {
    const out = postSchema.parse({ content: "ciao" });
    expect(out.tags).toEqual([]);
    expect(out.collaborationArtists).toEqual([]);
    expect(out.type).toBe("STANDARD");
  });

  it("rifiuta un post vuoto", () => {
    expect(postSchema.safeParse({ content: "" }).success).toBe(false);
  });

  it("limita il numero di tag", () => {
    const tags = Array.from({ length: 7 }, (_, i) => `tag${i}`);
    expect(postSchema.safeParse({ content: "x", tags }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accetta i link vuoti come stringa vuota", () => {
    expect(profileSchema.safeParse({ name: "Mario", website: "" }).success).toBe(true);
  });

  it("rifiuta un URL malformato", () => {
    expect(profileSchema.safeParse({ name: "Mario", website: "non-un-url" }).success).toBe(false);
  });

  it("limita le discipline a cinque", () => {
    const disciplines = ["a", "b", "c", "d", "e", "f"];
    expect(profileSchema.safeParse({ name: "Mario", disciplines }).success).toBe(false);
  });
});

/**
 * ── Perché questo blocco esiste ──
 *
 * `eventSchema` non chiedeva che la data fosse futura. Il modulo accettava,
 * l'API rispondeva 201, la pagina dell'ingaggio si apriva — e l'annuncio non
 * compariva in nessun elenco, perché `/eventi`, le directory di città e la
 * mappa filtrano tutte per `startsAt >= adesso`.
 *
 * Non un errore che si vede: un successo che non è successo. In produzione
 * c'era un ingaggio datato 3 marzo 2024, pubblicato e invisibile.
 */
describe("eventNuovoSchema — la data di un annuncio nuovo", () => {
  const base = {
    title: "Cercasi cantautore",
    description: "Descrizione sufficientemente lunga per superare il minimo richiesto.",
    citySlug: "milano",
    latitude: 45.46,
    longitude: 9.19,
  };

  /** Le date si calcolano da adesso: una scritta a mano scade da sola. */
  const fra = (giorni: number) =>
    new Date(Date.now() + giorni * 86_400_000).toISOString().slice(0, 16);

  it("accetta una data futura", () => {
    expect(eventNuovoSchema.safeParse({ ...base, startsAt: fra(30) }).success).toBe(true);
  });

  it("rifiuta una data passata, indicando il campo giusto", () => {
    const res = eventNuovoSchema.safeParse({ ...base, startsAt: fra(-1) });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.errors[0].path).toContain("startsAt");
  });

  it("rifiuta anche ieri sera, non solo l'anno scorso", () => {
    // La soglia è esattamente quella con cui la directory decide se mostrare
    // l'annuncio. Una più generosa rimetterebbe in circolo annunci
    // pubblicabili e invisibili, cioè il difetto di partenza in piccolo.
    expect(eventNuovoSchema.safeParse({ ...base, startsAt: fra(-0.2) }).success).toBe(false);
  });

  it("la modifica resta possibile su un annuncio già passato", () => {
    // `eventSchema` senza il vincolo è quello che usa la PATCH: correggere un
    // refuso nel titolo di una serata dell'anno scorso deve funzionare. Una
    // validazione che impedisce di sistemare i propri errori è peggio del
    // problema che risolve.
    expect(eventSchema.safeParse({ ...base, startsAt: fra(-400) }).success).toBe(true);
  });
});

describe("stripHtml", () => {
  it("rimuove i tag lasciando il testo", () => {
    expect(stripHtml("<b>ciao</b> mondo")).toBe("ciao mondo");
  });

  it("neutralizza uno script iniettato", () => {
    expect(stripHtml('<script>alert(1)</script>')).not.toContain("<script");
  });
});
