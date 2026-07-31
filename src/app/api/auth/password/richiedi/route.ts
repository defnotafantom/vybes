import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validations";
import { issueToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * Avvia il reset password.
 *
 * Risponde sempre 200 con lo stesso corpo, esista o meno l'account: una
 * risposta diversa trasformerebbe questo endpoint in un modo per scoprire
 * quali indirizzi sono registrati.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "password-forgot", limit: 5, requireAuth: false });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, forgotPasswordSchema);
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, password: true },
    });

    if (user?.password) {
      const token = await issueToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail(user.email, user.name, token);
    }

    return ok({ sent: true });
  });
}
