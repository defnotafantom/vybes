import { prisma } from "@/lib/prisma";
import { guard, parseBody, ok, handle } from "@/lib/api";
import { resendVerificationSchema } from "@/lib/validations";
import { issueToken } from "@/lib/tokens";
import { sendVerificationEmail, emailIsConfigured } from "@/lib/email";

/** Rinvia il link di verifica. */
export async function POST(req: Request) {
  return handle(async () => {
    const g = await guard(req, { scope: "verify-resend", limit: 5, requireAuth: false });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, resendVerificationSchema);
    if (error) return error;

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, emailVerified: true },
    });

    // Risposta identica in ogni caso: non si rivela quali email sono registrate.
    if (user && !user.emailVerified && emailIsConfigured()) {
      const token = await issueToken(user.id, "EMAIL_VERIFY");
      await sendVerificationEmail(user.email, user.name, token);
    }

    return ok({ sent: true });
  });
}
