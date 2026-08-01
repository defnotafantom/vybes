import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailIsConfigured } from "@/lib/email";
import { uniqueSlug } from "@/lib/slug";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Errore tipizzato: Auth.js propaga il campo `code` al client, così il form
 * di login può distinguere "credenziali sbagliate" da "email non ancora
 * confermata" e mostrare l'azione giusta.
 */
export class EmailNonVerificataError extends CredentialsSignin {
  code = "email_non_verificata";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  /**
   * Sessione scorrevole: trenta giorni di durata, rinnovata al più una volta
   * al giorno. Chi usa il sito con regolarità non viene mai disconnesso; chi
   * sparisce per un mese sì, ed è il comportamento giusto per un cookie che
   * resta su un computer eventualmente condiviso.
   *
   * `updateAge` è esplicito anche se coincide con il valore predefinito:
   * senza, il rinnovo sembra un caso e non una scelta. A zero il cookie verrebbe
   * riscritto a ogni richiesta — un costo inutile e una scrittura in più su
   * ogni risposta.
   *
   * Se le sessioni cadono prima dei trenta giorni, la causa non è qui.
   * Le tre reali, in ordine di frequenza:
   *
   * 1. Il cookie spezzato in più parti e non riconosciuto dal middleware —
   *    difetto corretto in src/middleware.ts, vedi il commento lì.
   * 2. Un cambio di AUTH_SECRET: invalida tutte le sessioni in un colpo solo,
   *    ed è previsto dopo una rotazione delle credenziali.
   * 3. Un cambio di dominio. I cookie di `www.vybeshub.art` non vengono
   *    inviati a `vybeshub.art`: chi era autenticato prima dell'inversione del
   *    redirect si è ritrovato disconnesso una volta sola.
   */
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  pages: { signIn: "/accedi", error: "/accedi" },
  trustHost: true,
  providers: [
    // Google è opzionale: senza le due variabili il provider non viene
    // registrato e il bottone non compare, invece di dare errore a runtime.
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.password) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

        // La verifica email si pretende solo se le email si possono davvero
        // inviare: altrimenti si bloccherebbe l'accesso a tutti senza dare
        // modo di sbloccarsi.
        if (emailIsConfigured() && !user.emailVerified) {
          throw new EmailNonVerificataError();
        }
        if (!emailIsConfigured() && process.env.NODE_ENV === "production") {
          console.warn(
            "[auth] RESEND_API_KEY non configurata: la verifica email e' disattivata. " +
              "Configurala prima di aprire le registrazioni al pubblico."
          );
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? undefined,
          role: user.role,
          slug: user.slug,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Chi arriva da Google non passa dalla registrazione: l'account va creato
     * al primo accesso, con uno slug unico derivato dal nome.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;

      const existing = await prisma.user.findUnique({ where: { email: user.email } });
      if (existing) {
        if (!existing.emailVerified) {
          // Google ha già verificato l'indirizzo per noi.
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerified: new Date() },
          });
        }
        user.id = existing.id;
        user.role = existing.role;
        user.slug = existing.slug;
        return true;
      }

      const name = user.name?.trim() || user.email.split("@")[0];
      const slug = await uniqueSlug(name, async (s) =>
        Boolean(await prisma.user.findUnique({ where: { slug: s } }))
      );

      const created = await prisma.user.create({
        data: {
          email: user.email,
          name,
          slug,
          image: user.image ?? null,
          emailVerified: new Date(),
          role: "ARTIST",
        },
        select: { id: true, role: true, slug: true },
      });

      user.id = created.id;
      user.role = created.role;
      user.slug = created.slug;
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.slug = user.slug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Il JWT ha un index signature permissivo: si restringe qui.
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role = (token.role as string | undefined) ?? "ARTIST";
        session.user.slug = (token.slug as string | undefined) ?? "";
      }
      return session;
    },
  },
});

/** Ritorna la sessione o lancia: da usare nelle route API protette. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Response("Non autenticato", { status: 401 });
  return session.user;
}
