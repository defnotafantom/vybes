import { prisma } from "../src/lib/prisma";
import { cleanupPendingUploads } from "../src/lib/upload-cleanup";

// Operazione sullo storage reale: eseguire solo nell'ambiente scelto dal gestore.
async function main() {
  const result = await cleanupPendingUploads();
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
}
main().catch(() => {
  console.error("Pulizia upload non riuscita; le richieste restano in coda.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
