import { describe, it, expect } from "vitest";
import { completaProfiloSchema } from "@/lib/validations";

/**
 * Le regole del nickname.
 *
 * Non si controlla che zod funzioni: si controlla che **queste** regole siano
 * quelle scritte. Il nickname finisce in `/artisti/[slug]`, quindi ogni forma
 * ammessa qui è un indirizzo pubblico che qualcuno condividerà — e un
 * indirizzo sbagliato non si può correggere dopo senza rompere i collegamenti
 * già in giro.
 */

const base = { name: "Elisa Torrisi", ruolo: "ARTIST" };
const prova = (slug: string) => completaProfiloSchema.safeParse({ ...base, slug });

describe("il nickname", () => {
  it("accetta lettere, numeri e trattini singoli", () => {
    for (const s of ["elisa", "elisa-torrisi", "dj-2000", "trio-grisaglia-milano"]) {
      expect(prova(s).success, s).toBe(true);
    }
  });

  it("rifiuta le forme che `toSlug` non produce mai", () => {
    /*
     * Sono le forme che romperebbero l'invariante peggiore del sistema: che
     * l'indirizzo salvato sia sempre ricostruibile dal nome. Un trattino in
     * testa o doppio passa i controlli di un browser e non passa `toSlug`,
     * quindi esisterebbe una riga che nessuna funzione del progetto sa
     * riprodurre.
     */
    for (const s of ["-elisa", "elisa-", "elisa--torrisi", "-"]) {
      expect(prova(s).success, s).toBe(false);
    }
  });

  it("rifiuta tutto ciò che verrebbe codificato nell'indirizzo", () => {
    // Spazi, accenti, maiuscole e simboli: un URL con `%C3%A9` dentro non è
    // condivisibile a voce, ed è la cosa che un artista fa più spesso.
    for (const s of ["Elisa Torrisi", "elisà", "elisa_torrisi", "elisa.t", "elisa/t"]) {
      expect(prova(s).success, s).toBe(false);
    }
  });

  it("rifiuta i nickname troppo corti", () => {
    // Sotto i tre caratteri un indirizzo pubblico non distingue nessuno, e
    // prosciuga lo spazio dei nomi corti per tutti gli altri.
    expect(prova("ab").success).toBe(false);
    expect(prova("abc").success).toBe(true);
  });

  it("normalizza le maiuscole invece di respingerle", () => {
    // `toLowerCase` prima del controllo: chi scrive «Elisa» ha scritto un
    // nickname valido, non uno sbagliato. Rifiutarlo sarebbe pignoleria
    // travestita da rigore.
    const r = completaProfiloSchema.safeParse({ ...base, slug: "ELISA" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.slug).toBe("elisa");
  });
});

describe("gli altri due campi", () => {
  it("il nome non può essere vuoto né di una lettera", () => {
    expect(completaProfiloSchema.safeParse({ ...base, name: "", slug: "elisa" }).success).toBe(
      false
    );
    expect(completaProfiloSchema.safeParse({ ...base, name: "E", slug: "elisa" }).success).toBe(
      false
    );
  });

  it("il ruolo deve essere uno di quelli che esistono", () => {
    // `RUOLI` e non tre stringhe scritte a mano: aggiungerne uno domani non
    // deve richiedere di ricordarsi di questo controllo.
    expect(
      completaProfiloSchema.safeParse({ ...base, slug: "elisa", ruolo: "ENTRAMBI" }).success
    ).toBe(true);
    expect(
      completaProfiloSchema.safeParse({ ...base, slug: "elisa", ruolo: "ADMIN" }).success
    ).toBe(false);
  });
});
