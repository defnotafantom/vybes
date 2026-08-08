/**
 * Crea profili artista completi da un file JSON.
 *
 * ── Perché serve ──
 *
 * Il collo di bottiglia del progetto non è tecnico: è che una directory con
 * sei profili di esempio non serve a nessuno. Servono venti artisti veri in
 * una città sola, ed è l'unica cosa che stabilisce se il progetto ha ragione
 * di esistere.
 *
 * Ma chiedere a un musicista di registrarsi, confermare l'email, compilare la
 * biografia e caricare tre lavori significa perderne nove su dieci per strada:
 * la frizione dell'iscrizione è l'ostacolo, non la mancanza di interesse.
 * Molto più facile chiedergli quattro cose per messaggio e costruirgli il
 * profilo — questo script fa quella parte.
 *
 * `user:crea` esiste già ma crea un account nudo, che **non supera la soglia
 * di indicizzazione**: senza biografia, disciplina e almeno un lavoro il
 * profilo resta fuori dall'indice, cioè non fa la cosa per cui l'artista ha
 * accettato. Qui il profilo nasce completo, e se non lo è lo script lo dice.
 *
 * ── Il consenso ──
 *
 * Pubblicare nome, foto e opere di una persona richiede una base giuridica.
 * Il modello di richiesta e la formula di consenso stanno in RECLUTAMENTO.md:
 * vanno raccolti **prima**, e conservati. Questo script si limita a chiedere
 * che il campo `consenso` sia compilato, il che non sostituisce il consenso ma
 * impedisce di dimenticarsene.
 *
 * ── Uso ──
 *
 *     npm run artisti:importa -- dati/milano.json          mostra e non scrive
 *     npm run artisti:importa -- dati/milano.json --conferma
 *
 * Il formato del file è documentato in RECLUTAMENTO.md. È idempotente
 * sull'email: rilanciarlo aggiorna i profili esistenti invece di duplicarli.
 */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { uniqueSlug, toCsv } from "../src/lib/slug";
import { isProfileIndexable, missingForIndex } from "../src/lib/profile-quality";
import { calcolaReputazione, reputazioneMassima } from "../src/lib/reputazione";

type Lavoro = {
  titolo: string;
  mediaUrl: string;
  tipo?: "image" | "video" | "audio";
  descrizione?: string;
  anno?: number;
};

type Artista = {
  email: string;
  nome: string;
  /** Slug delle discipline, come in src/lib/constants.ts: musicisti, dj, … */
  discipline: string[];
  citySlug: string;
  headline: string;
  bio: string;
  consenso: string;
  image?: string;
  website?: string;
  instagram?: string;
  spotify?: string;
  youtube?: string;
  portfolio?: Lavoro[];
};

const argv = process.argv.slice(2);
const conferma = argv.includes("--conferma");
const percorso = argv.find((a) => !a.startsWith("--"));

/** Password casuale: l'artista la reimposta dal recupero, non gliela mandiamo. */
function passwordCasuale() {
  return Array.from({ length: 20 }, () =>
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
      Math.floor(Math.random() * 56)
    )
  ).join("");
}

/**
 * Slug unico: il secondo "Marco Rossi" diventa marco-rossi-2.
 *
 * `uniqueSlug` esisteva già in `src/lib/slug.ts` — la prima versione di questo
 * script se l'era riscritta a mano, che è precisamente l'abitudine che su
 * questo progetto ha prodotto metà dei difetti: due copie della stessa regola
 * divergono alla prima modifica.
 *
 * L'email serve per l'aggiornamento: chi ha già il proprio slug se lo tiene,
 * altrimenti reimportare lo stesso file cambierebbe gli indirizzi pubblici a
 * ogni giro — e un indirizzo pubblico che cambia è un collegamento rotto.
 */
function slugLibero(nome: string, emailEsistente?: string) {
  return uniqueSlug(nome, async (candidato) => {
    const occupato = await prisma.user.findUnique({
      where: { slug: candidato },
      select: { email: true },
    });
    return Boolean(occupato) && occupato!.email !== emailEsistente;
  });
}

async function main() {
  if (!percorso) {
    console.error("Uso: npm run artisti:importa -- <file.json> [--conferma]");
    process.exit(1);
  }

  const artisti: Artista[] = JSON.parse(readFileSync(percorso, "utf8"));
  if (!Array.isArray(artisti)) throw new Error("Il file deve contenere un array di artisti.");

  // Le città devono esistere: uno slug sbagliato produce un profilo senza
  // luogo, che è il campo su cui poggia metà della strategia di ricerca.
  const citta = new Set((await prisma.city.findMany({ select: { slug: true } })).map((c) => c.slug));

  let creati = 0;
  let aggiornati = 0;
  const problemi: string[] = [];

  for (const a of artisti) {
    const dove = `${a.nome ?? "(senza nome)"} <${a.email ?? "?"}>`;

    if (!a.email || !a.nome || !a.consenso?.trim()) {
      problemi.push(`${dove}: mancano email, nome o consenso`);
      continue;
    }
    if (!citta.has(a.citySlug)) {
      problemi.push(`${dove}: città "${a.citySlug}" non esiste`);
      continue;
    }

    const portfolio = a.portfolio ?? [];
    const indicizzabile = isProfileIndexable({
      bio: a.bio,
      disciplines: toCsv(a.discipline ?? []),
      portfolioCount: portfolio.length,
    });

    if (!indicizzabile) {
      // Non è un errore bloccante — il profilo resta utile a chi ci arriva —
      // ma va detto forte: è la differenza fra una pagina che porta traffico
      // e una che non lo porterà mai.
      problemi.push(
        `${dove}: non sarà indicizzabile → ${missingForIndex({
          bio: a.bio,
          disciplines: toCsv(a.discipline ?? []),
          portfolioCount: portfolio.length,
        }).join("; ")}`
      );
    }

    const email = a.email.toLowerCase();
    const esistente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const c = await prisma.city.findUnique({
      where: { slug: a.citySlug },
      select: { name: true, region: true, latitude: true, longitude: true },
    });

    const dati = {
      name: a.nome,
      headline: a.headline || null,
      bio: a.bio || null,
      disciplines: toCsv(a.discipline ?? []),
      image: a.image || null,
      website: a.website || null,
      instagram: a.instagram || null,
      spotify: a.spotify || null,
      youtube: a.youtube || null,
      citySlug: a.citySlug,
      city: c!.name,
      region: c!.region,
      latitude: c!.latitude,
      longitude: c!.longitude,
      isPublic: true,
      // L'indirizzo è stato dato a voce e verificato dal contatto diretto: la
      // conferma via email servirebbe a dimostrare che esiste, e qui lo
      // sappiamo già. Senza, il profilo non comparirebbe da nessuna parte.
      emailVerified: new Date(),
    };

    if (!conferma) {
      console.log(`${esistente ? "aggiorna" : "  crea "}  ${dove}${indicizzabile ? "" : "  ⚠"}`);
      continue;
    }

    const slug = await slugLibero(a.nome, email);

    const utente = esistente
      ? await prisma.user.update({ where: { id: esistente.id }, data: dati })
      : await prisma.user.create({
          data: {
            ...dati,
            email,
            slug,
            role: "ARTIST",
            password: await bcrypt.hash(passwordCasuale(), 12),
          },
        });

    // Il portfolio si sostituisce invece di accumularsi: rilanciare
    // l'importazione con un file corretto deve dare il risultato del file, non
    // la somma di tutti i tentativi.
    await prisma.portfolioItem.deleteMany({ where: { userId: utente.id } });
    for (const [i, l] of portfolio.entries()) {
      await prisma.portfolioItem.create({
        data: {
          userId: utente.id,
          slug: await uniqueSlug(`${a.nome}-${l.titolo}`, async (c) =>
            Boolean(await prisma.portfolioItem.findUnique({ where: { slug: c } }))
          ),
          title: l.titolo,
          description: l.descrizione || null,
          mediaUrl: l.mediaUrl,
          mediaType: l.tipo ?? "image",
          year: l.anno ?? null,
          position: i,
        },
      });
    }

    // La reputazione si calcola dallo stato: senza questo il profilo nasce a
    // zero e finisce in fondo alla directory pur essendo completo.
    const reputation = calcolaReputazione(
      {
        emailVerified: dati.emailVerified,
        isVerified: false,
        bio: dati.bio,
        headline: dati.headline,
        image: dati.image,
        citySlug: dati.citySlug,
        disciplines: dati.disciplines,
        portfolio: portfolio.length,
        ingaggiConfermati: 0,
        ingaggiOrganizzati: 0,
        // Questo script importa artisti: i fatti dell'organizzatore non lo
        // riguardano e non entrano in nessuna delle voci del suo ruolo.
        candidatureRicevute: 0,
        candidatureRisposte: 0,
        annunciPubblicati: 0,
        annunciRetribuiti: 0,
      },
      "ARTIST"
    );
    await prisma.user.update({ where: { id: utente.id }, data: { reputation } });

    // Il massimo si chiede alla formula: scritto a mano era «110», ed era gia'
    // sbagliato il giorno in cui i due ruoli sono diventati due formule da 100.
    console.log(
      `  ${esistente ? "aggiornato" : "creato"}  /artisti/${utente.slug}  ·  ` +
        `${reputation}/${reputazioneMassima("ARTIST")}`
    );
    esistente ? aggiornati++ : creati++;
  }

  if (problemi.length > 0) {
    console.log("\nDa sistemare:");
    for (const p of problemi) console.log(`  · ${p}`);
  }

  console.log(
    conferma
      ? `\n${creati} creati, ${aggiornati} aggiornati.` +
          "\nLe pagine pubbliche sono in cache: per vederli subito, un redeploy su Vercel."
      : `\n${artisti.length} artisti nel file. Niente è stato scritto: rilancia con --conferma.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
