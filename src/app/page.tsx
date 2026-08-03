import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { SITE, DISCIPLINES } from "@/lib/constants";
import { JsonLd } from "@/components/JsonLd";
import { faqJsonLd } from "@/lib/jsonld";
import { ArtistCard } from "@/components/ArtistCard";
import { EventCard } from "@/components/EventCard";
import { Spotlight } from "@/components/Spotlight";
import { BrandHero } from "@/components/BrandHero";
import { Avatar } from "@/components/ui/Avatar";
import { fromCsv } from "@/lib/slug";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { inVetrina, giornoDi } from "@/lib/vetrina";

// Rigenerata ogni 10 minuti: HTML statico servito dalla CDN, dati freschi.
/**
 * Sotto quanti artisti il numero è un argomento contro di noi.
 *
 * Venti è la stessa soglia di RECLUTAMENTO.md: è il punto in cui chi cerca a
 * Milano trova abbastanza da tornare. Prima di allora il conteggio si tace, e
 * si dice invece la copertura geografica.
 */
const SOGLIA_VANTO = 20;

/*
 * Dieci minuti, non ventiquattro ore.
 *
 * La vetrina ruota una volta al giorno, quindi in teoria basterebbe
 * rigenerare a mezzanotte. Ma questa pagina mostra anche i prossimi ingaggi e
 * i conteggi, che cambiano quando qualcuno pubblica: una cache giornaliera
 * farebbe apparire un annuncio nuovo in home il giorno dopo.
 *
 * Dieci minuti servono la parte che cambia spesso; la rotazione, che dipende
 * solo dalla data, resta identica per tutte le rigenerazioni dello stesso
 * giorno — quindi non costa niente.
 */
export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    "Trova artisti in tutta Italia o pubblica un ingaggio in due minuti. Musicisti, DJ, band, ballerini e performer con portfolio e disponibilità.",
  path: "/",
  keywords: [
    "trovare artisti",
    "ingaggiare musicisti",
    "casting artisti Italia",
    "musica dal vivo locali",
    "piattaforma artisti",
  ],
});

const FAQ = [
  {
    q: "Quanto costa usare Vybes?",
    a: "Creare il profilo, pubblicare il portfolio e candidarsi agli ingaggi è gratuito per gli artisti. Gli organizzatori pubblicano annunci senza commissioni sul cachet.",
  },
  {
    q: "Come faccio a trovare artisti nella mia città?",
    a: "Usa la directory locale: ogni città ha una pagina dedicata con i profili attivi in zona, filtrabili per disciplina, e la mappa degli ingaggi aperti nel raggio scelto.",
  },
  {
    q: "Chi può pubblicare un ingaggio?",
    a: "Locali, agenzie, festival e organizzatori registrati come recruiter. Ogni annuncio indica data, luogo, compenso e numero di posti.",
  },
  {
    q: "I profili sono verificati?",
    a: "Ogni account richiede la verifica dell'email. I profili con portfolio completo e ingaggi conclusi ottengono il badge verificato.",
  },
];

export default async function HomePage() {
  const [featuredArtists, upcomingEvents, stats, cities] = await Promise.all([
    /*
     * ── Perché non più «i sei con la reputazione più alta» ──
     *
     * Sembra meritocratico e come incentivo è morto: i primi sei sono sempre
     * gli stessi, chi è settimo non ci arriverà mai, e chi è primo non ha
     * motivo di fare altro. Una classifica premia una volta e poi smette di
     * chiedere qualcosa.
     *
     * Ora si prendono tutti quelli che superano la soglia — profilo pubblico,
     * indirizzo confermato — e la vetrina ruota fra loro un giorno alla volta
     * (`lib/vetrina.ts`). L'ordine è per data d'iscrizione perché deve essere
     * **stabile**: ordinare per reputazione farebbe saltare il turno a
     * qualcuno ogni volta che un numero cambia, senza che nessuno l'abbia
     * deciso.
     *
     * Il limite a duecento è una difesa sul costo della query, non sulla
     * regola: sopra quel numero il turno arriverebbe comunque una volta ogni
     * sette mesi, e a quel punto la vetrina andrà ripensata per città.
     */
    prisma.user.findMany({
      where: ARTISTA_PUBBLICO,
      orderBy: { createdAt: "asc" },
      take: 200,
      select: {
        slug: true,
        name: true,
        headline: true,
        image: true,
        city: true,
        disciplines: true,
        reputation: true,
        isVerified: true,
      },
    }),
    prisma.event.findMany({
      where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 3,
      select: {
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        category: true,
        startsAt: true,
        city: true,
        venueName: true,
        isPaid: true,
        feeMin: true,
        feeMax: true,
      },
    }),
    Promise.all([
      prisma.user.count({ where: ARTISTA_PUBBLICO }),
      prisma.event.count({ where: { isPublic: true, status: "PUBLISHED" } }),
      prisma.city.count(),
    ]),
    prisma.city.findMany({
      orderBy: { population: "desc" },
      select: { slug: true, name: true },
    }),
  ]);

  const [artistCount, eventCount, cityCount] = stats;
  /*
   * Sei posti, e la finestra avanza di uno al giorno: chi torna domani trova
   * cinque volti conosciuti e uno nuovo. Cambiare tutto ogni giorno farebbe
   * sembrare un'altra pagina; non cambiare niente toglie il motivo di tornare.
   */
  const vetrina = inVetrina(featuredArtists, 6, giornoDi());
  const hero = vetrina[0];
  const rest = vetrina.slice(1);

  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <Spotlight className="relative isolate overflow-hidden">
        <div className="mesh-hero" aria-hidden="true" />
        <div className="grid-lines absolute inset-0 -z-10" aria-hidden="true" />

        {/* Il riempimento verticale era py-24 e cresceva fino a py-40 sui
            monitor grandi. Sommato al marchio, spingeva titolo e pulsanti sotto
            la piega: su un portatile la prima schermata mostrava il logo e
            metà di una frase. Un sito che deve convincere in tre secondi non
            può usarli tutti per presentarsi.

            Adesso il riempimento *si riduce* al crescere della finestra invece
            di crescere: su uno schermo alto lo spazio ce l'hai già. */}
        <div className="container-page flex flex-col items-center py-14 text-center sm:py-16 lg:py-20">
          <BrandHero />

          {/* Il contatore compare solo quando è un argomento.
              «7 artisti» scritto nel punto più visibile della pagina non
              informa: comunica che il sito è vuoto, e lo fa prima che il
              visitatore abbia letto cosa fa. Sotto la soglia si mostrano le
              città coperte, che sono venti da subito e dicono la stessa cosa
              — dove siamo — senza dichiarare la propria debolezza.

              Non è nascondere un dato: il numero esatto è in cima a /artisti,
              che è la pagina di chi quel dato lo sta cercando davvero. */}
          <p className="eyebrow mt-8 animate-fade-up [animation-delay:400ms]">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
            {artistCount >= SOGLIA_VANTO
              ? `${artistCount} artisti · ${cityCount} città`
              : `${cityCount} città in tutta Italia`}
          </p>

          <h1 className="mt-5 max-w-4xl animate-fade-up text-fluid-hero [animation-delay:480ms]">
            Trova artisti.
            <br />
            Trova ingaggi.
            <br />
            {/* nowrap solo da tablet in su: sotto i 640px la riga
                sfonderebbe la larghezza dello schermo */}
            <span className="text-gradient sm:whitespace-nowrap">Senza intermediari.</span>
          </h1>

          <p className="mt-6 max-w-xl animate-fade-up text-fluid-lg text-ink-muted [animation-delay:560ms]">
            Vybes collega musicisti, DJ, band, ballerini e performer con i locali, i festival e
            le agenzie che li cercano.
          </p>

          <div className="mt-8 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:640ms]">
            <Link
              href="/registrati?ruolo=artista"
              className="btn-primary px-7 py-3.5 text-fluid-base"
            >
              Sono un artista
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/registrati?ruolo=recruiter"
              className="btn-ghost px-7 py-3.5 text-fluid-base"
            >
              Cerco artisti
            </Link>
          </div>
        </div>
      </Spotlight>

      {/* ═══════════════════ NASTRO DELLE CITTÀ ═══════════════════ */}
      {cities.length > 0 && (
        <section className="border-y py-5" aria-label="Città coperte">
          <div className="marquee">
            {/* Due copie identiche: quando la prima esce, la seconda è già in
                posizione e il ciclo non ha stacchi. */}
            {[0, 1].map((copy) => (
              <div key={copy} className="marquee__track" aria-hidden={copy === 1}>
                {cities.map((c) => (
                  <Link
                    key={`${copy}-${c.slug}`}
                    href={`/citta/${c.slug}`}
                    className="whitespace-nowrap text-fluid-lg font-semibold text-ink-faint transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {c.name}
                    <span className="ml-8 text-brand-500/40">✦</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════ GRIGLIA BENTO ═══════════════════════ */}
      <section className="container-page py-24">
        <div className="reveal">
          <p className="eyebrow">Chi c&apos;è</p>
          <h2 className="mt-2 text-fluid-2xl">Artisti in evidenza</h2>
        </div>

        <div className="bento reveal-scale mt-10">
          {/* Cella grande: il profilo con la reputazione più alta */}
          {hero && (
            <Link
              href={`/artisti/${hero.slug}`}
              className="border-glow card-interactive bento__hero group flex flex-col overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <Avatar name={hero.name} src={hero.image} size="lg" priority />
                <span className="chip-accent">Più seguito</span>
              </div>

              <div className="mt-5">
                <h3 className="text-fluid-xl transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {hero.name}
                </h3>
                {hero.headline && (
                  <p className="mt-2 line-clamp-2 text-fluid-sm text-ink-muted">{hero.headline}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {fromCsv(hero.disciplines)
                    .slice(0, 3)
                    .map((d) => (
                      <span key={d} className="chip">
                        {d}
                      </span>
                    ))}
                </div>
              </div>
            </Link>
          )}

          {/* Tessere numeriche */}
          {[
            { value: artistCount, label: "Artisti iscritti" },
            { value: eventCount, label: "Ingaggi aperti" },
          ].map((s) => (
            <div key={s.label} className="card flex flex-col justify-end">
              <p className="text-gradient text-fluid-3xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-1 text-fluid-xs uppercase tracking-wider text-ink-faint">
                {s.label}
              </p>
            </div>
          ))}

          {/* Profili restanti */}
          {rest.slice(0, 2).map((a) => (
            <ArtistCard key={a.slug} artist={{ ...a, disciplines: fromCsv(a.disciplines) }} />
          ))}

          {/* Largo una colonna, non due: dentro c'è una riga di testo, e su
              due colonne diventava un rettangolo quasi vuoto più grande delle
              schede degli artisti — cioè l'invito pesava più di ciò a cui
              invita. */}
          <Link
            href="/artisti"
            className="border-glow card-interactive group flex items-center justify-between gap-3"
          >
            <span className="text-fluid-base font-semibold">Vedi tutti gli artisti</span>
            <ArrowRight
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════ INGAGGI ═══════════════════════ */}
      {upcomingEvents.length > 0 && (
        <section className="border-y bg-surface-sunken py-24">
          <div className="container-page">
            <div className="reveal mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Opportunità</p>
                <h2 className="mt-2 text-fluid-2xl">Prossimi ingaggi</h2>
              </div>
              <Link href="/eventi" className="link-underline text-fluid-sm">
                Tutti gli ingaggi
              </Link>
            </div>

            <div className="reveal-scale grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((e) => (
                <EventCard key={e.slug} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═════════ DISCIPLINE — hub di link per la long tail ═════════ */}
      <section className="container-page py-24">
        <div className="reveal">
          <p className="eyebrow">Per disciplina</p>
          <h2 className="mt-2 text-fluid-2xl">Cosa stai cercando</h2>
        </div>

        <ul className="reveal mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DISCIPLINES.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/artisti?disciplina=${d.slug}`}
                className="border-glow group flex items-center justify-between rounded-xl border px-4 py-3.5 text-fluid-sm font-medium transition-all hover:-translate-y-0.5"
              >
                {d.plural}
                <ArrowRight
                  className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section className="container-narrow py-24">
        <div className="reveal">
          <p className="eyebrow">Domande frequenti</p>
          <h2 className="mt-2 text-fluid-2xl">Prima che tu lo chieda</h2>
        </div>

        <div className="reveal mt-10 divide-y border-y">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-fluid-base font-semibold transition-colors marker:hidden group-hover:text-brand-600 dark:group-hover:text-brand-400">
                {f.q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-fluid-xl font-light text-ink-faint transition-transform duration-250 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-fluid-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ CHIUSURA ═══════════════════════ */}
      <section className="container-page pb-24">
        <Spotlight className="reveal-scale relative isolate overflow-hidden rounded-3xl border px-8 py-20 text-center sm:px-16">
          <div className="mesh-hero opacity-70" aria-hidden="true" />
          <h2 className="text-fluid-3xl">
            Il tuo prossimo <span className="text-gradient">palco</span> ti sta cercando
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-fluid-base text-ink-muted">
            Bastano due minuti per creare il profilo. Il portfolio lo costruisci con calma.
          </p>
          <Link
            href="/registrati?ruolo=artista"
            className="btn-primary mt-9 px-8 py-3.5 text-fluid-base"
          >
            Inizia gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Spotlight>
      </section>
    </>
  );
}
