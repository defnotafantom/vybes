import { describe, it, expect } from "vitest";
import {
  calcolaReputazione,
  dettaglioReputazione,
  massimoDi,
  reputazioneMassima,
  vociMisurabili,
  MINIMO_CANDIDATURE,
  MINIMO_ANNUNCI,
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
 * cambieranno) ma le regole che rendono il punteggio difendibile: **ogni voce
 * ha un tetto**, quindi ripetere un'azione non porta da nessuna parte; **il
 * punteggio segue lo stato**, quindi scende quando lo stato peggiora; e — da
 * quando le formule sono due — **nessun ruolo viene misurato su fatti che il
 * suo ruolo non può produrre**, che è il difetto per cui la separazione è
 * nata.
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
  candidatureRicevute: 0,
  candidatureRisposte: 0,
  annunciPubblicati: 0,
  annunciRetribuiti: 0,
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
  ingaggiOrganizzati: 4,
  candidatureRicevute: 20,
  candidatureRisposte: 20,
  annunciPubblicati: 10,
  annunciRetribuiti: 10,
};

/** Un organizzatore con abbastanza storia perché ogni voce sia misurabile. */
const organizzatoreAvviato: FattiReputazione = {
  ...vuoto,
  candidatureRicevute: 10,
  candidatureRisposte: 10,
  annunciPubblicati: 4,
  annunciRetribuiti: 4,
};

const RUOLI = ["ARTIST", "RECRUITER"] as const;

describe("calcolaReputazione", () => {
  it.each(RUOLI)("un profilo appena creato parte da zero (%s)", (ruolo) => {
    expect(calcolaReputazione(vuoto, ruolo)).toBe(0);
  });

  it.each(RUOLI)("un profilo completo arriva al massimo dichiarato (%s)", (ruolo) => {
    expect(calcolaReputazione(pieno, ruolo)).toBe(reputazioneMassima(ruolo));
  });

  it.each(RUOLI)("resta dentro l'intervallo anche con numeri assurdi (%s)", (ruolo) => {
    // È il caso che conta davvero: senza tetti, chi carica duecento file
    // scavalca chiunque. Il valore non deve muoversi di un punto.
    const esagerato = {
      ...pieno,
      portfolio: 200,
      ingaggiConfermati: 999,
      ingaggiOrganizzati: 999,
      candidatureRicevute: 9999,
      candidatureRisposte: 9999,
      annunciPubblicati: 9999,
      annunciRetribuiti: 9999,
    };
    expect(calcolaReputazione(esagerato, ruolo)).toBe(reputazioneMassima(ruolo));
  });

  it("i due ruoli hanno lo stesso massimo, e vale cento", () => {
    // Non è estetica. Se i massimi divergessero, «ottanta» significherebbe due
    // cose diverse ai due lati del sito, e la percentuale mostrata in scheda
    // sarebbe calcolata su denominatori incomparabili — il modo più facile di
    // mentire con una barra di progresso.
    expect(reputazioneMassima("ARTIST")).toBe(100);
    expect(reputazioneMassima("RECRUITER")).toBe(100);
  });

  it("un ruolo sconosciuto ricade sull'artista invece di valere zero", () => {
    // Una stringa inattesa in colonna — un vecchio valore, un import sbagliato
    // — non deve azzerare la reputazione di chi la porta: sparirebbe in fondo
    // alla directory senza che nessuno capisca perché.
    expect(calcolaReputazione(pieno, "QUALCOSALTRO")).toBe(reputazioneMassima("ARTIST"));
  });
});

describe("nessun ruolo è misurato su fatti che non può produrre", () => {
  // È il difetto per cui questa separazione esiste: la formula unica dava
  // all'organizzatore tre voci irraggiungibili — portfolio, discipline,
  // ingaggi confermati — cioè quarantacinque punti su centodieci fuori
  // portata per costruzione, e un tetto al 59% per sempre.

  it("un organizzatore che fa il suo lavoro può arrivare al massimo", () => {
    const bravo: FattiReputazione = {
      ...organizzatoreAvviato,
      emailVerified: new Date(),
      isVerified: true,
      bio: "x".repeat(400),
      headline: "Circolo Arci",
      image: "https://esempio/logo.jpg",
      citySlug: "milano",
      ingaggiOrganizzati: 4,
      // Nessun portfolio, nessuna disciplina, nessun ingaggio ricevuto:
      // esattamente ciò che un locale non avrà mai.
      portfolio: 0,
      disciplines: "",
      ingaggiConfermati: 0,
    };
    expect(calcolaReputazione(bravo, "RECRUITER")).toBe(100);
  });

  it("il portfolio non entra nel punteggio di un organizzatore", () => {
    const con = calcolaReputazione({ ...organizzatoreAvviato, portfolio: 5 }, "RECRUITER");
    const senza = calcolaReputazione(organizzatoreAvviato, "RECRUITER");
    expect(con).toBe(senza);
  });

  it("rispondere alle candidature non entra nel punteggio di un artista", () => {
    const con = calcolaReputazione(
      { ...vuoto, candidatureRicevute: 10, candidatureRisposte: 10 },
      "ARTIST"
    );
    expect(con).toBe(calcolaReputazione(vuoto, "ARTIST"));
  });
});

describe("ciò che non si è ancora potuto misurare non si conta come fallimento", () => {
  // Zero significa «non l'hai fatto». Non misurabile significa «non c'è
  // ancora abbastanza per dirlo». Confonderli vuol dire accusare qualcuno di
  // un fatto mai avvenuto, e suggerirgli un rimedio che non può applicare.

  it("un organizzatore nuovo non viene giudicato su come risponde", () => {
    const voci = dettaglioReputazione(vuoto, "RECRUITER");
    const risposte = voci.find((v) => v.label === "Rispondi a chi si candida");
    expect(risposte?.misurabile).toBe(false);
  });

  it("il massimo esclude le voci non ancora misurabili", () => {
    const voci = dettaglioReputazione(vuoto, "RECRUITER");
    expect(massimoDi(voci)).toBeLessThan(100);
    expect(massimoDi(voci)).toBe(
      voci.filter((v) => v.misurabile !== false).reduce((s, v) => s + v.max, 0)
    );
  });

  it("la voce diventa misurabile esattamente alla soglia dichiarata", () => {
    const sotto = { ...vuoto, candidatureRicevute: MINIMO_CANDIDATURE - 1 };
    const soglia = { ...vuoto, candidatureRicevute: MINIMO_CANDIDATURE };
    const cerca = (f: FattiReputazione) =>
      dettaglioReputazione(f, "RECRUITER").find((v) => v.label === "Rispondi a chi si candida");

    expect(cerca(sotto)?.misurabile).toBe(false);
    expect(cerca(soglia)?.misurabile).toBe(true);
  });

  it("gli annunci retribuiti si misurano dal secondo", () => {
    const cerca = (n: number) =>
      dettaglioReputazione({ ...vuoto, annunciPubblicati: n }, "RECRUITER").find(
        (v) => v.label === "Annunci con compenso"
      );
    expect(cerca(MINIMO_ANNUNCI - 1)?.misurabile).toBe(false);
    expect(cerca(MINIMO_ANNUNCI)?.misurabile).toBe(true);
  });

  it("una voce non misurabile non abbassa il punteggio", () => {
    // ── Perché questa prova è stata riscritta ──
    //
    // La prima versione metteva `ingaggiOrganizzati: 0` e pretendeva comunque
    // il punteggio pieno. Falliva, e aveva torto lei: zero ingaggi conclusi è
    // un fatto **misurabile** — vuol dire «non ne hai ancora portato a termine
    // nessuno», che è vero e ha un rimedio. Non è come «rispondi a chi si
    // candida», dove il fatto non è mai avvenuto e nessun rimedio esiste
    // finché non arriva qualcuno.
    //
    // Confondere le due cose qui avrebbe portato, prima o poi, a renderle
    // uguali anche nel codice — e a quel punto un organizzatore che non
    // conclude mai niente resterebbe al cento per cento per sempre.
    const completo: FattiReputazione = {
      ...vuoto,
      emailVerified: new Date(),
      isVerified: true,
      bio: "x".repeat(400),
      headline: "Enoteca",
      image: "https://esempio/logo.jpg",
      citySlug: "bologna",
      // Tutto ciò che si può misurare, al massimo.
      ingaggiOrganizzati: 4,
      // Ciò che ancora non si può: nessuna candidatura ricevuta, nessun
      // annuncio pubblicato.
    };
    const voci = dettaglioReputazione(completo, "RECRUITER");

    expect(calcolaReputazione(completo, "RECRUITER")).toBe(massimoDi(voci));
    // E il massimo è più basso di cento, perché due voci non si sono ancora
    // potute misurare: la frazione è onesta su entrambi i lati.
    expect(massimoDi(voci)).toBeLessThan(100);
  });

  it("zero misurabile e zero non misurabile pesano in modo diverso", () => {
    // La distinzione, resa esplicita perché è tutta la ragione del campo
    // `misurabile` e l'unico posto in cui si può cancellare per sbaglio.
    const base: FattiReputazione = {
      ...vuoto,
      emailVerified: new Date(),
      isVerified: true,
    };

    // Non ha concluso ingaggi: la voce c'è, vale zero, e il massimo la conta.
    const senzaIngaggi = dettaglioReputazione(base, "RECRUITER");
    const ingaggi = senzaIngaggi.find((v) => v.label === "Ingaggi portati a termine")!;
    expect(ingaggi.misurabile).not.toBe(false);
    expect(ingaggi.punti).toBe(0);

    // Non ha ricevuto candidature: la voce esce da entrambi i lati.
    const risposte = senzaIngaggi.find((v) => v.label === "Rispondi a chi si candida")!;
    expect(risposte.misurabile).toBe(false);

    // Ricevendone tre, il massimo sale esattamente del tetto di quella voce:
    // nessun altro numero si muove per effetto collaterale.
    const conCandidature = dettaglioReputazione(
      { ...base, candidatureRicevute: MINIMO_CANDIDATURE },
      "RECRUITER"
    );
    expect(massimoDi(conCandidature) - massimoDi(senzaIngaggi)).toBe(risposte.max);
  });
});

describe("rispondere a chi si candida", () => {
  const con = (ricevute: number, risposte: number) =>
    calcolaReputazione({ ...vuoto, candidatureRicevute: ricevute, candidatureRisposte: risposte }, "RECRUITER");

  it("chi risponde a tutti prende più di chi risponde a metà", () => {
    expect(con(10, 10)).toBeGreaterThan(con(10, 5));
  });

  it("sotto la metà non vale niente, non vale poco", () => {
    // È il comportamento che il punteggio esiste per scoraggiare: mezzo
    // credito lo renderebbe un costo accettabile.
    expect(con(10, 4)).toBe(0);
  });

  it("è la voce che pesa di più fra tutte quelle dell'organizzatore", () => {
    const voci = dettaglioReputazione(pieno, "RECRUITER");
    const risposte = voci.find((v) => v.label === "Rispondi a chi si candida")!;
    for (const v of voci) {
      if (v.label !== risposte.label) expect(v.max, v.label).toBeLessThan(risposte.max);
    }
  });

  it("un no vale quanto un sì", () => {
    // Si misura **se** rispondi, non cosa rispondi: premiare le accettazioni
    // spingerebbe ad accettare per punteggio, e l'artista scelto così se ne
    // accorge la sera del concerto.
    //
    // Il fatto è già garantito dalla forma dei dati — `candidatureRisposte`
    // non distingue l'esito — e questa prova esiste per fissarlo: chi un
    // giorno volesse premiare i sì dovrebbe cancellarla di proposito.
    const voci = dettaglioReputazione(pieno, "RECRUITER");
    expect(voci.map((v) => v.label)).not.toContain("Candidature accettate");
  });
});

describe("nessuna voce si può sfruttare ripetendo la stessa azione", () => {
  it("il portfolio smette di pagare dopo il quinto lavoro", () => {
    expect(calcolaReputazione({ ...vuoto, portfolio: 5 }, "ARTIST")).toBe(
      calcolaReputazione({ ...vuoto, portfolio: 50 }, "ARTIST")
    );
  });

  it("le discipline smettono di pagare dopo la seconda", () => {
    // Dichiararne dieci non rende nessuno più affidabile: rende il profilo
    // meno leggibile. Senza tetto sarebbe il trucco più ovvio del sito.
    expect(calcolaReputazione({ ...vuoto, disciplines: "a,b" }, "ARTIST")).toBe(
      calcolaReputazione({ ...vuoto, disciplines: "a,b,c,d,e,f,g,h" }, "ARTIST")
    );
  });

  it.each(RUOLI)("ogni voce non supera mai il proprio tetto (%s)", (ruolo) => {
    for (const v of dettaglioReputazione(pieno, ruolo)) {
      expect(v.punti, v.label).toBeLessThanOrEqual(v.max);
      expect(v.punti, v.label).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("il punteggio segue lo stato, anche verso il basso", () => {
  it("svuotare il portfolio fa scendere il punteggio", () => {
    expect(calcolaReputazione({ ...pieno, portfolio: 0 }, "ARTIST")).toBeLessThan(
      calcolaReputazione(pieno, "ARTIST")
    );
  });

  it("smettere di rispondere fa scendere il punteggio", () => {
    expect(calcolaReputazione({ ...pieno, candidatureRisposte: 0 }, "RECRUITER")).toBeLessThan(
      calcolaReputazione(pieno, "RECRUITER")
    );
  });

  it.each(RUOLI)("cancellare la biografia fa scendere il punteggio (%s)", (ruolo) => {
    expect(calcolaReputazione({ ...pieno, bio: null }, ruolo)).toBeLessThan(
      calcolaReputazione(pieno, ruolo)
    );
  });

  it("una bio sotto la soglia minima non vale niente", () => {
    // Sotto i 120 caratteri il profilo non è nemmeno indicizzabile: pagarla
    // significherebbe premiare una riga scritta per far salire un numero.
    expect(calcolaReputazione({ ...vuoto, bio: "Suono la chitarra." }, "ARTIST")).toBe(0);
  });

  it("la biografia cresce a scaglioni, non linearmente", () => {
    const s = (n: number) => calcolaReputazione({ ...vuoto, bio: "x".repeat(n) }, "ARTIST");
    expect(s(119)).toBe(0);
    expect(s(120)).toBe(5);
    expect(s(200)).toBe(10);
    expect(s(400)).toBe(15);
    // Oltre il tetto non cambia più niente: fra ottocento e mille caratteri
    // non c'è nessuna differenza per chi legge.
    expect(s(4000)).toBe(s(400));
  });

  it("gli scaglioni restano distinti anche sul tetto più basso", () => {
    // Il tetto della biografia per l'organizzatore è dieci invece di quindici.
    // Troncando invece di riscalare, duecento e quattrocento caratteri
    // avrebbero dato lo stesso punteggio e la soglia più alta sarebbe sparita
    // senza che nessuno lo sapesse.
    const s = (n: number) => calcolaReputazione({ ...vuoto, bio: "x".repeat(n) }, "RECRUITER");
    expect(s(119)).toBe(0);
    expect(s(200)).toBeGreaterThan(s(120));
    expect(s(400)).toBeGreaterThan(s(200));
    expect(s(400)).toBe(10);
  });

  it.each(RUOLI)("gli spazi non contano come biografia (%s)", (ruolo) => {
    expect(calcolaReputazione({ ...vuoto, bio: " ".repeat(500) }, ruolo)).toBe(0);
  });
});

describe("il peso relativo delle voci", () => {
  it("un ingaggio confermato vale più di un lavoro nel portfolio", () => {
    // È l'unica voce che non dipende da chi la riceve: la assegna qualcun
    // altro scegliendo quella persona. Se un giorno pesasse meno del
    // portfolio, il punteggio tornerebbe a misurare l'attività.
    expect(calcolaReputazione({ ...vuoto, ingaggiConfermati: 1 }, "ARTIST")).toBeGreaterThan(
      calcolaReputazione({ ...vuoto, portfolio: 1 }, "ARTIST")
    );
  });

  it("nessuna voce dell'artista vale più di un quinto del totale", () => {
    // Un profilo non deve poter arrivare in cima grazie a una cosa sola.
    for (const v of dettaglioReputazione(pieno, "ARTIST")) {
      expect(v.max, v.label).toBeLessThanOrEqual(100 / 5);
    }
  });

  it("nessuna voce dell'organizzatore supera un quarto del totale", () => {
    // Il limite è più largo di quello dell'artista, e di proposito: «rispondi
    // a chi si candida» sta esattamente sul tetto.
    //
    // La ragione è che l'asimmetria è reale. Per un artista non esiste una
    // cosa sola che dica «è affidabile»; per un organizzatore sì, ed è questa:
    // è l'unico comportamento che, mancando, danneggia qualcun altro in
    // silenzio. Un quarto è il massimo che si può dare a una voce sola senza
    // che il resto del punteggio diventi decorazione — questa prova è ciò che
    // impedisce di spingersi oltre la prossima volta.
    for (const v of dettaglioReputazione(pieno, "RECRUITER")) {
      expect(v.max, v.label).toBeLessThanOrEqual(100 / 4);
    }
  });
});

describe("ogni voce si sa spiegare", () => {
  it.each(RUOLI)("ha un'etichetta e un'istruzione non vuote (%s)", (ruolo) => {
    // Un punteggio che decide la visibilità e non dice come si ottiene è
    // indistinguibile dall'arbitrio: la stringa `come` è parte del contratto,
    // non decorazione.
    for (const v of dettaglioReputazione(vuoto, ruolo)) {
      expect(v.label.trim().length).toBeGreaterThan(0);
      expect(v.come.trim().length, v.label).toBeGreaterThan(0);
    }
  });

  it.each(RUOLI)("le etichette sono uniche: sono chiavi in elenco (%s)", (ruolo) => {
    const etichette = dettaglioReputazione(vuoto, ruolo).map((v) => v.label);
    expect(new Set(etichette).size).toBe(etichette.length);
  });

  it.each(RUOLI)("il totale è la somma delle voci contate (%s)", (ruolo) => {
    // Se il totale e il dettaglio divergessero, la scheda direbbe una cosa e
    // la directory ne farebbe un'altra. «Contate» e non «mostrate»: le voci
    // non misurabili si vedono in scheda ma stanno fuori da entrambi i lati
    // della frazione.
    const somma = vociMisurabili(dettaglioReputazione(pieno, ruolo)).reduce(
      (s, v) => s + v.punti,
      0
    );
    expect(calcolaReputazione(pieno, ruolo)).toBe(somma);
  });
});
