import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { emailIsConfigured } from "@/lib/email";
import { uniqueSlug } from "@/lib/slug";

/**
 * Lo schema del login vive in `validations.ts`, insieme a tutti gli altri.
 *
 * ── Perché non ne aveva uno suo ──
 *
 * Ce l'aveva, e i numeri non tornavano: qui si pretendevano **otto**
 * caratteri, la registrazione ne pretende **dieci**, e `loginSchema` — mai
 * usato da nessuno — ne pretendeva **uno**. Tre regole per lo stesso campo,
 * nessuna delle quali sapeva delle altre.
 *
 * Vince quella da uno, e non per pigrizia: **la lunghezza minima appartiene
 * alla registrazione, non all'autenticazione.** Pretenderla qui non aggiunge
 * niente — la password viene comunque confrontata con bcrypt — e può solo
 * chiudere fuori un account la cui password è più vecchia della regola,
 * restituendogli «credenziali non valide»: un messaggio indistinguibile da
 * quello di chi ha davvero sbagliato, quindi impossibile da diagnosticare per
 * chi lo riceve e per chi lo assiste.
 */

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
   * La sessione finisce quando lo si chiede, non da sola.
   *
   * Un anno di durata, rinnovata a ogni giorno di utilizzo: chi usa il sito
   * anche solo una volta ogni tanto non viene mai disconnesso, e per uscire
   * c'è il pulsante nel menu laterale.
   *
   * ── Il compromesso, detto per intero ──
   *
   * Una sessione lunga è comoda e meno sicura: un cookie rubato resta valido
   * a lungo, e su un computer condiviso chi si dimentica di uscire lascia
   * l'account aperto a chi arriva dopo. Con sessioni brevi il tempo lavora per
   * te; qui no.
   *
   * La scelta si regge su tre cose. Il cookie è `httpOnly` e `Secure`, quindi
   * non è leggibile da JavaScript e non viaggia in chiaro. Il ruolo di
   * moderazione non sta nel token ma si legge dal database a ogni verifica
   * (ADR-020), quindi una revoca ha effetto subito anche su una sessione
   * vecchia. E qui non si muove denaro: il danno di un accesso indebito è un
   * profilo modificato, non un conto svuotato.
   *
   * Su un prodotto che gestisse pagamenti la risposta sarebbe l'opposto:
   * sessione breve e riautenticazione per le operazioni sensibili.
   *
   * `updateAge` a un giorno e non a zero: a zero il cookie verrebbe riscritto
   * a ogni singola richiesta, una scrittura in più su ogni risposta senza
   * nessun vantaggio.
   *
   * ── Se una sessione cade lo stesso ──
   *
   * La causa non è qui. Le tre reali, in ordine di frequenza:
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
    maxAge: 60 * 60 * 24 * 365,
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
        const parsed = loginSchema.safeParse(raw);
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

    /**
     * ── Perché lo slug non entra nel token ──
     *
     * Ci entrava, e da lì lo leggevano il collegamento «Profilo pubblico» e i
     * `revalidatePath` di tre route API. Un token è però una fotografia:
     * scritto all'accesso, immutato fino alla scadenza. Cambiando lo slug di
     * un profilo — cosa che `npm run user:slug` fa — il collegamento puntava a
     * un 404 e, peggio, si rigenerava la cache di una pagina che non esiste
     * più mentre quella vera restava vecchia, senza nessun errore.
     *
     * Lasciarcelo e ricordarsi di non usarlo sarebbe la solita regola che
     * niente applica. Tolto dal tipo, il compilatore rifiuta chi ci riprova:
     * si legge da `slugDi()`.
     *
     * `id` resta perché non cambia mai per definizione; `role` resta come
     * scorciatoia, ma dove una revoca deve avere effetto immediato viene
     * comunque riletto dal database — vedi il layout della dashboard.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Il JWT ha un index signature permissivo: si restringe qui.
        session.user.id = (token.id as string | undefined) ?? "";
        session.user.role = (token.role as string | undefined) ?? "ARTIST";
      }
      return session;
    },
  },
});

/** Ritorna la sessione o lancia: da usare nelle route API protette. */

