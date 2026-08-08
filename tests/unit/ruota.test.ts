import { describe, it, expect } from "vitest";
import { SPICCHI, TOTALE_PESI, premioDi, cosmeticoDelPremio, COME_SI_APRE } from "@/lib/ruota";
import { cosmeticoDi } from "@/lib/cosmetici";

/**
 * Cosa protegge questo file.
 *
 * Una ruota sbagliata non dà nessun errore: dà premi. Se uno spicchio è
 * irraggiungibile per un errore nei pesi, nessuno se ne accorge — chi non lo
 * vince pensa di essere sfortunato, ed è la conclusione che trae comunque.
 *
 * L'altra cosa che protegge è più seria: se l'esito non fosse deterministico
 * su `(utente, giorno)`, una richiesta ripetuta darebbe premi diversi, e
 * girare finché non esce quello buono diventerebbe possibile.
 */

describe("l'esito è deciso da chi gira e da quando", () => {
  it("stesso utente, stesso giorno, stesso premio", () => {
    // È la difesa contro il «rigira finché non esce bene»: rilanciare la
    // richiesta non cambia niente, quindi non c'è niente da guadagnare.
    expect(premioDi("utente-1", 20_300)).toEqual(premioDi("utente-1", 20_300));
  });

  it("giorni diversi danno esiti che cambiano", () => {
    const settimana = Array.from({ length: 30 }, (_, i) => premioDi("utente-1", 20_300 + i).chiave);
    expect(new Set(settimana).size).toBeGreaterThan(1);
  });

  it("persone diverse nello stesso giorno non vincono tutte lo stesso", () => {
    // Con un seme costruito solo sul giorno, l'intero sito avrebbe vinto la
    // stessa cosa: sembra un dettaglio e si nota subito, perché due amici si
    // scrivono «anche a te 25 monete?».
    const oggi = Array.from({ length: 40 }, (_, i) => premioDi(`utente-${i}`, 20_300).chiave);
    expect(new Set(oggi).size).toBeGreaterThan(1);
  });
});

describe("i pesi", () => {
  it("sono tutti positivi: nessuno spicchio è irraggiungibile", () => {
    for (const p of SPICCHI) expect(p.peso, p.chiave).toBeGreaterThan(0);
  });

  it("il totale è la loro somma, e non è zero", () => {
    expect(TOTALE_PESI).toBe(SPICCHI.reduce((s, p) => s + p.peso, 0));
    expect(TOTALE_PESI).toBeGreaterThan(0);
  });

  it("su molte estrazioni escono tutti gli spicchi", () => {
    // La prova che i pesi funzionano davvero, invece di fidarsi
    // dell'aritmetica: se un premio non esce mai in cinquemila giri, o il suo
    // peso è sbagliato o l'estrazione lo salta.
    const usciti = new Set<string>();
    for (let i = 0; i < 5000; i++) usciti.add(premioDi(`u${i}`, 20_300 + (i % 60)).chiave);
    for (const p of SPICCHI) expect(usciti.has(p.chiave), p.chiave).toBe(true);
  });

  it("i premi più ricchi escono meno di quelli poveri", () => {
    // La ruota mostra le percentuali accanto agli spicchi: se l'estrazione non
    // le rispettasse, la pagina direbbe una cosa e il server ne farebbe
    // un'altra — e la percentuale scritta è una promessa.
    const conteggio = new Map<string, number>();
    for (let i = 0; i < 20_000; i++) {
      const c = premioDi(`u${i}`, 20_300 + (i % 90)).chiave;
      conteggio.set(c, (conteggio.get(c) ?? 0) + 1);
    }
    expect(conteggio.get("m10")!).toBeGreaterThan(conteggio.get("m200")!);
    expect(conteggio.get("m25")!).toBeGreaterThan(conteggio.get("m100")!);
  });

  it("le frequenze osservate somigliano ai pesi dichiarati", () => {
    const giri = 20_000;
    const conteggio = new Map<string, number>();
    for (let i = 0; i < giri; i++) {
      const c = premioDi(`p${i}`, 20_400 + (i % 90)).chiave;
      conteggio.set(c, (conteggio.get(c) ?? 0) + 1);
    }
    for (const p of SPICCHI) {
      const attesa = p.peso / TOTALE_PESI;
      const vista = (conteggio.get(p.chiave) ?? 0) / giri;
      // Tolleranza larga: qui non si sta collaudando un generatore casuale, si
      // sta verificando che i pesi vengano *usati*. Uno spicchio scambiato o
      // saltato sballa di molto più di questo.
      expect(Math.abs(vista - attesa), p.chiave).toBeLessThan(0.05);
    }
  });
});

describe("nessuno se ne va a mani vuote", () => {
  it("ogni spicchio dà monete oppure un oggetto", () => {
    // «Non hai vinto niente» è la casella più comune nelle ruote, ed è un
    // errore: insegna che girare non vale la pena, e la volta dopo non si
    // gira.
    for (const p of SPICCHI) {
      expect(p.monete > 0 || Boolean(p.cosmetico), p.chiave).toBe(true);
    }
  });

  it("gli oggetti in palio esistono nel catalogo", () => {
    // Un id sbagliato darebbe un premio che non si può assegnare, e la
    // transazione fallirebbe **dopo** aver consumato il giro del giorno.
    for (const p of SPICCHI.filter((x) => x.cosmetico)) {
      expect(cosmeticoDi(p.cosmetico!), p.chiave).toBeDefined();
      expect(cosmeticoDelPremio(p), p.chiave).toBeDefined();
    }
  });

  it("le chiavi sono uniche: sono l'identità dello spicchio a registro", () => {
    const chiavi = SPICCHI.map((p) => p.chiave);
    expect(new Set(chiavi).size).toBe(chiavi.length);
  });

  it("ogni spicchio ha un'etichetta e una tinta", () => {
    for (const p of SPICCHI) {
      expect(p.etichetta.trim().length, p.chiave).toBeGreaterThan(0);
      expect(p.tinta, p.chiave).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("cosa apre la ruota", () => {
  it("ogni via ha un testo e una destinazione", () => {
    // L'elenco compare sulla ruota chiusa: una voce senza collegamento
    // manderebbe qualcuno a cercare da solo la pagina che gli serve.
    for (const v of COME_SI_APRE) {
      expect(v.testo.trim().length).toBeGreaterThan(0);
      expect(v.href).toMatch(/^\/dashboard\//);
    }
  });

  it("le vie sono più di una", () => {
    // Con una sola via, chi non può percorrerla — un artista senza
    // candidature da valutare — resterebbe chiuso fuori per sempre.
    expect(COME_SI_APRE.length).toBeGreaterThan(2);
  });
});
