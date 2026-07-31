/**
 * Assegna il ruolo di moderazione. I permessi sono in src/lib/permissions.ts.
 *
 *   npx tsx scripts/assegna-ruolo-admin.ts email@dominio.it SUPERADMIN
 *
 * Il primo superadmin va per forza creato così: dall'interfaccia servirebbe
 * già essere superadmin per promuovere qualcuno.
 */
import { PrismaClient } from "@prisma/client";
import { ADMIN_ROLES, permissionsFor } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const [email, role] = process.argv.slice(2);

  if (!email || !role) {
    console.error(`Uso: npx tsx scripts/assegna-ruolo-admin.ts <email> <${ADMIN_ROLES.join("|")}>`);
    process.exit(1);
  }
  if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
    console.error(`Ruolo non valido: ${role}. Ammessi: ${ADMIN_ROLES.join(", ")}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Nessun account con ${email}`);
    process.exit(1);
  }

  await prisma.user.update({ where: { id: user.id }, data: { adminRole: role } });

  const permissions = permissionsFor(role);
  console.log(`\n${user.name} (${user.email}) ora è ${role}`);
  console.log(
    permissions.length > 0
      ? `Permessi:\n${permissions.map((p) => `  · ${p}`).join("\n")}\n`
      : "Nessun permesso di moderazione.\n"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
