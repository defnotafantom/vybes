import { describe, it, expect } from "vitest";
import { COSMETICI, SLOT, RARITA, cosmeticoDi, inVendita, prezzoDi } from "@/lib/cosmetici";

/**
 * L'invariante che questo file esiste per difendere.
 *
 *     Le monete comprano ciò che si vede. Non comprano mai ciò che decide.
 *
 * È scritta in ADR-047, e un ADR non compila. Su questo progetto la forma di
 * difetto più frequente è **la regola che esiste e che niente applica**: è
 * successo con la visibilità dei profili, con la soglia della vetrina, con il
 * ricalcolo della reputazione di chi risponde. Qui il costo di sbagliare è più
 * alto di tutti quelli, perché un oggetto che compra visibilità non si nota
 * guardando il sito — si nota mesi dopo, quando la directory non è più utile a
 * nessuno e non si sa perché.
 *
 * Queste prove sono il punto in cui quella regola diventa eseguibile.
 */

describe("nessun oggetto acquistabile tocca ciò che decide", () => {
  // Le parole che non devono comparire fra gli effetti di uno slot. Se
  // qualcuno aggiunge «boost», «priorita» o «vetrina» al tipo `Effetto`, è qui
  // che se ne accorge — e leggendo questo commento capisce anche perché non
  // deve.
  const VIETATO = [
    "ordinamento",
    "reputazione",
    "vetrina",
    "indicizzazione",
    "precedenza",
    "priorita",
    "boost",
    "visibilita",
    "ricerca",
    "distintivo",
  ];

  it("ogni slot dichiara solo effetti d'aspetto", () => {
    for (const [nome, s] of Object.entries(SLOT)) {
      expect(s.tocca.length, `${nome} non dichiara cosa tocca`).toBeGreaterThan(0);
      for (const e of s.tocca) {
        expect(e, `slot ${nome}`).toMatch(/^aspetto-/);
      }
    }
  });

  it("nessun effetto nomina qualcosa che influenza chi viene trovato", () => {
    const tutti = Object.values(SLOT).flatMap((s) => s.tocca.map(String));
    for (const e of tutti) {
      for (const parola of VIETATO) {
        expect(e.includes(parola), `l'effetto "${e}" contiene "${parola}"`).toBe(false);
      }
    }
  });

  it("ogni cosmetico sta in uno slot dichiarato", () => {
    // Uno slot non dichiarato è un cosmetico di cui nessuno ha risposto alla
    // domanda «e questo cosa cambia?»: è già fuori controllo.
    for (const c of COSMETICI) {
      expect(SLOT[c.slot], `${c.id} usa lo slot sconosciuto "${c.slot}"`).toBeDefined();
    }
  });
});

describe("il catalogo è coerente", () => {
  it("gli id sono unici: sono la chiave scritta nei possessi", () => {
    // Un id duplicato significa che due oggetti diversi finiscono nella stessa
    // riga di `Possesso`, e chi ha comprato il primo si ritrova il secondo.
    const ids = COSMETICI.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gli id sono stabili nella forma: minuscoli, senza spazi", () => {
    // Finiscono in una colonna del database e non si potranno più cambiare
    // senza una migrazione dei dati: meglio che nascano in un formato solo.
    for (const c of COSMETICI) {
      expect(c.id, c.nome).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("ogni oggetto ha un nome e qualcosa da disegnare", () => {
    for (const c of COSMETICI) {
      expect(c.nome.trim().length, c.id).toBeGreaterThan(0);
      expect(c.reso.trim().length, c.id).toBeGreaterThan(0);
      expect(RARITA[c.rarita], `${c.id} ha una rarità sconosciuta`).toBeDefined();
    }
  });

  it("i prezzi sono positivi, o l'oggetto non è in vendita", () => {
    // Un prezzo zero è la via più silenziosa per regalare un oggetto epico:
    // sembra un valore mancante, non una decisione.
    for (const c of COSMETICI) {
      if (c.prezzo === null) continue;
      expect(c.prezzo, c.id).toBeGreaterThan(0);
    }
  });

  it("un oggetto fuori vendita dice come si ottiene", () => {
    // «Non è in vendita» e basta è un muro. Chi lo legge deve sapere se c'è un
    // modo, o se ha semplicemente perso il treno.
    for (const c of COSMETICI.filter((x) => x.prezzo === null)) {
      expect(c.sblocco?.trim().length ?? 0, c.id).toBeGreaterThan(0);
    }
  });

  it("le cose che non si comprano sono davvero le più rare", () => {
    // Se un oggetto ottenibile solo vincendo costasse anche poche monete, la
    // scarsità sarebbe finta e il titolo non direbbe più niente di chi lo
    // porta. Questa prova impedisce di metterlo in saldo per sbaglio.
    for (const c of COSMETICI.filter((x) => x.rarita === "stagionale")) {
      expect(c.prezzo === null || c.prezzo >= 900, `${c.id} è stagionale e costa poco`).toBe(true);
    }
  });
});

describe("prezzoDi", () => {
  it("dà il prezzo di ciò che è in vendita", () => {
    const c = inVendita()[0];
    expect(prezzoDi(c.id)).toEqual({ ok: true, prezzo: c.prezzo });
  });

  it("spiega perché, invece di lanciare, quando non è in vendita", () => {
    // «Non è in vendita» non è un guasto: è una risposta legittima, e chi la
    // riceve deve poterla mostrare a chi ha premuto il pulsante.
    const fuori = COSMETICI.find((c) => c.prezzo === null)!;
    const r = prezzoDi(fuori.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo.length).toBeGreaterThan(10);
  });

  it("un id inventato non trova niente e non esplode", () => {
    expect(prezzoDi("cornice-che-non-esiste").ok).toBe(false);
    expect(cosmeticoDi("cornice-che-non-esiste")).toBeUndefined();
  });

  it("inVendita non contiene mai ciò che si ottiene solo meritandolo", () => {
    for (const c of inVendita()) expect(c.prezzo, c.id).not.toBeNull();
  });
});
