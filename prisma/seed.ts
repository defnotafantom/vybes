import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_CITIES, cityIntro } from "../src/lib/cities";

const prisma = new PrismaClient();

/**
 * Gli obiettivi, e a chi si propongono.
 *
 * `ruoli` vuoto vale «a tutti». Le altre sono divise perche' erano tutte
 * uguali per tutti, e un organizzatore si trovava in elenco «Portfolio solido
 * \u2014 arriva a 5 lavori pubblicati» ferma a 0/5 per sempre: un traguardo
 * che il suo ruolo non raggiunge. Un elenco pieno di cose impossibili non
 * motiva nessuno, insegna a ignorare l'elenco.
 *
 * `first_event` non e' riservata all'organizzatore: chiunque puo' pubblicare
 * un annuncio, e una band che organizza la propria jam sta facendo
 * esattamente la cosa che l'obiettivo descrive. Il ruolo qui e' un'intenzione
 * dichiarata, non un permesso (vedi src/lib/ruolo.ts).
 */
const QUESTS = [
  { key: "welcome", title: "Benvenuto su Vybes", description: "Crea il tuo account.", xpReward: 20, target: 1, category: "ONBOARDING", ruoli: "" },
  { key: "profile_complete", title: "Profilo completo", description: "Compila bio, headline, foto, città e discipline.", xpReward: 80, repReward: 5, target: 1, category: "ONBOARDING", ruoli: "ARTIST" },
  { key: "profilo_locale", title: "Fatti riconoscere", description: "Compila presentazione, foto e città: è quello che un artista legge prima di candidarsi.", xpReward: 80, repReward: 5, target: 1, category: "ONBOARDING", ruoli: "RECRUITER" },
  { key: "first_post", title: "Primo post", description: "Pubblica il tuo primo contenuto nel feed.", xpReward: 40, target: 1, category: "SOCIAL", ruoli: "" },
  { key: "first_portfolio", title: "Prima opera", description: "Carica il primo lavoro nel portfolio.", xpReward: 60, repReward: 3, target: 1, category: "PORTFOLIO", ruoli: "ARTIST" },
  { key: "portfolio_five", title: "Portfolio solido", description: "Arriva a 5 lavori pubblicati.", xpReward: 150, repReward: 10, target: 5, category: "PORTFOLIO", ruoli: "ARTIST" },
  { key: "first_event", title: "Primo ingaggio pubblicato", description: "Pubblica un annuncio: con data, luogo e compenso in chiaro riceve risposte pertinenti.", xpReward: 70, target: 1, category: "EVENTI", ruoli: "" },
  { key: "join_event", title: "Prima candidatura", description: "Candidati a un ingaggio.", xpReward: 50, target: 1, category: "EVENTI", ruoli: "ARTIST" },
  { key: "prima_risposta", title: "Non lasciare nessuno ad aspettare", description: "Rispondi a una candidatura ricevuta. Anche un no vale: chi aspetta ha bisogno di sapere.", xpReward: 70, target: 1, category: "EVENTI", ruoli: "RECRUITER" },
  { key: "collaboration", title: "Meglio in due", description: "Pubblica un post di collaborazione.", xpReward: 90, repReward: 5, target: 1, category: "SOCIAL", ruoli: "ARTIST" },
];

const DEMO_ARTISTS = [
  { name: "Chiara Bellandi", slug: "chiara-bellandi", city: "milano", disciplines: "cantanti,musicisti", headline: "Cantautrice indie-pop, voce e chitarra. Disponibile per club e festival.", bio: "Milanese, tre EP autoprodotti e oltre 120 date in Italia.\n\nFormazione: voce e chitarra acustica in solo, oppure trio con basso e batteria." },
  { name: "Marco Ferretti", slug: "marco-ferretti", city: "milano", disciplines: "dj", headline: "DJ house e disco, resident in due club milanesi.", bio: "Selezione vinilica tra disco italiana, house e nu-disco. Set da 2 a 6 ore." },
  { name: "Collettivo Ostro", slug: "collettivo-ostro", city: "roma", disciplines: "band,musicisti", headline: "Quintetto strumentale tra jazz mediterraneo e elettronica.", bio: "Nati a San Lorenzo nel 2019. Due album, tournée in Italia e Grecia." },
  { name: "Sara Iovine", slug: "sara-iovine", city: "napoli", disciplines: "ballerini", headline: "Danzatrice contemporanea e coreografa.", bio: "Formazione tra Napoli e Bruxelles. Lavora su progetti site-specific." },
  { name: "Duo Lanterne", slug: "duo-lanterne", city: "bologna", disciplines: "musicisti,band", headline: "Chitarra e violoncello: repertorio dal barocco al minimalismo.", bio: "Perfetti per matrimoni, inaugurazioni e rassegne di musica da camera." },
  { name: "Tobia Renna", slug: "tobia-renna", city: "torino", disciplines: "fotografi,videomaker", headline: "Fotografo di concerti e ritrattista per musicisti.", bio: "Dieci anni di backstage. Servizi per press kit, cover e reportage live." },
];

const DEMO_EVENTS = [
  { title: "Cercasi cantautore per rassegna d'autunno", city: "milano", category: "CASTING", days: 21, isPaid: true, feeMin: 250, feeMax: 400, venue: "Circolo Arci Bellezza", description: "Cerchiamo tre cantautori per la rassegna d'autunno del circolo. Set da 45 minuti, formazione acustica o trio. Service audio e fonico inclusi, backline disponibile. Rimborso viaggio previsto per chi arriva da fuori regione." },
  { title: "DJ set serata disco italiana", city: "milano", category: "LIVE", days: 9, isPaid: true, feeMin: 300, venue: "Loft 34", description: "Serata mensile dedicata alla disco italiana anni 70-80. Cerchiamo un DJ con selezione vinilica per il secondo set, dall'una alle tre. Impianto Funktion-One, due giradischi Technics e mixer Allen&Heath." },
  { title: "Workshop di danza contemporanea", city: "napoli", category: "WORKSHOP", days: 35, isPaid: false, venue: "Spazio Kairos", description: "Tre giorni di laboratorio aperto a danzatori con esperienza. Cerchiamo due assistenti alla docenza. Non retribuito ma con vitto, alloggio e attestato; possibilità di entrare nel cast della produzione successiva." },
  { title: "Live acustico per apertura enoteca", city: "bologna", category: "LIVE", days: 14, isPaid: true, feeMin: 200, feeMax: 280, venue: "Enoteca Cardinale", description: "Inaugurazione della nuova sede. Cerchiamo un duo acustico per un set di due ore, volume da sottofondo. Repertorio jazz, bossa o cantautorato italiano. Impianto voce e due DI a disposizione." },
  { title: "Contest per band emergenti", city: "torino", category: "CONTEST", days: 48, isPaid: true, feeMin: 150, venue: "Hiroshima Mon Amour", description: "Contest per band emergenti piemontesi e non. Sei finaliste, giuria di addetti ai lavori, in palio una data di apertura e una sessione di registrazione. Rimborso spese garantito a tutte le finaliste." },
  { title: "Jam session settimanale", city: "roma", category: "JAM", days: 5, isPaid: false, venue: "Big Mama", description: "Jam aperta a tutti gli strumentisti, ogni mercoledì. Cerchiamo la house band per il trimestre: basso, batteria e tastiere. Non retribuita ma con consumazione e visibilità sul cartellone del locale." },
];

async function main() {
  console.log("Seed: città…");
  for (const c of SEED_CITIES) {
    await prisma.city.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug, name: c.name, region: c.region,
        latitude: c.lat, longitude: c.lng, population: c.population, intro: cityIntro(c),
      },
      update: { intro: cityIntro(c) },
    });
  }

  console.log("Seed: quest…");
for (const q of QUESTS) {
  // Scompatti q usando 'key' invece di 'type'
  const { key, ...rest } = q;

  await prisma.quest.upsert({
    where: { key: key }, // Se nello schema il campo univoco si chiama 'key'
    create: { key, ...rest },
    update: { ...rest },
  });
}

  console.log("Seed: utenti…");
  const password = await bcrypt.hash("Password123", 12);

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@vybes.test" },
    create: {
      email: "recruiter@vybes.test", password, emailVerified: new Date(),
      name: "Circolo Bellezza", slug: "circolo-bellezza", role: "RECRUITER",
      headline: "Circolo culturale e sala concerti a Milano.",
      citySlug: "milano", city: "Milano", region: "Lombardia",
      latitude: 45.4642, longitude: 9.19, isVerified: true, reputation: 40,
    },
    update: {},
  });

  for (const a of DEMO_ARTISTS) {
    const city = SEED_CITIES.find((c) => c.slug === a.city)!;
    await prisma.user.upsert({
      where: { email: `${a.slug}@vybes.test` },
      create: {
        email: `${a.slug}@vybes.test`, password, emailVerified: new Date(),
        name: a.name, slug: a.slug, role: "ARTIST",
        headline: a.headline, bio: a.bio, disciplines: a.disciplines,
        citySlug: city.slug, city: city.name, region: city.region,
        latitude: city.lat, longitude: city.lng,
        experience: Math.floor(Math.random() * 800), reputation: Math.floor(Math.random() * 60),
        level: 1, isVerified: Math.random() > 0.5,
      },
      update: {},
    });
  }

  console.log("Seed: eventi…");
  for (const e of DEMO_EVENTS) {
    const city = SEED_CITIES.find((c) => c.slug === e.city)!;
    // L'ora, non solo il giorno.
    //
    // `Date.now()` più N giorni eredita l'ora in cui è stato lanciato il seed,
    // e in produzione è uscito «venerdì 14 agosto **alle ore 13:27**» per un
    // live in enoteca. Nessun locale programma un concerto alle 13:27: quel
    // numero, sull'unica manciata di annunci che un visitatore vede oggi, dice
    // «questo è un sito di prova» meglio di qualunque altra cosa in pagina.
    //
    // Un workshop di giorno e tutto il resto di sera, che è quando si suona.
    const startsAt = new Date(Date.now() + e.days * 86400000);
    startsAt.setHours(e.category === "WORKSHOP" ? 10 : 21, 30, 0, 0);
    const monthYear = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(startsAt);
    const slug = `${e.title} ${city.name} ${monthYear}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await prisma.event.upsert({
      where: { slug },
      create: {
        slug, organizerId: recruiter.id, title: e.title, description: e.description,
        category: e.category, startsAt, endsAt: new Date(startsAt.getTime() + 3 * 3600000),
        venueName: e.venue, citySlug: city.slug, city: city.name, region: city.region,
        latitude: city.lat + (Math.random() - 0.5) * 0.02,
        longitude: city.lng + (Math.random() - 0.5) * 0.02,
        isPaid: e.isPaid, feeMin: e.feeMin ?? null, feeMax: e.feeMax ?? null, capacity: 6,
      },
      update: {},
    });
  }

  console.log("Seed: portfolio e post…");
  const chiara = await prisma.user.findUnique({ where: { slug: "chiara-bellandi" } });
  if (chiara) {
    await prisma.portfolioItem.upsert({
      where: { slug: "verso-nord-chiara-bellandi" },
      create: {
        userId: chiara.id, slug: "verso-nord-chiara-bellandi", title: "Verso Nord",
        description: "Singolo autoprodotto, registrato in presa diretta in un capannone di Sesto San Giovanni.",
        // `mediaType: "image"` con un percorso locale che non esiste dava, su
        // ogni caricamento della pagina, il rettangolo rotto del browser più
        // `⨯ The requested resource isn't a valid image` nei log del server.
        // Un'immagine di esempio non ce l'abbiamo e non ha senso inventarla:
        // dichiararlo `audio` è la verità — un singolo autoprodotto — e la
        // griglia mostra il segnaposto per tipo (ADR-040) invece di un errore.
        mediaUrl: "https://example.invalid/demo/verso-nord", mediaType: "audio", year: 2025, position: 0,
      },
      update: {},
    });

    const tag = await prisma.tag.upsert({
      where: { slug: "nuovo-brano" },
      create: { slug: "nuovo-brano", label: "nuovo-brano" },
      update: {},
    });

    const existing = await prisma.post.findFirst({ where: { authorId: chiara.id } });
    if (!existing) {
      await prisma.post.create({
        data: {
          authorId: chiara.id,
          content: "Nuovo singolo fuori venerdì. Registrato in presa diretta, senza click. Chi c'è a Milano il 12?",
          tags: { create: [{ tagId: tag.id }] },
        },
      });
    }
  }

  console.log("Seed completato.");
  console.log("Login demo: recruiter@vybes.test / chiara-bellandi@vybes.test — password: Password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
