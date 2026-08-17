import { describe, it, expect } from "vitest";
import { DISCIPLINES } from "@/lib/constants";
import { SCHEDE, arteDa, artiConScheda } from "@/lib/arti";

/**
 * L'atlante.
 *
 * Il controllo che conta è uno solo, e riguarda una chiave scritta a mano: le
 * schede sono indicizzate per slug di disciplina, e un refuso — `ballerine`
 * invece di `ballerini` — produrrebbe una scheda scritta con cura che non
 * compare da nessuna parte. Nessun errore, nessuna pagina rotta: solo un testo
 * invisibile, e la pagina che continua a dire «scheda da scrivere» mentre la
 * scheda esiste.
 */
describe("le schede", () => {
  it("hanno tutte una disciplina che esiste", () => {
    // `as string` perché `DISCIPLINES` è `as const`: l'insieme sarebbe
    // tipizzato sull'unione dei dieci slug, e chiedergli una chiave
    // qualunque non compilerebbe. Qui il controllo è proprio quello — una
    // chiave che *non* è nell'unione.
    const slugValidi = new Set<string>(DISCIPLINES.map((d) => d.slug as string));
    for (const chiave of Object.keys(SCHEDE)) {
      expect(slugValidi.has(chiave), `«${chiave}» non è una disciplina`).toBe(true);
    }
  });

  it("quelle scritte sono complete", () => {
    // Una scheda a metà è peggio di una assente: la pagina dichiarerebbe di
    // avere il testo e mostrerebbe sezioni vuote.
    for (const slug of artiConScheda()) {
      const s = SCHEDE[slug]!;
      expect(s.siCrede.length, slug).toBeGreaterThan(20);
      expect(s.invece.length, slug).toBeGreaterThan(40);
      expect(s.forme.length, slug).toBeGreaterThanOrEqual(3);
      expect(s.doveVederla.length, slug).toBeGreaterThan(20);
    }
  });

  it("ogni scheda dichiara il proprio stato", () => {
    // Lo stato non è un'etichetta editoriale: decide se la pagina mostra
    // l'avviso di bozza. Una scheda senza stato mostrerebbe un testo abbozzato
    // presentandolo come definitivo, che è esattamente la cosa che l'avviso
    // esiste per impedire.
    for (const slug of artiConScheda()) {
      expect(["bozza", "rivista"], slug).toContain(SCHEDE[slug]!.stato);
    }
  });

  it("elencare più forme è il punto: sotto tre non smonta niente", () => {
    // Uno stereotipo vive perché la parola richiama **una** immagine. Due
    // forme non la moltiplicano abbastanza da spostare l'idea.
    for (const slug of artiConScheda()) {
      expect(SCHEDE[slug]!.forme.length, slug).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("arteDa", () => {
  it("riconosce ogni disciplina, con o senza scheda", () => {
    for (const d of DISCIPLINES) {
      expect(arteDa(d.slug)?.disciplina.slug).toBe(d.slug);
    }
  });

  it("non inventa arti che non esistono", () => {
    expect(arteDa("giocolieri")).toBeNull();
    expect(arteDa("")).toBeNull();
  });
});
