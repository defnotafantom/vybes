import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";
import { guard, parseBody, ok, fail, handle } from "@/lib/api";
import { uniqueSlug } from "@/lib/slug";
import { progressQuest } from "@/lib/gamification";
import { sendVerificationEmail, emailIsConfigured } from "@/lib/email";
import { issueToken } from "@/lib/tokens";

export async function POST(req: Request) {
  return handle(async () => {
    // Limite stretto: la registrazione è il bersaglio preferito dei bot.
    const g = await guard(req, { scope: "register", limit: 5, requireAuth: false });
    if (g.error) return g.error;

    const { data, error } = await parseBody(req, registerSchema);
    if (error) return error;

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return fail("Esiste già un account con questa email", 409);

    const slug = await uniqueSlug(data.name, async (s) => Boolean(await prisma.user.findUnique({ where: { slug: s } })));
    const hashed = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        role: data.role,
        slug,
        // Senza provider email configurato l'account nasce già verificato:
        // altrimenti nessuno potrebbe completare la registrazione.
        emailVerified: emailIsConfigured() ? null : new Date(),
      },
      select: { id: true, email: true, slug: true, role: true },
    });

    const token = await issueToken(user.id, "EMAIL_VERIFY");

    await progressQuest(user.id, "welcome");
    await sendVerificationEmail(user.email, data.name, token);

    return ok(
      { id: user.id, slug: user.slug, role: user.role, verificationRequired: !user.emailVerified },
      { status: 201 }
    );
  });
}
