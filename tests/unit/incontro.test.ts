import { describe, it, expect } from "vitest";
import { operaDelGiorno, semeDa } from "@/lib/incontro";

/**
 * La rotazione dell'incontro.
 *
 * Le tre proprietà messe sotto controllo non sono «il codice fa quello che
 * dice»: sono le tre cose che, rompendosi, non darebbero nessun errore e
 * sarebbero visibili solo dopo settimane d'uso.
 */

const CATALOGO = Array.from({ length: 12 }, (_, i) => `opera-${i}`);

describe("operaDelGiorno", () => {
  it("lo stesso giorno restituisce sempre la stessa opera", () => {
    // «Una al giorno» dev'essere vero anche ricaricando. Se cambiasse a ogni
    // richiesta diventerebbe uno scorrimento infinito — cioè esattamente la
    // cosa che POSIZIONE.md dichiara di non voler essere — e la pagina non
    // sarebbe memorizzabile nella cache.
    const a = operaDelGiorno(CATALOGO, 20260, "utente-1");
    const b = operaDelGiorno(CATALOGO, 20260, "utente-1");
    expect(a).toBe(b);
  });

  it("cambia da un giorno all'altro", () => {
    const oggi = operaDelGiorno(CATALOGO, 20260, "utente-1");
    const domani = operaDelGiorno(CATALOGO, 20261, "utente-1");
    expect(domani).not.toBe(oggi);
  });

  it("copre tutto il catalogo senza saltarne pezzi", () => {
    /*
     * Questa è la proprietà che si romperebbe in silenzio.
     *
     * Con un passo **pari** e un catalogo di lunghezza pari, la sequenza
     * visita solo metà delle opere: l'altra metà non comparirebbe mai a
     * quell'utente, per sempre. Nessun errore, nessun sintomo — solo un
     * catalogo che sembra più piccolo di quello che è.
     *
     * `operaDelGiorno` costruisce il passo dispari apposta. Il controllo
     * verifica la conseguenza, non l'implementazione: dodici giorni, dodici
     * opere diverse.
     */
    const viste = new Set(
      Array.from({ length: CATALOGO.length }, (_, g) => operaDelGiorno(CATALOGO, g, "utente-1"))
    );
    expect(viste.size).toBe(CATALOGO.length);
  });

  it("due persone lo stesso giorno incontrano opere diverse", () => {
    // Senza questa proprietà, un catalogo di cinquecento opere avrebbe una
    // copertura di trecentosessantacinque all'anno **per tutti insieme**,
    // invece che per ciascuno.
    const giorno = 20260;
    const sequenze = ["a", "b", "c", "d", "e"].map((chi) =>
      Array.from({ length: 5 }, (_, i) => operaDelGiorno(CATALOGO, giorno + i, chi)).join("|")
    );
    expect(new Set(sequenze).size).toBeGreaterThan(1);
  });

  it("con il catalogo vuoto non inventa niente", () => {
    expect(operaDelGiorno([], 20260, "utente-1")).toBeNull();
  });

  it("con una sola opera resta quella, senza andare fuori dall'elenco", () => {
    // Il caso limite del modulo: con lunghezza 1 il passo non ha spazio, e
    // un indice fuori intervallo qui darebbe `undefined` invece di un'opera.
    expect(operaDelGiorno(["unica"], 20260, "x")).toBe("unica");
    expect(operaDelGiorno(["unica"], 99999, "y")).toBe("unica");
  });
});

describe("semeDa", () => {
  it("identificatori che si somigliano danno semi lontani", () => {
    // Gli `id` di Prisma condividono il prefisso: se il seme li seguisse,
    // utenti creati nello stesso momento vedrebbero le stesse opere.
    const a = semeDa("clxk1a2b3c4d5e6f7g8h9i0j");
    const b = semeDa("clxk1a2b3c4d5e6f7g8h9i0k");
    expect(a).not.toBe(b);
  });

  it("è una funzione, non un caso", () => {
    expect(semeDa("stesso")).toBe(semeDa("stesso"));
  });
});
