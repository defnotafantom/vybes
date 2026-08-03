import type { DefaultSession } from "next-auth";

/**
 * Cosa porta la sessione, e cosa no.
 *
 * `Session["user"]` non ha lo slug, ed è deliberato: un token è una
 * fotografia scritta all'accesso, e lo slug di un profilo può cambiare
 * (`npm run user:slug`). Leggerlo da qui produceva collegamenti a pagine 404
 * e — più insidioso — `revalidatePath` sull'indirizzo sbagliato, che lascia
 * la pagina vera in cache senza segnalare niente. Si legge da `slugDi()`.
 *
 * Resta invece su `User` e su `JWT`, perché lì serve durante l'accesso: il
 * callback `signIn` crea il profilo di chi arriva da Google e ne calcola lo
 * slug, e quel valore deve poter viaggiare fino alla creazione. Quello che
 * non deve fare è **sopravvivere** alla sessione.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    slug?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
