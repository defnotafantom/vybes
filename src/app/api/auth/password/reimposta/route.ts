import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validations";
import { verifyToken, consumeToken } from "@/lib/tokens";

export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "password-reset", limit: 10, requireAuth: false });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, resetPasswordSchema);
    if (error) return error;

    const check = await verifyToken(data.token, "PASSWORD_RESET");
    if (!check.ok) {
      return fail(
        check.reason === "expired"
          ? "Il link è scaduto: richiedine uno nuovo"
          : "Link non valido",
        410
      );
    }

    const hashed = await bcrypt.hash(data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: check.userId },
        // Chi arriva dal link ha dimostrato di controllare la casella:
        // se l'email non era ancora verificata, lo diventa adesso.
        data: { password: hashed, emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { userId: check.userId } }),
    ]);

    await consumeToken(check.tokenId);
    return ok({ reset: true });
  });
}
