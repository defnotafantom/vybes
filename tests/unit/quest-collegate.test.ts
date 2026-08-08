import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Ogni obiettivo che il codice fa avanzare deve esistere davvero.
 *
 * ── Il difetto che questa prova rende impossibile ──
 *
 * `progressQuest(userId, "chiave")` comincia così:
 *
 *     const quest = await prisma.quest.findUnique({ where: { key: questKey } });
 *     if (!quest) return;
 *
 * Un errore di battitura nella chiave — o una quest rinominata nel seed e non
 * altrove — non solleva niente. La funzione viene chiamata, non trova la riga,
 * **torna in silenzio**, e l'obiettivo di quella persona resta a zero per
 * sempre mentre lei fa esattamente quello che le era stato chiesto.
 *
 * È la forma di difetto numero uno di COLLOQUIO.md: *il sistema dice di sì e
 * non fa niente.* Su questo progetto si è già presentata più volte, ed è la
 * peggiore da scoprire, perché l'unico sintomo è una barra che non si muove.
 *
 * ── Perché legge i file invece di importarli ──
 *
 * Le chiavi vivono in due posti che non si conoscono: le stringhe letterali
 * sparse nelle rotte API, e l'elenco `QUESTS` dentro `prisma/seed.ts`. Il
 * secondo non è importabile da qui — apre una connessione a Prisma
 * all'import — e le prime non sono un elenco da nessuna parte.
 *
 * Leggere il testo dei file è brutto e funziona: è l'unico modo di confrontare
 * due cose che nel programma non si incontrano mai. Il giorno in cui dovesse
 * rompersi per un cambio di formattazione, si rompe **rumorosamente**, che è
 * l'opposto del difetto che sorveglia.
 */

/** Le chiavi definite nel seed: `key: "qualcosa"`. */
function chiaviDelSeed(): string[] {
  const testo = readFileSync("prisma/seed.ts", "utf8");
  const blocco = testo.slice(testo.indexOf("const QUESTS"), testo.indexOf("const DEMO_ARTISTS"));
  return [...blocco.matchAll(/key:\s*"([a-z_]+)"/g)].map((m) => m[1]);
}

/**
 * Le chiavi che il codice fa avanzare.
 *
 * Due funzioni, non una: `progressQuest` incrementa di un passo,
 * `sincronizzaQuest` scrive il valore che lo stato dice. Cercarne una sola
 * avrebbe segnalato come «mai fatta avanzare» ogni quest che dipende da un
 * conteggio — un falso allarme che avrebbe portato a disattivare la prova.
 */
function chiaviUsate(): string[] {
  // `grep` via ripgrep non è garantito ovunque; `git grep` sì, ed è già una
  // dipendenza del progetto.
  const fuori = execSync(
    `git grep -hoE '(progressQuest|sincronizzaQuest)\\([^)]*"[a-z_]+"' -- src`,
    { encoding: "utf8" }
  );
  return [...fuori.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

describe("le quest che il codice fa avanzare esistono nel seed", () => {
  it("nessuna chiave usata è sconosciuta al seed", () => {
    const definite = new Set(chiaviDelSeed());
    for (const chiave of chiaviUsate()) {
      expect(definite.has(chiave), `progressQuest("${chiave}") non trova nessuna quest`).toBe(true);
    }
  });

  it("il seed non definisce chiavi doppie", () => {
    // Due righe con la stessa chiave: l'`upsert` scrive la seconda sopra la
    // prima e la prima sparisce senza un errore.
    const chiavi = chiaviDelSeed();
    expect(new Set(chiavi).size).toBe(chiavi.length);
  });

  it("il seed contiene qualcosa: se la lettura si rompe, si accorge", () => {
    // Senza questa riga, un cambio di formattazione che facesse restituire un
    // elenco vuoto renderebbe le due prove qui sopra sempre verdi — cioè una
    // sorveglianza spenta che continua a dichiararsi accesa. È lo stesso
    // difetto che questo file esiste per prevenire, applicato a sé stesso.
    expect(chiaviDelSeed().length).toBeGreaterThan(5);
    expect(chiaviUsate().length).toBeGreaterThan(3);
  });

  it("ogni quest del seed è raggiungibile da qualche parte", () => {
    // Il verso opposto, ed è un difetto più mite ma reale: una quest che
    // nessun codice fa avanzare resta a 0/1 nell'elenco di tutti, per sempre.
    // Un obiettivo impossibile in mezzo a quelli veri insegna a ignorare
    // l'elenco intero.
    const usate = new Set(chiaviUsate());
    for (const chiave of chiaviDelSeed()) {
      expect(usate.has(chiave), `la quest "${chiave}" non la fa avanzare nessuno`).toBe(true);
    }
  });
});
