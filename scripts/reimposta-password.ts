/**
 * Reimposta la password di un utente senza passare dall'email.
 * Da usare quando qualcuno resta fuori e il provider email non è configurato.
 *
 *   npx tsx scripts/reimposta-password.ts email@dominio.it [nuova-password]
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [email, provided] = process.argv.slice(2);
  if (!email) {
    console.error("Uso: npx tsx scripts/reimposta-password.ts <email> [nuova-password]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Nessun account con ${email}`);
    process.exit(1);
  }

  const password = provided ?? randomBytes(12).toString("base64url");
  if (password.length < 10) {
    console.error("La password deve avere almeno 10 caratteri");
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 12), emailVerified: new Date() },
    }),
    // I token di reset in circolazione vanno invalidati.
    prisma.verificationToken.deleteMany({ where: { userId: user.id } }),
  ]);

  console.log(`\nPassword aggiornata per ${user.email}`);
  if (!provided) console.log(`  nuova password: ${password}`);
  console.log();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
