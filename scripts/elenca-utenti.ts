/**
 * Elenca gli account registrati.
 *
 *   npm run user:elenco
 *   npm run user:elenco -- milano        # filtra per email, nome o slug
 *
 * Nasce da un errore reale: assegnare un ruolo richiede l'email esatta, e
 * senza un modo di vederle si tira a indovinare. Uno strumento operativo che
 * costa dieci righe evita di aprire la console del database per una domanda
 * che si pone di continuo.
 *
 * Sola lettura, e nessun dato sensibile: la password non viene nemmeno
 * selezionata.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const filtro = process.argv.slice(2).find((a) => !a.startsWith("--"));

  const utenti = await prisma.user.findMany({
    where: filtro
      ? {
          OR: [
            { email: { contains: filtro, mode: "insensitive" } },
            { name: { contains: filtro, mode: "insensitive" } },
            { slug: { contains: filtro, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      email: true,
      name: true,
      slug: true,
      role: true,
      adminRole: true,
      emailVerified: true,
      isPublic: true,
      createdAt: true,
      _count: { select: { portfolioItems: true, eventsCreated: true } },
    },
  });

  if (utenti.length === 0) {
    console.log(filtro ? `\nNessun account corrisponde a "${filtro}".\n` : "\nNessun account.\n");
    return;
  }

  console.log(`\n${utenti.length} account${filtro ? ` che corrispondono a "${filtro}"` : ""}:\n`);

  for (const u of utenti) {
    const stato = [
      u.emailVerified ? "verificato" : "NON verificato",
      u.isPublic ? "pubblico" : "privato",
      u.adminRole !== "NONE" ? u.adminRole : null,
    ]
      .filter(Boolean)
      .join(" · ");

    console.log(`  ${u.email}`);
    console.log(`    ${u.name}  ·  /artisti/${u.slug}  ·  ${u.role}`);
    console.log(
      `    ${stato}  ·  iscritto il ${u.createdAt.toLocaleDateString("it-IT")}  ·  ` +
        `${u._count.portfolioItems} portfolio, ${u._count.eventsCreated} eventi\n`
    );
  }

  const nonVerificati = utenti.filter((u) => !u.emailVerified).length;
  if (nonVerificati > 0) {
    console.log(
      `${nonVerificati} con email non confermata: non compaiono negli elenchi\n` +
        `pubblici e non vengono indicizzati.\n`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
