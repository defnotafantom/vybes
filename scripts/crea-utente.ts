/**
 * Crea un utente da riga di comando, saltando la verifica email.
 * Serve per il primo accesso e per creare i profili degli artisti che
 * contatti tu, evitando loro la frizione dell'iscrizione.
 *
 *   npx tsx scripts/crea-utente.ts email@dominio.it "Nome Pubblico" ARTIST
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { uniqueSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  const [email, name, role = "ARTIST"] = process.argv.slice(2);

  if (!email || !name) {
    console.error('Uso: npx tsx scripts/crea-utente.ts <email> "<nome>" [ARTIST|RECRUITER]');
    process.exit(1);
  }
  if (!["ARTIST", "RECRUITER"].includes(role)) {
    console.error(`Ruolo non valido: ${role}. Ammessi: ARTIST, RECRUITER`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`Esiste già un account con ${email}`);
    process.exit(1);
  }

  // Password generata: più sicura di una scelta a mano e da cambiare subito.
  const password = randomBytes(12).toString("base64url");
  const slug = await uniqueSlug(name, async (s) =>
    Boolean(await prisma.user.findUnique({ where: { slug: s } }))
  );

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      slug,
      role,
      password: await bcrypt.hash(password, 12),
      emailVerified: new Date(),
    },
  });

  console.log("\nUtente creato");
  console.log(`  email    ${user.email}`);
  console.log(`  password ${password}`);
  console.log(`  profilo  /artisti/${user.slug}`);
  console.log("\nCambia la password al primo accesso.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
