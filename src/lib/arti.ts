import { DISCIPLINES } from "@/lib/constants";

/**
 * L'atlante: ogni arte come contenuto, non come filtro.
 *
 * ── Il cambio di stato ──
 *
 * Finora una disciplina era una riga di `DISCIPLINES`: uno slug, un'etichetta,
 * un plurale. Serviva a filtrare un elenco di persone — cioè presupponeva che
 * tu sapessi già cosa stavi cercando.
 *
 * Qui diventa una cosa di cui si può parlare: cosa la gente crede che sia,
 * cos'è davvero, in quante forme esiste, e chi la fa adesso vicino a te.
 * È la **destinazione** dell'incontro (POSIZIONE.md): l'incontro ti mette
 * davanti un'opera che non avresti cercato, questa pagina è dove approfondisci
 * se quell'opera ti ha toccato.
 *
 * ── Perché un file e non una tabella ──
 *
 * Perché non è dato d'uso: è redazione. Cambia quando qualcuno la scrive, non
 * quando qualcuno usa il sito, e va rivista come si rivede un testo — con un
 * diff, davanti a qualcuno. Metterla in una tabella significherebbe modificarla
 * da un pannello, cioè senza che nessuno se ne accorga.
 *
 * Il giorno in cui a scriverle saranno in dieci, questo file diventa
 * l'interfaccia da riempire e non il posto dove scrivere. Non prima.
 *
 * ── Perché tutte sono marcate «bozza» ──
 *
 * Perché lo sono. Le ho scritte io per avere il modello completo su cui
 * ragionare, e la voce di questo progetto non è la mia.
 *
 * Il contrassegno non è modestia: è la difesa contro il modo in cui questi
 * testi muoiono. Un abbozzo che non dichiara di esserlo diventa definitivo per
 * inerzia — nessuno lo riscrive perché nessuno si accorge che andrebbe
 * riscritto. Dichiarandolo, la pagina lo dice al lettore e l'elenco lo dice a
 * chi ci lavora, e la revisione resta un lavoro aperto invece di un buon
 * proposito.
 *
 * Il passaggio a `rivista` è una parola sola da cambiare, ed è deliberato che
 * costi così poco: una revisione che richiede lavoro tecnico non si fa.
 *
 * ── Cosa NON contengono, di proposito ──
 *
 * Date, luoghi d'origine, nomi di maestri, cifre. Non perché non contino — sono
 * anzi il cuore della divulgazione — ma perché un fatto storico sbagliato su
 * una pagina che si presenta come divulgativa è peggio del silenzio: chi legge
 * non ha modo di accorgersene, e il danno è esattamente all'arte che si voleva
 * difendere.
 *
 * Quello che c'è qui è di un altro tipo: **osservazioni** su come una cosa
 * viene percepita e in quante forme si presenta. Sono verificabili da chiunque
 * la pratichi, ed è il livello a cui un abbozzo può stare senza mentire. La
 * storia arriva quando la scrive qualcuno che la sa.
 */

export type SchedaArte = {
  /**
   * `bozza` finché non l'ha riletta qualcuno che quell'arte la pratica.
   *
   * Non è una sfumatura editoriale: cambia cosa la pagina dichiara di essere, e
   * quindi cosa il lettore può pretenderne.
   */
  stato: "bozza" | "rivista";
  /** Il pregiudizio più diffuso, detto per intero e senza addolcirlo. */
  siCrede: string;
  /** La correzione. Due o tre frasi: non è un saggio, è una porta. */
  invece: string;
  /**
   * Le forme in cui l'arte esiste davvero.
   *
   * È la parte che fa più lavoro contro lo stereotipo: un pregiudizio vive
   * perché la parola richiama **una** immagine, e l'elenco la moltiplica.
   */
  forme: { nome: string; nota: string }[];
  /** Dove la si incontra dal vivo, per chi volesse andarci invece che leggerne. */
  doveVederla: string;
};

/**
 * Le schede, per slug di disciplina.
 *
 * La chiave è lo stesso slug di `DISCIPLINES`: un'arte senza riga qui esiste
 * lo stesso, e la pagina si adatta. Il controllo che le chiavi siano slug veri
 * sta in `tests/unit/arti.test.ts` — un refuso qui creerebbe una scheda che
 * non compare da nessuna parte, senza nessun errore.
 */
export const SCHEDE: Partial<Record<string, SchedaArte>> = {
  ballerini: {
    stato: "bozza",
    siCrede:
      "Che sia una cosa da bambine, che finisca con l'adolescenza, e che chi continua lo faccia per hobby perché «non è un lavoro».",
    invece:
      "È un mestiere del corpo, con un allenamento quotidiano paragonabile a quello di uno sport professionistico e una carriera che in Italia quasi nessuno riesce a documentare. Non perché sia rara: perché la maggior parte degli ingaggi è breve, pagata a mano e non lascia traccia da nessuna parte.",
    forme: [
      {
        nome: "Contemporanea",
        nota: "Linguaggio aperto, spesso costruito sullo spazio in cui va in scena invece che su un palco.",
      },
      {
        nome: "Urbana",
        nota: "Hip hop, house, breaking: nate nei cortili e nelle strade, con una tecnica codificata quanto quella accademica.",
      },
      {
        nome: "Popolare e tradizionale",
        nota: "Pizzica, tarantella, balli di coppia: si imparano per imitazione, non a scuola, e ogni valle ha la sua versione.",
      },
      {
        nome: "Accademica",
        nota: "Classico e neoclassico, il ramo che tutti hanno in mente quando sentono la parola.",
      },
      {
        nome: "Danza inclusiva",
        nota: "Con corpi che la danza accademica non ha mai considerato: in carrozzina, sordi, over sessanta.",
      },
    ],
    doveVederla:
      "Molto meno nei teatri di quanto si pensi: rassegne di quartiere, festival estivi, cortili, palestre, capannoni recuperati. È quasi sempre gratis o quasi, e quasi mai pubblicizzato dove lo cercheresti.",
  },

  cantanti: {
    stato: "bozza",
    siCrede:
      "Che basti avere una bella voce, e che il resto — respiro, resistenza, intonazione sotto stress — venga da sé.",
    invece:
      "La voce è lo strumento, non il mestiere. Il mestiere è tenerla per tre ore con un impianto che ti torna addosso, sapere cosa fare quando il monitor non funziona, e non consumarla in vent'anni. È l'unica arte in cui lo strumento invecchia insieme a chi lo suona.",
    forme: [
      { nome: "Lirica", nota: "Nessuna amplificazione: il volume viene dal corpo e dalla sala." },
      {
        nome: "Cantautorato",
        nota: "Chi scrive quello che canta, e per cui la voce è il modo di dirlo e non il fine.",
      },
      {
        nome: "Coro",
        nota: "Il contrario del solista: bravura è sparire dentro un suono che nessuno fa da solo.",
      },
      {
        nome: "Tradizione orale",
        nota: "Canti di lavoro, sacri, a più voci: si imparano ascoltando, non su uno spartito.",
      },
      {
        nome: "Voce su commissione",
        nota: "Doppiaggio, jingle, cori di sala d'incisione: si viene pagati per non farsi riconoscere.",
      },
    ],
    doveVederla:
      "Chiese e sale parrocchiali per la lirica e i cori, circoli e librerie per il cantautorato, feste di paese per la tradizione. I posti in cui si canta di più sono quelli con meno cartelloni.",
  },

  musicisti: {
    stato: "bozza",
    siCrede:
      "Che se non ci campi allora è un hobby — e che «suoni ancora?» sia una domanda gentile.",
    invece:
      "La maggior parte dei musicisti che senti dal vivo ha un altro lavoro, e questo non rende il concerto un passatempo: rende il paese un posto in cui una competenza vera non trova un contratto. Il tempo speso a studiare non cambia in base a come ci si mantiene.",
    forme: [
      {
        nome: "Da sala",
        nota: "Chi suona nei locali: repertorio ampio, volume calibrato sul parlato, si accompagna una serata invece di dominarla.",
      },
      {
        nome: "Orchestrale",
        nota: "Il lavoro più codificato e meno visibile: si prova per settimane per due ore in cui nessuno ti guarda in faccia.",
      },
      {
        nome: "Session",
        nota: "Chi entra in studio, suona la parte di qualcun altro e se ne va. Il nome spesso non compare.",
      },
      {
        nome: "Popolare",
        nota: "Bande, organetti, gruppi di paese: la musica che accompagna feste e riti, e che non passa dai conservatori.",
      },
      {
        nome: "Didattica",
        nota: "Insegnare è un mestiere musicale a tutti gli effetti, e per moltissimi è quello che tiene in piedi il resto.",
      },
    ],
    doveVederla:
      "Locali piccoli infrasettimanali, bande in piazza d'estate, saggi di scuole di musica. Le tre situazioni in cui si sente più musica dal vivo, e nessuna delle tre viene chiamata «concerto».",
  },

  dj: {
    stato: "bozza",
    siCrede: "Che schiacci play e alzi le mani, e che la musica la scelga il pubblico.",
    invece:
      "Il mestiere è leggere una stanza in tempo reale e costruire un arco lungo ore con materiale che il pubblico non conosce ancora. La parte tecnica si impara in un mese; quella che distingue è sapere cosa mettere alle due e mezza quando la sala si sta svuotando.",
    forme: [
      {
        nome: "Selector",
        nota: "Chi vale per cosa mette e non per come lo mette: la ricerca è il lavoro, il mix è la conseguenza.",
      },
      {
        nome: "Club",
        nota: "Set lunghi, tecnica di transizione, e la responsabilità di un pubblico che è lì per stare fino alla fine.",
      },
      {
        nome: "Radio",
        nota: "Senza pista da leggere: si costruisce per un ascoltatore solo, che può spegnere in qualsiasi momento.",
      },
      {
        nome: "Eventi privati",
        nota: "Matrimoni e feste: la parte del mestiere che paga e che nessuno mette nella propria biografia.",
      },
      {
        nome: "Produzione",
        nota: "Molti dj fanno anche i dischi, e per molti il set è il modo di provarli prima di pubblicarli.",
      },
    ],
    doveVederla:
      "Non solo di notte: aperitivi, mercati, radio online, negozi di dischi con la consolle in fondo. Ed è lì che si sentono i set più liberi, perché nessuno deve far ballare nessuno.",
  },

  band: {
    stato: "bozza",
    siCrede: "Che una band che fa cover non stia facendo musica sua.",
    invece:
      "Suonare in gruppo è un mestiere a sé: accordarsi in cinque su un tempo, dividersi lo spazio sonoro, litigare e tornare la settimana dopo. Il repertorio è una scelta di contesto, non di valore — e le band che si mantengono con le cover sono spesso quelle che poi riescono a incidere qualcosa di proprio.",
    forme: [
      {
        nome: "Repertorio proprio",
        nota: "Scrivono e suonano il loro. In Italia è la forma con meno date disponibili.",
      },
      {
        nome: "Tributo",
        nota: "Un repertorio solo, studiato fino al dettaglio: è filologia, non pigrizia.",
      },
      {
        nome: "Da cerimonia",
        nota: "Matrimoni e feste: cinque ore, tre generi, e la capacità di leggere una sala che cambia.",
      },
      {
        nome: "Ensemble",
        nota: "Formazioni da camera, ottoni, quartetti: gruppi stabili che suonano scritto e non a orecchio.",
      },
      {
        nome: "Di quartiere",
        nota: "Nate in una sala prove e mai uscite dal proprio raggio: sono quasi tutte, ed è dove si impara.",
      },
    ],
    doveVederla:
      "Circoli, sagre, sale prove con la porta aperta, contest per emergenti. La prima volta che una band suona davanti a qualcuno succede quasi sempre gratis.",
  },

  attori: {
    stato: "bozza",
    siCrede: "Che recitare voglia dire fingere, e che il talento sia sapersi calare in una parte.",
    invece:
      "È un lavoro di precisione ripetibile: la stessa scena, alla stessa intensità, ogni sera, per pubblici diversi. Il contrario dell'improvvisazione ispirata — e la parte più difficile non è emozionarsi, è riuscire a rifarlo domani.",
    forme: [
      { nome: "Prosa", nota: "Il teatro di repertorio, con stagioni, repliche e tournée." },
      {
        nome: "Teatro ragazzi",
        nota: "Il pubblico più severo che esista: se non funziona lo si scopre entro trenta secondi.",
      },
      {
        nome: "Teatro civile e sociale",
        nota: "In scuole, carceri, ospedali. Spesso l'unico teatro che certe persone vedranno.",
      },
      {
        nome: "Doppiaggio",
        nota: "Recitare con la sola voce, e dentro il tempo esatto di qualcun altro.",
      },
      {
        nome: "Improvvisazione",
        nota: "Costruire una scena senza testo, con regole precise: il gioco più tecnico dei cinque.",
      },
    ],
    doveVederla:
      "Teatri piccoli e off, rassegne comunali, spettacoli nelle scuole. Il biglietto medio costa meno di un cinema, e quasi nessuno lo sa.",
  },

  fotografi: {
    stato: "bozza",
    siCrede: "Che sia la macchina a fare la foto, e che con quella ci riuscirebbe chiunque.",
    invece:
      "Il lavoro non è lo scatto: è essere nel punto giusto, avere il permesso di stare lì, e riconoscere in un decimo di secondo quale dei mille momenti è quello. Le attrezzature si affittano; sapere dove mettersi no.",
    forme: [
      {
        nome: "Reportage",
        nota: "Raccontare un fatto restandone fuori. Si misura in giorni passati sul posto, non in scatti.",
      },
      {
        nome: "Ritratto",
        nota: "Mettere a proprio agio qualcuno che non vuole essere fotografato: è metà del mestiere.",
      },
      {
        nome: "Still life",
        nota: "Luce costruita da zero, in studio: l'opposto esatto del reportage.",
      },
      {
        nome: "Cerimonia",
        nota: "Una giornata sola, nessuna seconda occasione, e clienti che ricorderanno quelle foto per trent'anni.",
      },
      {
        nome: "Documentazione",
        nota: "Archivi, spettacoli, cantieri, opere. Lavoro invisibile che diventa la memoria di tutto il resto.",
      },
    ],
    doveVederla:
      "Mostre in spazi non museali, festival di fotografia, fanzine autoprodotte. La fotografia italiana viva sta quasi tutta fuori dalle gallerie.",
  },

  videomaker: {
    stato: "bozza",
    siCrede: "Che oggi lo faccia chiunque con un telefono.",
    invece:
      "Il telefono ha reso facile riprendere, non raccontare. Il mestiere sta in quello che non si vede: cosa tagliare, quanto tenere un'inquadratura, quale suono mettere sotto. Un minuto guardabile richiede ore che non compaiono nel minuto.",
    forme: [
      {
        nome: "Documentario",
        nota: "Tempi lunghi e nessun controllo su quello che succede: si monta quello che è capitato.",
      },
      {
        nome: "Videoclip",
        nota: "Immagine al servizio di una musica già finita, con budget quasi sempre inesistenti.",
      },
      {
        nome: "Corporate",
        nota: "La parte che paga: aziende, prodotti, formazione. Vincoli stretti e nessuna firma.",
      },
      {
        nome: "Evento",
        nota: "Una ripresa sola, dal vivo, senza rifare: più vicino al lavoro di un fonico che a quello di un regista.",
      },
      {
        nome: "Montaggio",
        nota: "Chi non gira e decide tutto: è dove il materiale diventa un racconto o resta materiale.",
      },
    ],
    doveVederla:
      "Festival di corti, proiezioni in circoli e biblioteche, canali online di piccole produzioni locali. Quasi mai al cinema, che è il posto dove lo si cercherebbe.",
  },

  illustratori: {
    stato: "bozza",
    siCrede: "Che sia «un bel disegno», e che il valore stia nella somiglianza o nella bravura di mano.",
    invece:
      "Un'illustrazione risolve un problema: far capire una cosa, sostenere un testo, fissare un'immagine che non esiste. Somigliare non c'entra — molte delle illustrazioni più efficaci sono volutamente approssimative, perché la precisione avrebbe distratto.",
    forme: [
      {
        nome: "Editoria",
        nota: "Libri e giornali: si lavora dentro un testo di qualcun altro e dentro una scadenza.",
      },
      {
        nome: "Fumetto",
        nota: "Disegnare il tempo: non una figura, ma il passaggio fra due momenti.",
      },
      {
        nome: "Scientifica e naturalistica",
        nota: "Dove la fotografia non basta perché servirebbe mostrare quello che l'occhio non vede insieme.",
      },
      {
        nome: "Murale",
        nota: "Scala grande, spazio pubblico, e un'opera che poi resta a chi ci abita.",
      },
      {
        nome: "Character design",
        nota: "Inventare una figura che dovrà funzionare in mille pose disegnate da altri.",
      },
    ],
    doveVederla:
      "Fiere di editoria indipendente, librerie per ragazzi, muri di periferia, riviste piccole. Ed è l'arte che si incontra di più senza accorgersene.",
  },

  comici: {
    stato: "bozza",
    siCrede: "Che sia questione di essere spiritosi, e che i pezzi vengano in mente sul momento.",
    invece:
      "Un pezzo di dieci minuti si costruisce in mesi, provandolo davanti a sale piccole e tagliando ogni parola che non serve al ritmo. È scrittura, e il palco è il posto in cui la si verifica — l'unica arte in cui il pubblico ti dice se hai sbagliato mentre lo stai facendo.",
    forme: [
      {
        nome: "Stand-up",
        nota: "Da solo, in prima persona, senza personaggio. Il materiale è scritto e riscritto per anni.",
      },
      {
        nome: "Cabaret",
        nota: "Personaggi, tipi, sketch: tradizione italiana lunga e spesso confusa con la stand-up.",
      },
      {
        nome: "Satira",
        nota: "Comicità che ha un bersaglio preciso, e che quindi si assume un rischio.",
      },
      {
        nome: "Clown e teatro comico",
        nota: "Corpo prima che parola: funziona con chi non parla la tua lingua.",
      },
      {
        nome: "Improvvisazione",
        nota: "Costruire una scena comica su una parola del pubblico, con regole rigide.",
      },
    ],
    doveVederla:
      "Open mic infrasettimanali in locali da cinquanta posti: è lì che si prova tutto quello che poi si vede altrove, e costa quasi sempre un'offerta.",
  },
};

/** Le arti che hanno una scheda scritta, in qualunque stato. */
export function artiConScheda(): string[] {
  return DISCIPLINES.filter((d) => SCHEDE[d.slug]).map((d) => d.slug);
}

/** L'arte, se lo slug esiste. Restituisce anche la scheda, che può mancare. */
export function arteDa(slug: string) {
  const disciplina = DISCIPLINES.find((d) => d.slug === slug);
  if (!disciplina) return null;
  return { disciplina, scheda: SCHEDE[slug] ?? null };
}
