import { describe, it, expect } from "vitest";
import {
  calcolaReputazione,
  dettaglioReputazione,
  reputazioneMassima,
  type FattiReputazione,
} from "@/lib/reputazione";

/**
 * Cosa proteggono questi test.
 *
 * La reputazione ordina la directory pubblica. Un errore qui non si manifesta
 * come un errore: si manifesta come un elenco in un ordine leggermente
 * sbagliato, che nessuno nota e che nessun tipo può cogliere — sono tutti
 * numeri validi.
 *
 * Le proprietà verificate non sono i valori delle singole voci (quelli
 * cambieranno) ma le due regole che rendono il punteggio difendibile: **ogni
 * voce ha un tetto**, quindi ripetere un'azione non porta da nessuna parte; e
 * **il punteggio segue lo stato**, quindi scende quando lo stato peggiora.
 * Se un giorno saltasse una di queste due, il difetto che abbiamo appena
 * rimosso tornerebbe con altri numeri.
 */

const vuoto: FattiReputazione = {
  emailVerified: null,
  isVerified: false,
  bio: null,
  headline: null,
  image: null,
  citySlug: null,
  disciplines: "",
  portfolio: 0,
  ingaggiConfermati: 0,
  ingaggiOrganizzati: 0,
};

const pieno: FattiReputazione = {
  emailVerified: new Date(),
  isVerified: true,
  bio: "x".repeat(400),
  headline: "Chitarrista",
  image: "https://esempio/foto.jpg",
  citySlug: "bologna",
  disciplines: "musica,live",
  portfolio: 5,
  ingaggiConfermati: 4,
  ingaggiOrganizzati: 2,
};

describe("calcolaReputazione", () => {
  it("un profilo appena creato parte da zero", () => {
    expect(calcolaReputazione(vuoto)).toBe(0);
  });

  it("un profilo completo arriva al massimo dichiarato", () => {
    expect(calcolaReputazione(pieno)).toBe(reputazioneMassima());
  });

  it("resta sempre dentro l'intervallo, anche con numeri assurdi", () => {
    // È il caso che conta davvero: senza tetti, chi carica duecento file
    // scavalca chiunque. Il valore non deve muoversi di un punto.
    const esagerato = { ...pieno, portfolio: 200, ingaggiConfermati: 999, ingaggiOrganizzati: 999 };
    expect(calcolaReputazione(esagerato)).toBe(reputazioneMassima());
  });
});

describe("nessuna voce si può sfruttare ripetendo la stessa azione", () => {
  it("il portfolio smette di pagare dopo il quinto lavoro", () => {
    const a = calcolaReputazione({ ...vuoto, portfolio: 5 });
    const b = calcolaReputazione({ ...vuoto, portfolio: 50 });
    expect(a).toBe(b);
  });

  it("le discipline smettono di pagare dopo la seconda", () => {
    // Dichiararne dieci non rende nessuno più affidabile: rende il profilo
    // meno leggibile. Senza tetto sarebbe il trucco più ovvio del sito.
    const a = calcolaReputazione({ ...vuoto, disciplines: "a,b" });
    const b = calcolaReputazione({ ...vuoto, disciplines: "a,b,c,d,e,f,g,h" });
    expect(a).toBe(b);
  });

  it("ogni voce non supera mai il proprio tetto", () => {
    for (const v of dettaglioReputazione(pieno)) {
      expect(v.punti, v.label).toBeLessThanOrEqual(v.max);
    }
  });
});

describe("il punteggio segue lo stato, anche verso il basso", () => {
  it("svuotare il portfolio fa scendere il punteggio", () => {
    expect(calcolaReputazione({ ...pieno, portfolio: 0 })).toBeLessThan(calcolaReputazione(pieno));
  });

  it("cancellare la biografia fa scendere il punteggio", () => {
    expect(calcolaReputazione({ ...pieno, bio: null })).toBeLessThan(calcolaReputazione(pieno));
  });

  it("una bio sotto la soglia minima non vale niente", () => {
    // Sotto i 120 caratteri il profilo non è nemmeno indicizzabile: pagarla
    // significherebbe premiare una riga scritta per far salire un numero.
    const corta = calcolaReputazione({ ...vuoto, bio: "Suono la chitarra." });
    expect(corta).toBe(0);
  });

  it("la biografia cresce a scaglioni, non linearmente", () => {
    const s = (n: number) => calcolaReputazione({ ...vuoto, bio: "x".repeat(n) });
    expect(s(119)).toBe(0);
    expect(s(120)).toBe(5);
    expect(s(200)).toBe(10);
    expect(s(400)).toBe(15);
    // Oltre il tetto non cambia più niente: fra ottocento e mille caratteri
    // non c'è nessuna differenza per chi legge.
    expect(s(4000)).toBe(s(400));
  });

  it("gli spazi non contano come biografia", () => {
    expect(calcolaReputazione({ ...vuoto, bio: " ".repeat(500) })).toBe(0);
  });
});

describe("il peso relativo delle voci", () => {
  it("un ingaggio confermato vale più di un lavoro nel portfolio", () => {
    // È l'unica voce che non dipende da chi la riceve: la assegna qualcun
    // altro scegliendo quella persona. Se un giorno pesasse meno del
    // portfolio, il punteggio tornerebbe a misurare l'attività.
    const conIngaggio = calcolaReputazione({ ...vuoto, ingaggiConfermati: 1 });
    const conLavoro = calcolaReputazione({ ...vuoto, portfolio: 1 });
    expect(conIngaggio).toBeGreaterThan(conLavoro);
  });

  it("nessuna singola voce vale più di un quinto del totale", () => {
    // Un profilo non deve poter arrivare in cima grazie a una cosa sola.
    const massimo = reputazioneMassima();
    for (const v of dettaglioReputazione(pieno)) {
      expect(v.max, v.label).toBeLessThanOrEqual(massimo / 5);
    }
  });
});

describe("ogni voce si sa spiegare", () => {
  it("ha un'etichetta e un'istruzione non vuote", () => {
    // Un punteggio che decide la visibilità e non dice come si ottiene è
    // indistinguibile dall'arbitrio: la stringa `come` è parte del contratto,
    // non decorazione.
    for (const v of dettaglioReputazione(vuoto)) {
      expect(v.label.trim().length).toBeGreaterThan(0);
      expect(v.come.trim().length, v.label).toBeGreaterThan(0);
    }
  });

  it("le etichette sono uniche: sono usate come chiave in elenco", () => {
    const etichette = dettaglioReputazione(vuoto).map((v) => v.label);
    expect(new Set(etichette).size).toBe(etichette.length);
  });

  it("il totale è la somma delle voci mostrate", () => {
    // Se il totale e il dettaglio divergessero, la scheda direbbe una cosa e
    // la directory ne farebbe un'altra.
    const voci = dettaglioReputazione(pieno);
    const somma = voci.reduce((s, v) => s + v.punti, 0);
    expect(calcolaReputazione(pieno)).toBe(somma);
  });
});
