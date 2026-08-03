import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Almeno 10 caratteri")
  .regex(/[a-z]/, "Serve almeno una lettera minuscola")
  .regex(/[A-Z]/, "Serve almeno una lettera maiuscola")
  .regex(/[0-9]/, "Serve almeno un numero");

export const registerSchema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(60),
  email: z.string().email("Email non valida").transform((v) => v.toLowerCase()),
  password: passwordSchema,
  role: z.enum(["ARTIST", "RECRUITER"]).default("ARTIST"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Inserisci la password"),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(60),
  image: z.string().optional().or(z.literal("")),
  cover: z.string().optional().or(z.literal("")),
  headline: z.string().max(120).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  disciplines: z.array(z.string()).max(5).default([]),
  citySlug: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  spotify: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

export const postSchema = z.object({
  content: z.string().min(1, "Il post e' vuoto").max(3000),
  type: z.enum(["STANDARD", "COLLABORATION", "ANNOUNCEMENT"]).default("STANDARD"),
  tags: z.array(z.string().max(30)).max(6).default([]),
  mediaUrl: z.string().optional().or(z.literal("")),
  mediaType: z.enum(["image", "video", "audio"]).optional(),
  collaborationArtists: z.array(z.string()).max(10).default([]),
});

/**
 * Descrizione minima di un annuncio.
 *
 * Esportata perché il modulo conta quanto manca mentre si scrive: era un `30`
 * scritto nello schema e un «Minimo 30 caratteri» scritto nel JSX, cioè due
 * copie della stessa regola in due file — e la seconda non contava niente,
 * lasciando scoprire di non averlo raggiunto solo premendo «Pubblica».
 */
export const MIN_DESCRIZIONE_INGAGGIO = 30;

export const eventSchema = z
  .object({
    title: z.string().min(4, "Titolo troppo corto").max(120),
    description: z
      .string()
      .min(
        MIN_DESCRIZIONE_INGAGGIO,
        `Descrivi l'ingaggio in almeno ${MIN_DESCRIZIONE_INGAGGIO} caratteri`
      )
      .max(5000),
    category: z.enum(["LIVE", "CASTING", "WORKSHOP", "CONTEST", "JAM"]).default("LIVE"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional().nullable(),
    venueName: z.string().max(120).optional().or(z.literal("")),
    address: z.string().max(200).optional().or(z.literal("")),
    citySlug: z.string().min(1, "Seleziona una citta'"),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    isPaid: z.boolean().default(false),
    feeMin: z.coerce.number().int().min(0).optional().nullable(),
    feeMax: z.coerce.number().int().min(0).optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional().nullable(),
    coverImage: z.string().optional().or(z.literal("")),
  })
  .refine((d) => !d.endsAt || d.endsAt >= d.startsAt, {
    message: "La fine non puo' precedere l'inizio",
    path: ["endsAt"],
  })
  .refine((d) => !d.isPaid || (d.feeMin ?? 0) > 0, {
    message: "Indica il compenso minimo",
    path: ["feeMin"],
  });

/**
 * Un annuncio nuovo deve avere una data futura.
 *
 * ── Cosa succedeva senza ──
 *
 * Niente, apparentemente: il modulo accettava, l'API rispondeva 201, la
 * pagina dell'ingaggio si apriva. Ma `/eventi`, `/citta/…/eventi` e la mappa
 * filtrano tutte per `startsAt >= adesso`, quindi l'annuncio **non compariva
 * da nessuna parte**. Chi lo pubblica non ha modo di accorgersene: ha visto
 * la conferma, ha visto la sua pagina, e aspetta candidature che non
 * arriveranno.
 *
 * È il difetto peggiore di questa categoria — non un errore che si vede, ma
 * un successo che non è successo. Ed è già capitato: in produzione c'è un
 * ingaggio datato 3 marzo 2024.
 *
 * ── Perché è una regola a parte e non dentro `eventSchema` ──
 *
 * Perché la modifica usa lo stesso schema, e correggere un refuso nel titolo
 * di una serata dell'anno scorso deve restare possibile. Vietare la data
 * passata in assoluto renderebbe immodificabile tutto l'archivio: una
 * validazione che impedisce di sistemare i propri errori è peggio del
 * problema che risolve.
 *
 * Quindi: `eventNuovoSchema` per la creazione, `eventSchema` per la modifica.
 *
 * ── Perché esattamente «dopo adesso» ──
 *
 * Perché è alla lettera la condizione con cui la directory decide se
 * mostrarlo. Una soglia più generosa — «non prima di ieri» — rimetterebbe in
 * circolo annunci pubblicabili e invisibili, cioè il difetto di partenza in
 * versione più piccola. La promessa che questa regola mantiene è una sola: se
 * la pubblichi, si vede.
 */
export const eventNuovoSchema = eventSchema.refine((d) => d.startsAt > new Date(), {
  message: "La data è già passata: un annuncio con data passata non compare in nessun elenco.",
  path: ["startsAt"],
});

export const portfolioSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  mediaUrl: z.string().min(1, "Carica un file"),
  mediaType: z.enum(["image", "video", "audio"]).default("image"),
  externalUrl: z.string().url().optional().or(z.literal("")),
  year: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
});

export const participationSchema = z.object({
  message: z.string().max(1000).optional().or(z.literal("")),
});
export const participationDecisionSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida").transform((v) => v.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const resendVerificationSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase()),
});

export const commentSchema = z.object({ content: z.string().min(1).max(1000) });
export const messageSchema = z.object({
  content: z.string().min(1).max(4000),
  mediaUrl: z.string().optional().or(z.literal("")),
});

export const searchSchema = z.object({
  q: z.string().min(2).max(80),
  type: z.enum(["all", "artists", "events", "posts", "portfolio"]).default("all"),
});

/** Rimuove tag HTML dal testo libero: difesa in profondita' contro XSS. */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}
