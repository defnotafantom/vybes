import { describe, it, expect } from "vitest";
import { haSessione } from "@/middleware";

/**
 * Il difetto che faceva sembrare che la sessione scadesse.
 *
 * Non scadeva: il middleware non la vedeva. Quando il token supera i
 * quattromila byte — il limite che i browser impongono a un singolo cookie —
 * Auth.js lo spezza in parti numerate. Il controllo cercava il nome esatto,
 * non lo trovava, e rimandava al login chi era regolarmente autenticato.
 *
 * Era intermittente, ed è la ragione per cui è sopravvissuto a lungo: la
 * dimensione del token dipende da cosa contiene. Un utente con un nome corto e
 * senza immagine non lo incontrava mai; uno arrivato da Google, con un URL di
 * avatar lungo, sì.
 */

const NUDO = "authjs.session-token";
const SICURO = "__Secure-authjs.session-token";

describe("riconoscimento del cookie di sessione", () => {
  it("riconosce il cookie intero in sviluppo", () => {
    expect(haSessione([NUDO])).toBe(true);
  });

  it("riconosce il cookie intero su HTTPS", () => {
    expect(haSessione([SICURO])).toBe(true);
  });

  it("riconosce il cookie spezzato — il difetto vero", () => {
    expect(haSessione([`${NUDO}.0`])).toBe(true);
    expect(haSessione([`${NUDO}.0`, `${NUDO}.1`])).toBe(true);
    expect(haSessione([`${SICURO}.0`, `${SICURO}.1`, `${SICURO}.2`])).toBe(true);
  });

  it("lo riconosce anche in mezzo agli altri cookie del sito", () => {
    expect(
      haSessione(["vybes-theme", `${SICURO}.0`, `${SICURO}.1`, "authjs.csrf-token"])
    ).toBe(true);
  });

  it("non vede una sessione dove non c'è", () => {
    expect(haSessione([])).toBe(false);
    expect(haSessione(["vybes-theme", "authjs.csrf-token", "authjs.callback-url"])).toBe(false);
  });

  it("non si fa ingannare da un nome che comincia allo stesso modo", () => {
    // `authjs.session-tokenXYZ` non è una parte del cookie: le parti hanno un
    // punto e un numero. Accettarlo aprirebbe la porta a un cookie qualsiasi
    // scelto da chi attacca — il controllo diventerebbe carta.
    expect(haSessione(["authjs.session-tokenXYZ"])).toBe(false);
    expect(haSessione(["authjs.session-token-finto"])).toBe(false);
  });

  it("il token CSRF non vale come sessione", () => {
    // Sta lì accanto e comincia con lo stesso prefisso: è l'errore in cui si
    // cade allargando troppo il confronto.
    expect(haSessione(["authjs.csrf-token", "__Secure-authjs.csrf-token"])).toBe(false);
  });
});
