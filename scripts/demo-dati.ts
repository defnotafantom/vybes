/**
 * Popola un database di sviluppo con artisti, ingaggi e candidature finti.
 *
 *   npm run demo:popola              # mostra e non scrive
 *   npm run demo:popola -- --conferma
 *   npm run demo:popola -- --rimuovi --conferma
 *
 * ── A cosa serve ──
 *
 * A poter guardare il sito pieno. Sei profili di esempio non dicono niente su
 * come si comporta una griglia: i dieci difetti trovati aprendo il sito erano
 * quasi tutti «spazio riservato a immagini che non ci sono», e quel genere di
 * cosa si vede solo con trenta schede una accanto all'altra, di lunghezze
 * diverse.
 *
 * ── E perché **non** deve mai finire in produzione ──
 *
 * Perché sarebbero pagine pubbliche e indicizzabili di persone che non
 * esistono. Google le trova alla prima scansione — che per un dominio nuovo è
 * il momento in cui viene valutato — e un organizzatore vero scriverebbe a un
 * nome inventato. È lo stesso ragionamento di RECLUTAMENTO.md: la directory
 * vale quanto le persone che ci sono davvero, e riempirla di finte non la fa
 * sembrare piena, la rende falsa.
 *
 * Da qui la guardia, costruita come quella dei test (ADR-029): il database
 * non si indovina dall'indirizzo, si dichiara.
 *
 * - `localhost` passa sempre: è la tua macchina.
 * - altrimenti serve `DEMO_DATABASE_URL`, esplicita, e diversa da
 *   `DATABASE_URL`.
 * - via d'uscita `DEMO_CONSENTI_DB_PRODUZIONE=1`, lunga di proposito.
 *
 * ── Sulle fotografie ──
 *
 * Sono generate, non vere: gradienti sfocati con un po' di grana, uno per
 * profilo. Servono a giudicare **ritmo e composizione** di una griglia — dove
 * cade l'occhio, se le schede respirano — e non a sapere come starà una foto
 * vera, che ha volti, tagli e colori che nessun gradiente imita. Quel giudizio
 * si può dare solo con le foto dei venti artisti veri.
 *
 * Metà dei profili non ne ha, di proposito: è la proporzione realistica, ed è
 * il caso su cui il layout sbaglia.
 */
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { toSlug, toCsv, uniqueSlug } from "../src/lib/slug";

// ── La guardia ───────────────────────────────────────────────────────────

/** I file `.env` non li legge Node da solo. L'ambiente ha la precedenza. */
function daFile(chiave: string): string {
  for (const nome of [".env.local", ".env"]) {
    if (!existsSync(nome)) continue;
    for (const riga of readFileSync(nome, "utf8").split("\n")) {
      const m = riga.match(new RegExp(`^\\s*${chiave}\\s*=\\s*"?([^"\\n]+?)"?\\s*$`));
      if (m) return m[1];
    }
  }
  return "";
}

function host(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

const perDemo = process.env.DEMO_DATABASE_URL || daFile("DEMO_DATABASE_URL");
const principale = process.env.DATABASE_URL || daFile("DATABASE_URL");
const forza = process.env.DEMO_CONSENTI_DB_PRODUZIONE === "1";
const bersaglio = perDemo || principale;
const inLocale = ["localhost", "127.0.0.1", "::1"].includes(host(bersaglio));

if (!bersaglio) {
  console.error("Nessun database configurato: manca DATABASE_URL.");
  process.exit(1);
}
if (!inLocale && !forza) {
  if (!perDemo) {
    console.error(
      `Rifiuto: il database in uso non è locale (${host(bersaglio)}) e non è stato\n` +
        "dichiarato un database per i dati dimostrativi.\n\n" +
        "Profili finti su un dominio indicizzato diventano pagine pubbliche di\n" +
        "persone che non esistono. Dichiara dove possono andare:\n\n" +
        '  DEMO_DATABASE_URL="postgresql://…"   in .env.local\n\n' +
        "Va bene il branch Neon che usi già per i test.\n" +
        "Se sai quello che stai facendo: DEMO_CONSENTI_DB_PRODUZIONE=1"
    );
    process.exit(1);
  }
  if (perDemo === principale) {
    console.error(
      "Rifiuto: DEMO_DATABASE_URL è identica a DATABASE_URL.\n" +
        "Dichiararla non serve a niente se punta allo stesso posto."
    );
    process.exit(1);
  }
}

const prisma = new PrismaClient({ datasources: { db: { url: bersaglio } } });

// ── I dati ───────────────────────────────────────────────────────────────

/**
 * Il dominio `.invalid` è riservato dalla RFC 2606 e non può essere
 * registrato da nessuno: nessun indirizzo qui dentro può appartenere a una
 * persona vera, nemmeno per sbaglio. È anche il segno che permette a
 * `--rimuovi` di riconoscerli senza toccare altro.
 */
const DOMINIO = "@demo.invalid";

type Demo = {
  nome: string;
  citta: string;
  discipline: string[];
  headline?: string;
  bio?: string;
  /** Quanti lavori nel portfolio, e di che tipo. */
  lavori?: ("image" | "video" | "audio")[];
  foto?: boolean;
};

/**
 * Trenta profili, deliberatamente **disuguali**.
 *
 * La tentazione sarebbe farli tutti completi: griglie ordinate, schede della
 * stessa altezza, tutto bello. Sarebbe inutile — anzi dannoso, perché
 * nasconderebbe esattamente i difetti che questo strumento esiste per far
 * vedere. La distribuzione qui sotto imita quella vera: qualcuno scrive
 * trecento parole, qualcuno tre, molti non caricano la foto, e una manciata
 * si ferma al nome.
 *
 * Milano ne ha la metà, perché è la città su cui punta il reclutamento vero
 * ed è lì che serve sapere se una directory di venti nomi regge.
 */
const ARTISTI: Demo[] = [
  // ── Milano: la città densa ──
  { nome: "Chiara Bellandi", citta: "milano", discipline: ["cantanti", "musicisti"], foto: true,
    headline: "Cantautrice indie-pop, voce e chitarra. Disponibile per club e festival.",
    bio: "Milanese, tre EP autoprodotti e oltre 120 date in Italia. Ho iniziato suonando nei circoli della periferia est e negli ultimi anni ho aperto per band che ascoltavo da ragazzina.\n\nFormazione: voce e chitarra acustica in solo, oppure trio con basso e batteria. Il repertorio è mio, con qualche rilettura di cantautorato italiano quando la serata lo chiede.",
    lavori: ["image", "audio", "video", "image"] },
  { nome: "Marco Ferretti", citta: "milano", discipline: ["dj"], foto: true,
    headline: "DJ house e disco, resident in due club milanesi.",
    bio: "Selezione vinilica tra disco italiana, house e nu-disco. Set da due a sei ore, con o senza scaletta concordata.",
    lavori: ["audio", "audio"] },
  { nome: "Elisa Torrisi", citta: "milano", discipline: ["ballerini"], foto: true,
    headline: "Danzatrice contemporanea, lavora su progetti site-specific.",
    bio: "Formazione tra Milano e Bruxelles. Da cinque anni porto avanti un lavoro sul rapporto fra corpo e architettura industriale: cortili, capannoni, scale antincendio.\n\nDisponibile per performance singole, residenze e laboratori.",
    lavori: ["video", "image", "image"] },
  { nome: "Trio Grisaglia", citta: "milano", discipline: ["band", "musicisti"], foto: true,
    headline: "Jazz da camera per inaugurazioni, cene e matrimoni.",
    bio: "Pianoforte, contrabbasso e sassofono. Repertorio standard americano e bossa, volume calibrato sul parlato: si suona per accompagnare, non per coprire.",
    lavori: ["audio", "image"] },
  { nome: "Yusuf Adebayo", citta: "milano", discipline: ["musicisti"], foto: true,
    headline: "Percussionista, dal repertorio yoruba alle sessioni in studio.",
    bio: "Nato a Lagos, a Milano dal 2016. Djembe, talking drum e set ibrido. Suono con formazioni afrobeat e faccio sessioni per produzioni pop e pubblicitarie.",
    lavori: ["video", "audio", "audio", "image", "image"] },
  { nome: "Giulia Mainardi", citta: "milano", discipline: ["fotografi"], foto: true,
    headline: "Fotografa di scena e ritrattista per musicisti.",
    bio: "Otto anni di backstage fra club e festival. Servizi per press kit, copertine e reportage dal vivo. Lavoro in pellicola quando il tempo lo consente.",
    lavori: ["image", "image", "image", "image", "image"] },
  { nome: "Le Sorelle Vento", citta: "milano", discipline: ["band", "cantanti"],
    headline: "Duo vocale, armonie a due voci su repertorio folk.",
    bio: "Due voci e una chitarra. Canti popolari del nord Italia riarrangiati, più materiale originale.",
    lavori: ["audio"] },
  { nome: "Davide Rocchetti", citta: "milano", discipline: ["comici"], foto: true,
    headline: "Stand-up comedy, un'ora di monologo o spezzoni da venti minuti.",
    bio: "Faccio serate nei locali da sei anni. Materiale su lavoro, famiglia e la vita in una città che costa troppo. Adatto anche a serate aziendali, entro certi limiti.",
    lavori: ["video", "video"] },
  { nome: "Anna Kovač", citta: "milano", discipline: ["musicisti"],
    headline: "Violoncellista classica e contemporanea.",
    bio: "Diplomata al Conservatorio di Lubiana. Suono in quartetto e come solista; collaboro con compositori per prime esecuzioni.",
    lavori: ["audio", "video"] },
  { nome: "Pietro Salis", citta: "milano", discipline: ["videomaker"], foto: true,
    headline: "Videoclip musicali e riprese live multicamera.",
    bio: "Dalla scrittura al montaggio. Ho girato una trentina di videoclip, quasi tutti con budget piccoli e idee grandi.",
    lavori: ["video", "video", "video"] },
  { nome: "Nadia Bonomi", citta: "milano", discipline: ["attori"],
    headline: "Attrice di teatro, disponibile per casting e letture.",
    bio: "Formazione alla Paolo Grassi. Teatro di prosa e contemporaneo; da due anni lavoro anche sul doppiaggio.",
    lavori: ["image"] },
  { nome: "Samuele Ferri", citta: "milano", discipline: ["dj", "musicisti"], foto: true,
    headline: "DJ e produttore, techno melodica.",
    lavori: ["audio", "audio", "audio"] },
  { nome: "Collettivo Bruma", citta: "milano", discipline: ["illustratori"],
    headline: "Illustrazione per manifesti di concerti e copertine.",
    bio: "Tre illustratori, uno studio in zona Lambrate. Lavoriamo soprattutto su serigrafia e stampa a due colori.",
    lavori: ["image", "image", "image"] },
  { nome: "Rebecca Lunardi", citta: "milano", discipline: ["cantanti"], foto: true },
  { nome: "Omar Chelli", citta: "milano", discipline: ["musicisti"],
    headline: "Chitarra elettrica, sessioni e sostituzioni last minute." },

  // ── Roma ──
  { nome: "Collettivo Ostro", citta: "roma", discipline: ["band", "musicisti"], foto: true,
    headline: "Quintetto strumentale tra jazz mediterraneo ed elettronica.",
    bio: "Nati a San Lorenzo nel 2019. Due album e tournée in Italia e Grecia. Dal vivo il set cambia molto: portiamo una scaletta ma la si rompe quasi sempre.",
    lavori: ["audio", "video", "image"] },
  { nome: "Livia Sforza", citta: "roma", discipline: ["attori", "comici"], foto: true,
    headline: "Attrice e autrice, teatro comico e improvvisazione.",
    bio: "Dieci anni di palco fra teatri off e festival. Scrivo i miei spettacoli e faccio improvvisazione con due compagnie romane.",
    lavori: ["video", "image"] },
  { nome: "Tarek Mansour", citta: "roma", discipline: ["musicisti"],
    headline: "Oud e chitarra, repertorio arabo-andaluso.",
    bio: "Suono in duo e in quartetto. Repertorio classico arabo e mediterraneo, con aperture verso il jazz.",
    lavori: ["audio", "audio"] },
  { nome: "Beatrice Ranieri", citta: "roma", discipline: ["ballerini"], foto: true,
    headline: "Danza urbana e coreografia per videoclip.",
    lavori: ["video", "video", "image"] },
  { nome: "Fabio Deiana", citta: "roma", discipline: ["fotografi", "videomaker"],
    headline: "Fotografo e videomaker per artisti emergenti.",
    bio: "Pacchetti pensati per chi ha budget limitato: mezza giornata, foto e un breve video verticale.",
    lavori: ["image", "video"] },
  { nome: "I Cardellini", citta: "roma", discipline: ["band"], foto: true },

  // ── Bologna ──
  { nome: "Duo Lanterne", citta: "bologna", discipline: ["musicisti", "band"], foto: true,
    headline: "Chitarra e violoncello: dal barocco al minimalismo.",
    bio: "Perfetti per matrimoni, inaugurazioni e rassegne di musica da camera. Repertorio adattabile alla durata e allo spazio.",
    lavori: ["audio", "image"] },
  { nome: "Sofia Mandelli", citta: "bologna", discipline: ["cantanti", "musicisti"],
    headline: "Voce jazz e pianoforte.",
    bio: "Standard, bossa e qualche cosa di mio. Faccio serate in duo o in trio; anche solo voce se c'è già un accompagnamento.",
    lavori: ["audio", "audio", "video"] },
  { nome: "Nicolò Bertelli", citta: "bologna", discipline: ["dj"], foto: true,
    headline: "DJ hip-hop e funk, dal vinile.",
    lavori: ["audio"] },
  { nome: "Compagnia Terzo Piano", citta: "bologna", discipline: ["attori", "ballerini"],
    headline: "Teatro-danza, produzioni site-specific.",
    bio: "Sei persone, dieci anni di lavoro insieme. Portiamo spettacoli in spazi non teatrali: ex cinema, mercati, cortili.",
    lavori: ["video", "image", "image"] },

  // ── Napoli ──
  { nome: "Sara Iovine", citta: "napoli", discipline: ["ballerini"], foto: true,
    headline: "Danzatrice contemporanea e coreografa.",
    bio: "Formazione tra Napoli e Bruxelles. Lavoro su progetti site-specific e insegno in laboratori aperti a chi non ha formazione accademica.",
    lavori: ["video", "image"] },
  { nome: "Gennaro Esposito", citta: "napoli", discipline: ["musicisti", "cantanti"],
    headline: "Mandolino e voce, canzone napoletana classica.",
    bio: "Repertorio dell'Ottocento e primo Novecento, eseguito com'era scritto. Suono in duo con chitarra battente.",
    lavori: ["audio", "video", "audio"] },
  { nome: "Marta Cilento", citta: "napoli", discipline: ["illustratori", "fotografi"], foto: true,
    headline: "Illustrazione e fotografia per progetti musicali." },

  // ── Torino ──
  { nome: "Tobia Renna", citta: "torino", discipline: ["fotografi", "videomaker"], foto: true,
    headline: "Fotografo di concerti e ritrattista per musicisti.",
    bio: "Dieci anni di backstage. Servizi per press kit, cover e reportage live.",
    lavori: ["image", "image", "image"] },
  { nome: "Klara Nowak", citta: "torino", discipline: ["musicisti"],
    headline: "Fisarmonica, dal repertorio dell'est al tango.",
    bio: "Polacca, a Torino dal 2018. Suono in trio e da sola; faccio anche musica per spettacoli teatrali.",
    lavori: ["audio", "video"] },
  { nome: "Andrea Pittaluga", citta: "torino", discipline: ["comici"], foto: true },
];

/** Quattordici ingaggi, sparsi fra le città e le categorie. */
const INGAGGI = [
  { titolo: "Cercasi cantautore per rassegna d'autunno", citta: "milano", categoria: "CASTING", giorni: 21, pagato: true, min: 250, max: 400, locale: "Circolo Arci Bellezza",
    descrizione: "Cerchiamo tre cantautori per la rassegna d'autunno del circolo. Set da 45 minuti, formazione acustica o trio. Service audio e fonico inclusi, backline disponibile. Rimborso viaggio per chi arriva da fuori regione." },
  { titolo: "DJ set serata disco italiana", citta: "milano", categoria: "LIVE", giorni: 9, pagato: true, min: 300, locale: "Loft 34",
    descrizione: "Serata mensile dedicata alla disco italiana anni 70-80. Cerchiamo un DJ con selezione vinilica per il secondo set, dall'una alle tre. Impianto Funktion-One, due giradischi Technics." },
  { titolo: "Duo acustico per aperitivo in cortile", citta: "milano", categoria: "LIVE", giorni: 6, pagato: true, min: 180, max: 220, locale: "Cascina Nascosta",
    descrizione: "Due ore di musica di sottofondo per l'aperitivo estivo in cortile. Repertorio jazz, bossa o cantautorato. Impianto voce e due DI a disposizione, niente batteria." },
  { titolo: "Fotografo per press kit di band emergente", citta: "milano", categoria: "CASTING", giorni: 12, pagato: true, min: 300, max: 500, locale: "Studio Lambrate",
    descrizione: "Cerchiamo un fotografo per il press kit di un quintetto: ritratti di gruppo e singoli, mezza giornata in studio più un'ora in esterni. Consegna di dieci scatti ritoccati." },
  { titolo: "Ballerini per videoclip in bianco e nero", citta: "milano", categoria: "CASTING", giorni: 18, pagato: true, min: 200, locale: "Ex Fornace",
    descrizione: "Due giornate di riprese per un videoclip. Cerchiamo quattro danzatori con esperienza in contemporanea. Coreografia già scritta, due giorni di prove pagati a parte." },
  { titolo: "Contest per band emergenti", citta: "torino", categoria: "CONTEST", giorni: 48, pagato: true, min: 150, locale: "Hiroshima Mon Amour",
    descrizione: "Contest per band emergenti piemontesi e non. Sei finaliste, giuria di addetti ai lavori, in palio una data di apertura e una sessione di registrazione. Rimborso spese a tutte le finaliste." },
  { titolo: "Jam session settimanale, cercasi house band", citta: "roma", categoria: "JAM", giorni: 5, pagato: false, locale: "Big Mama",
    descrizione: "Jam aperta a tutti gli strumentisti, ogni mercoledì. Cerchiamo la house band per il trimestre: basso, batteria e tastiere. Non retribuita ma con consumazione e visibilità sul cartellone." },
  { titolo: "Attori per lettura scenica in biblioteca", citta: "roma", categoria: "CASTING", giorni: 26, pagato: true, min: 120, locale: "Biblioteca Rispoli",
    descrizione: "Lettura scenica di racconti del Novecento italiano, tre serate. Cerchiamo due attori. Due prove di due ore, compenso a serata." },
  { titolo: "Live acustico per apertura enoteca", citta: "bologna", categoria: "LIVE", giorni: 14, pagato: true, min: 200, max: 280, locale: "Enoteca Cardinale",
    descrizione: "Inaugurazione della nuova sede. Cerchiamo un duo acustico per un set di due ore, volume da sottofondo. Repertorio jazz, bossa o cantautorato italiano." },
  { titolo: "Workshop di illustrazione per manifesti", citta: "bologna", categoria: "WORKSHOP", giorni: 40, pagato: true, min: 400, locale: "Serra Madre",
    descrizione: "Due giornate di laboratorio sulla serigrafia applicata ai manifesti di concerti. Cerchiamo un docente con pratica di stampa. Materiali forniti." },
  { titolo: "Workshop di danza contemporanea", citta: "napoli", categoria: "WORKSHOP", giorni: 35, pagato: false, locale: "Spazio Kairos",
    descrizione: "Tre giorni di laboratorio aperto a danzatori con esperienza. Cerchiamo due assistenti alla docenza. Non retribuito ma con vitto, alloggio e attestato; possibilità di entrare nel cast della produzione successiva." },
  { titolo: "Mandolino e voce per matrimonio sul golfo", citta: "napoli", categoria: "LIVE", giorni: 55, pagato: true, min: 500, max: 700, locale: "Villa Nausicaa",
    descrizione: "Cerimonia e aperitivo, circa tre ore complessive. Repertorio classico napoletano. Impianto fornito dal service della villa." },
  { titolo: "Comico per serata di apertura", citta: "torino", categoria: "LIVE", giorni: 11, pagato: true, min: 150, max: 200, locale: "Blah Blah",
    descrizione: "Venti minuti di apertura prima del concerto principale. Cerchiamo stand-up, materiale già rodato. Pubblico fra i venticinque e i quarant'anni." },
  { titolo: "Videomaker per riprese multicamera di un live", citta: "roma", categoria: "CASTING", giorni: 30, pagato: true, min: 600, max: 900, locale: "Monk",
    descrizione: "Concerto di un'ora e mezza, tre camere. Cerchiamo un videomaker che gestisca anche il montaggio. Audio fornito dal fonico di sala, multitraccia." },
];

// ── Le immagini ──────────────────────────────────────────────────────────

/**
 * Una «fotografia» generata, deterministica dal nome.
 *
 * Gradiente sfocato più grana, così in una griglia le schede non si somigliano
 * tutte. Non imita una fotografia vera e non deve: serve a vedere come si
 * comporta il layout quando gli spazi sono pieni.
 */
async function generaFoto(seme: string, percorso: string, larghezza: number, altezza: number) {
  let h = 0;
  for (const c of seme) h = (h * 31 + c.charCodeAt(0)) % 360;
  const a = `hsl(${h} 55% 35%)`;
  const b = `hsl(${(h + 70) % 360} 60% 18%)`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larghezza}" height="${altezza}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${larghezza * 0.7}" cy="${altezza * 0.3}" r="${larghezza * 0.28}"
            fill="hsl(${(h + 140) % 360} 70% 55%)" opacity="0.35"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .blur(larghezza / 40)
    .jpeg({ quality: 72 })
    .toFile(percorso);
}

// ── Esecuzione ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const conferma = argv.includes("--conferma");
const rimuovi = argv.includes("--rimuovi");

async function pulisci() {
  const utenti = await prisma.user.findMany({
    where: { email: { endsWith: DOMINIO } },
    select: { id: true, name: true },
  });
  console.log(`${utenti.length} profili dimostrativi trovati.`);
  if (!conferma) {
    console.log("Niente è stato scritto: rilancia con --conferma.");
    return;
  }
  // Gli ingaggi hanno `onDelete: Cascade` sull'organizzatore, quindi se ne
  // vanno con lui insieme a candidature e portfolio.
  const { count } = await prisma.user.deleteMany({ where: { id: { in: utenti.map((u) => u.id) } } });
  console.log(`${count} profili rimossi, con tutto ciò che ne dipendeva.`);
}

async function popola() {
  const citta = new Map(
    (await prisma.city.findMany({ select: { slug: true, name: true, region: true, latitude: true, longitude: true } })).map(
      (c) => [c.slug, c]
    )
  );

  const mancanti = [...new Set([...ARTISTI.map((a) => a.citta), ...INGAGGI.map((e) => e.citta)])].filter(
    (s) => !citta.has(s)
  );
  if (mancanti.length > 0) {
    console.error(
      `Città assenti dal database: ${mancanti.join(", ")}.\n` +
        "Lancia prima `npm run db:seed`: senza le città i profili nascono senza luogo."
    );
    process.exit(1);
  }

  console.log(`Database: ${host(bersaglio) || "locale"}${inLocale ? "  (la tua macchina)" : ""}`);
  console.log(`${ARTISTI.length} artisti, ${INGAGGI.length} ingaggi.\n`);

  if (!conferma) {
    for (const a of ARTISTI) {
      const pezzi = [
        a.bio ? `bio ${a.bio.length}c` : "senza bio",
        a.foto ? "foto" : "senza foto",
        `${a.lavori?.length ?? 0} lavori`,
      ];
      console.log(`  ${a.nome.padEnd(26)} ${a.citta.padEnd(9)} ${pezzi.join(" · ")}`);
    }
    console.log("\nNiente è stato scritto: rilancia con --conferma.");
    return;
  }

  const cartella = join(process.cwd(), "public", "demo");
  mkdirSync(cartella, { recursive: true });

  const password = await bcrypt.hash(`demo-${Math.random()}`, 10);
  const creati: { id: string; nome: string }[] = [];

  for (const a of ARTISTI) {
    const c = citta.get(a.citta)!;
    const email = `${toSlug(a.nome)}${DOMINIO}`;

    /*
     * Lo slug deve essere libero, non semplicemente derivato dal nome.
     *
     * La prima versione faceva `toSlug(nome)` e basta, e moriva su
     * `Unique constraint failed on the fields: (slug)`: `npm run db:seed`
     * crea già alcuni di questi artisti — Chiara Bellandi, Marco Ferretti —
     * con indirizzi diversi ma lo stesso slug. L'`upsert` guardava l'email,
     * trovava che non c'era, provava a inserire, e sbatteva contro il nome
     * pubblico già occupato.
     *
     * `uniqueSlug` esisteva già in `src/lib/slug.ts` ed è quello che usa la
     * registrazione: il secondo «Marco Rossi» diventa `marco-rossi-2`.
     * L'eccezione sull'email serve al rilancio — chi ha già il proprio slug
     * se lo tiene, altrimenti ogni esecuzione sposterebbe gli indirizzi.
     */
    const slug = await uniqueSlug(a.nome, async (candidato) => {
      const occupato = await prisma.user.findUnique({
        where: { slug: candidato },
        select: { email: true },
      });
      return Boolean(occupato) && occupato!.email !== email;
    });

    let image: string | null = null;
    if (a.foto) {
      await generaFoto(a.nome, join(cartella, `${slug}.jpg`), 640, 640);
      image = `/demo/${slug}.jpg`;
    }

    const utente = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: a.nome,
        slug,
        password,
        role: "ARTIST",
        headline: a.headline ?? null,
        bio: a.bio ?? null,
        disciplines: toCsv(a.discipline),
        image,
        citySlug: c.slug,
        city: c.name,
        region: c.region,
        latitude: c.latitude,
        longitude: c.longitude,
        isPublic: true,
        emailVerified: new Date(),
      },
    });

    await prisma.portfolioItem.deleteMany({ where: { userId: utente.id } });
    for (const [i, tipo] of (a.lavori ?? []).entries()) {
      let mediaUrl = "";
      if (tipo === "image") {
        const nome = `${slug}-${i}.jpg`;
        await generaFoto(`${a.nome}${i}`, join(cartella, nome), 1200, 900);
        mediaUrl = `/demo/${nome}`;
      } else {
        // Video e audio non hanno anteprima: è di proposito, perché è il caso
        // su cui la griglia sbagliava — un riquadro vuoto invece del
        // segnaposto per tipo (ADR-040).
        mediaUrl = `https://example.invalid/demo/${slug}-${i}`;
      }
      await prisma.portfolioItem.create({
        data: {
          userId: utente.id,
          slug: `${slug}-lavoro-${i + 1}`,
          title: `Lavoro ${i + 1} di ${a.nome.split(" ")[0]}`,
          mediaUrl,
          mediaType: tipo,
          year: 2023 + (i % 3),
          position: i,
          isPublic: true,
        },
      });
    }

    creati.push({ id: utente.id, nome: a.nome });
  }
  console.log(`✓ ${creati.length} profili`);

  // Gli ingaggi li pubblicano artisti presi dall'elenco: sul sito chiunque può
  // organizzare, e avere un unico account «organizzatore» darebbe una
  // directory in cui gli annunci vengono tutti dalla stessa persona — che è
  // proprio l'aspetto che si vuole poter valutare.
  let nEventi = 0;
  for (const [i, e] of INGAGGI.entries()) {
    const c = citta.get(e.citta)!;
    const organizzatore = creati[(i * 7) % creati.length];
    const slug = toSlug(`${e.titolo} ${c.name}`);

    const evento = await prisma.event.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        organizerId: organizzatore.id,
        title: e.titolo,
        description: e.descrizione,
        category: e.categoria,
        startsAt: new Date(Date.now() + e.giorni * 86_400_000),
        venueName: e.locale,
        citySlug: c.slug,
        city: c.name,
        region: c.region,
        latitude: c.latitude,
        longitude: c.longitude,
        isPaid: e.pagato,
        feeMin: e.min ?? null,
        feeMax: e.max ?? null,
        isPublic: true,
        status: "PUBLISHED",
      },
    });
    nEventi++;

    // Candidature con esiti diversi: un elenco tutto «in attesa» non mostra
    // come si comportano gli altri due stati.
    const stati = ["PENDING", "PENDING", "ACCEPTED", "REJECTED"] as const;
    for (let k = 0; k < 3; k++) {
      const candidato = creati[(i * 3 + k + 1) % creati.length];
      if (candidato.id === organizzatore.id) continue;
      await prisma.participation.upsert({
        where: { eventId_userId: { eventId: evento.id, userId: candidato.id } },
        update: {},
        create: {
          eventId: evento.id,
          userId: candidato.id,
          status: stati[(i + k) % stati.length],
          message: k === 0 ? "Disponibile per quella data, ho già suonato in uno spazio simile." : null,
        },
      });
    }
  }
  console.log(`✓ ${nEventi} ingaggi, con candidature in tutti gli stati`);

  console.log(
    "\nLe immagini stanno in `public/demo/`, che non è versionata: sono\n" +
      "gradienti generati, non fotografie. Dicono come si comporta il layout\n" +
      "quando gli spazi sono pieni, non come starà una foto vera.\n" +
      "\nPer togliere tutto: npm run demo:popola -- --rimuovi --conferma"
  );
}

(rimuovi ? pulisci() : popola())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
