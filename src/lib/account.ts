import { prisma } from "@/lib/prisma";
import { grantXp } from "@/lib/gamification";

/**
 * Marca l'account come verificato. Idempotente: aprire due volte lo stesso
 * link non assegna XP doppi.
 */
export async function confirmEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
  if (!user) return false;
  if (user.emailVerified) return true;

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  await grantXp(userId, 10);
  return true;
}
