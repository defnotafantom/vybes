import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { artistJsonLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EventCard } from "@/components/EventCard";
import { fromCsv } from "@/lib/slug";
import { disciplineBySlug } from "@/lib/constants";
import { isProfileIndexable } from "@/lib/profile-quality";
import { FollowButton } from "@/components/FollowButton";
import { Avatar } from "@/components/ui/Avatar";
import { ConCornice, Titolo } from "@/components/Ornamenti";
import { indossatiDiSlug } from "@/lib/negozio";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { Segnala } from "@/components/Segnala";
import { concorda } from "@/lib/testo";
import { distintiviOttenuti } from "@/lib/distintivi";
import { fattiOrganizzatoreDi } from "@/lib/reputazione-server";
import { cerca } from "@/lib/ruolo";
import { SfondoLavoro } from "@/components/AnteprimaLavoro";
import { Distintivi } from "@/components/Distintivi";


export const revalidate = 3600;
export const dynamicParams = true; // i profili nuovi vengono generati on-demand

/**
 * Pre-genera i profili più consultati; il resto arriva via ISR.
 *
 * Solo quelli che superano la soglia di qualità: pre-generare una pagina
 * significa pagarla in tempo di build su ogni rilascio, e un profilo vuoto
 * non ripaga quel costo — non è indicizzabile e quasi nessuno lo apre. Resta
 * comunque raggiungibile, generato su richiesta al primo accesso.
 */
export async function generateStaticParams() {
  const top = await prisma.user.findMany({
    where: ARTISTA_PUBBLICO,
    orderBy: { reputation: "desc" },
    take: 200,
    select: {
      slug: true,
      bio: true,
      disciplines: true,
      _count: { select: { portfolioItems: { where: { isPublic: true } } } },
    },
  });

  return top
    .filter((u) =>
      isProfileIndexable({
        bio: u.bio,
        disciplines: u.disciplines,
        portfolioCount: u._count.portfolioItems,
      })
    )
    .map((u) => ({ slug: u.slug }));
}

/**
 * La pagina resta raggiungibile anche con l'email non ancora confermata —
 * chi si è appena iscritto deve poter vedere il proprio profilo mentre aspetta
 * il messaggio — ma non compare in nessun elenco e non entra nell'indice.
 * Restituire 404 a chi ha appena finito la registrazione sarebbe punire la
 * persona sbagliata per un problema di posta.
 */
async function getArtist(slug: string) {
  return prisma.user.findFirst({
    where: { slug, isPublic: true },
    select: {
      emailVerified: true,
      id: true, slug: true, name: true, headline: true, bio: true, image: true, cover: true,
      city: true, citySlug: true, region: true, disciplines: true, website: true,
      instagram: true, spotify: true, youtube: true, level: true, experience: true,
      reputation: true, isVerified: true, role: true, createdAt: true, updatedAt: true,
      portfolioItems: {
        where: { isPublic: true },
        orderBy: { position: "asc" },
        take: 12,
        select: { slug: true, title: true, mediaUrl: true, mediaType: true, year: true },
      },
      eventsCreated: {
        where: { isPublic: true, status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: {
          slug: true, title: true, description: true, coverImage: true, category: true,
          startsAt: true, city: true, venueName: true, isPaid: true, feeMin: true, feeMax: true,
        },
      },
      // I conteggi dei distintivi sono filtrati come in `reputazione-server`:
      // «candidature» e «candidature accettate» sono due numeri diversi, e il
      // secondo è l'unico che significhi qualcosa per chi legge il profilo —
      // l'ha assegnato qualcun altro. `eventsCreated` conta solo i conclusi,
      // perché pubblicare un annuncio non è organizzare una serata.
      _count: {
        select: {
          followers: true,
          posts: true,
          participations: { where: { status: "ACCEPTED" } },
          eventsCreated: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) return buildMetadata({ title: "Profilo non trovato", path: `/artisti/${slug}`, noindex: true });

  const disciplines = fromCsv(artist.disciplines)
    .map((d) => disciplineBySlug(d)?.label ?? d)
    .join(", ");
  const place = artist.city ? ` a ${artist.city}` : " in Italia";

  return buildMetadata({
    title: `${artist.name} — ${disciplines || "Artista"}${place}`,
    description:
      artist.headline ||
      artist.bio ||
      `${artist.name}: profilo, portfolio e disponibilità per ingaggi${place}. Contatta direttamente l'artista su Vybes.`,
    path: `/artisti/${artist.slug}`,
    type: "profile",
    modifiedTime: artist.updatedAt,
    images: [{ url: absoluteUrl(`/artisti/${artist.slug}/opengraph-image`), alt: artist.name }],
    // Escluderlo dalla sitemap non basta: la sitemap è un suggerimento, e
    // Google arriva comunque dai link interni — dall'elenco degli artisti,
    // dalle pagine di città. Il noindex sulla pagina è l'unica istruzione
    // vincolante. Restano `follow`, così i link in uscita continuano a
    // trasmettere valore: il profilo è povero, non ostile.
    noindex:
      // Email non confermata: il profilo non è ancora una presenza reale, e
      // con le registrazioni aperte indicizzarlo significherebbe regalare una
      // pagina su un dominio vero a chiunque abbia un indirizzo usa e getta.
      !artist.emailVerified ||
      !isProfileIndexable({
        bio: artist.bio,
        disciplines: artist.disciplines,
        portfolioCount: artist.portfolioItems.length,
      }),
  });
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = await getArtist(slug);
  if (!artist) notFound();

  // Cosa indossa: una lettura in piu' su una pagina rigenerata ogni ora, e
  // solo per gli ornamenti — se non ha comprato niente la mappa e' vuota e non
  // si disegna nulla.
  const ornamenti = await indossatiDiSlug(slug);

  const disciplines = fromCsv(artist.disciplines);
  /** «Cantante e musicista», per una frase — non per un elenco di etichette. */
  const disciplineLeggibili = disciplines
    .map((d) => (disciplineBySlug(d)?.label ?? d).toLowerCase())
    .join(" e ");
  const sameAs = [artist.website, artist.instagram, artist.spotify, artist.youtube].filter(
    (v): v is string => Boolean(v)
  );

  /*
   * I distintivi: cosa questa persona ha dimostrato.
   *
   * Stanno nell'intestazione, sotto il nome, e non in fondo alla colonna
   * laterale — perché sono la risposta alle domande che un organizzatore si
   * fa **prima** di decidere se continuare a leggere, non un riepilogo per
   * chi è già arrivato in fondo. Vedi `lib/distintivi.ts`.
   */
  //
  // I fatti dell'organizzatore si leggono solo se lo è: per un artista sono
  // cinque conteggi che valgono sempre zero e non entrano in nessuno dei suoi
  // distintivi, su una pagina che è la più visitata del sito.
  const org = cerca(artist.role)
    ? await fattiOrganizzatoreDi(artist.id)
    : {
        candidatureRicevute: 0,
        candidatureRisposte: 0,
        annunciPubblicati: 0,
        annunciRetribuiti: 0,
        artistiScelti: 0,
      };

  const distintivi = distintiviOttenuti(
    {
      isVerified: artist.isVerified,
      createdAt: artist.createdAt,
      ingaggiConfermati: artist._count.participations,
      ingaggiOrganizzati: artist._count.eventsCreated,
      portfolio: artist.portfolioItems.length,
      raggiungibile: Boolean(artist.citySlug) && disciplines.length > 0,
      ...org,
    },
    artist.role
  );

  return (
    <>
      <JsonLd
        data={artistJsonLd({
          name: artist.name,
          slug: artist.slug,
          headline: artist.headline,
          bio: artist.bio,
          image: artist.image,
          city: artist.city,
          region: artist.region,
          disciplines: disciplines.map((d) => disciplineBySlug(d)?.label ?? d),
          sameAs,
          isBand: disciplines.includes("band"),
        })}
      />

      {/* ─────────────────────────── INTESTAZIONE ─────────────────────────── */}
      <header className="relative isolate overflow-hidden border-b">
        <div className="mesh-hero opacity-50" aria-hidden="true" />

        <div className="container-page pb-12 pt-8">
          <Breadcrumbs
            items={[
              { name: "Artisti", path: "/artisti" },
              ...(artist.citySlug && artist.city
                ? [{ name: artist.city, path: `/citta/${artist.citySlug}/artisti` }]
                : []),
              { name: artist.name, path: `/artisti/${artist.slug}` },
            ]}
          />

          {/* `items-end` allineava il fondo dell'avatar al fondo dei pulsanti.
              Su un profilo pieno il blocco di testo è alto il doppio
              dell'avatar, quindi la faccia della persona — la cosa più
              importante di questa pagina — finiva relegata in basso a
              sinistra, centosessanta pixel sotto il proprio nome, e sembrava
              staccata dal resto. Peggiorava man mano che il profilo si
              riempiva, cioè esattamente al contrario di quello che serve.
              `items-start` non dipende da quanto contenuto c'è. */}
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
            {/* La cornice circonda la foto, non la sostituisce: chi guarda
                questa pagina deve vedere una faccia prima di tutto, e un
                ornamento comprato che prendesse quel posto lavorerebbe contro
                lo scopo della pagina. Vedi `Ornamenti.tsx` e ADR-047. */}
            <ConCornice cornice={ornamenti.cornice}>
              <Avatar name={artist.name} src={artist.image} size="xl" rounded="xl" priority />
            </ConCornice>

            <div className="min-w-0 flex-1">
              {disciplines.length > 0 && (
                <p className="eyebrow">
                  {disciplines.map((d) => disciplineBySlug(d)?.label ?? d).join(" · ")}
                </p>
              )}

              <h1 className="mt-3 flex flex-wrap items-center gap-3 text-fluid-3xl">
                {artist.name}
                {artist.isVerified && (
                  <Badge tone="brand" className="text-fluid-xs">
                    <VerifiedBadge />
                    Verificato
                  </Badge>
                )}
              </h1>

              {/* Sotto il nome e visibilmente diverso da un distintivo: quelli
                  affermano un fatto verificato, questo è un ornamento. Renderli
                  simili svaluterebbe i primi. */}
              <Titolo titolo={ornamenti.titolo} />

              {artist.headline && (
                <p className="mt-4 max-w-2xl text-fluid-base leading-relaxed text-ink-muted">
                  {artist.headline}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {disciplines.map((d) => (
                  <Link key={d} href={`/artisti?disciplina=${d}`} className="chip">
                    {disciplineBySlug(d)?.label ?? d}
                  </Link>
                ))}
                {artist.city && artist.citySlug && (
                  <Link href={`/citta/${artist.citySlug}`} className="chip-accent">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {artist.city}
                  </Link>
                )}
              </div>

              {distintivi.length > 0 && (
                <div className="mt-5">
                  <Distintivi distintivi={distintivi} />
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/dashboard/messaggi/nuovo?a=${artist.slug}`} className="btn-primary">
                  Contatta {artist.name.split(" ")[0]}
                </Link>
                <FollowButton slug={artist.slug} initialCount={artist._count.followers} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────── NUMERI ─────────────────────────── */}
      <section className="border-b bg-surface-sunken">
        {/* Qui c'era «Reputazione 234», un numero senza scala accanto a un
            livello che sembrava confrontabile e non lo è. Un visitatore non ha
            modo di sapere se 234 sia molto: la reputazione ha un massimo, e
            mostrarlo è quello che rende il numero un'informazione.

            Il livello invece è sparito da questa pagina: misura quanto una
            persona usa il sito, che non è un dato di cui un organizzatore
            debba tener conto per decidere se scriverle. */}
        {/* Tre colonne su 320px darebbero a «Ingaggi confermati» una
            colonna da 90px: l'etichetta va a capo tre volte e il numero
            perde la propria riga. Sotto sm si impilano. */}
        {/* ── Perché la reputazione non compare più qui ──
            Non perché sia un segreto: è spiegata voce per voce a chi la
            possiede, nella propria area personale, e continua a decidere
            l'ordine della directory.

            Il problema è il denominatore. Trenta dei centodieci punti
            richiedono ingaggi confermati od organizzati, che su una
            piattaforma appena nata non esistono per nessuno: un artista con
            profilo completo, biografia lunga, cinque lavori e identità
            verificata arriva a ottanta, e senza la verifica a sessantacinque.
            Vuol dire che «53/110» non dice «questa persona vale poco» — dice
            «il sito è nuovo» — ma stampato accanto a un nome si legge nel
            primo modo.

            È già la ragione per cui il punteggio era stato tolto dalle schede
            in elenco; la stessa ragione vale, più forte, sulla pagina
            personale di qualcuno. Stiamo per chiedere a venti artisti veri di
            accettare questa pagina: un voto sotto la metà accanto al proprio
            nome è un ottimo motivo per dire di no.

            Al suo posto un fatto, non un giudizio: quanti lavori ci sono. */}
        <dl className="container-page grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-y-0">
          {/* Le etichette concordano col proprio numero.
              «1 LAVORI PUBBLICATI» è arrivato in produzione nello stesso
              rilascio in cui `conta()` e `concorda()` sono state introdotte
              proprio per impedirlo: scritte a mano, come stringhe fisse in un
              elenco, non passavano da nessuna delle due. Che è la prova
              migliore di quello che quell'ADR sostiene — finché concordare è
              una cosa da ricordarsi, prima o poi non la si ricorda.
              «Follower» resta invariato: in italiano non ha plurale. */}
          {[
            {
              label: concorda(
                artist.portfolioItems.length,
                "Lavoro pubblicato",
                "Lavori pubblicati"
              ),
              value: artist.portfolioItems.length,
            },
            {
              label: concorda(
                artist._count.participations,
                "Ingaggio confermato",
                "Ingaggi confermati"
              ),
              value: artist._count.participations,
            },
            { label: "Follower", value: artist._count.followers },
          ].map((s) => (
            <div key={s.label} className="py-6">
              {/* Il suffisso «/110» serviva solo alla reputazione, che qui non
                  compare più: tre numeri interi non hanno bisogno di scala. */}
              <dd className="text-fluid-2xl font-bold tabular-nums">{s.value}</dd>
              <dt className="mt-0.5 text-fluid-xs uppercase tracking-wider text-ink-faint">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="container-page py-16">
        {/* La colonna laterale compare solo se ha contenuto.
            Tolto «Cosa risulta a noi», su un profilo senza link esterni
            restava una colonna larga trecento pixel con dentro soltanto
            «Segnala questo profilo» — cioè un terzo di pagina occupato dalla
            cosa meno importante che ci sia. Quando non c'è niente da metterci,
            il contenuto prende tutta la larghezza e la segnalazione va in
            fondo, dove la trova chi la cerca. */}
        <div className={`grid gap-14 ${sameAs.length > 0 ? "lg:grid-cols-[1fr_300px]" : ""}`}>
          <article className="min-w-0 space-y-14">
            {/* ── Il caso in cui non c'è niente ──
                Tutte e tre le sezioni sotto sono condizionate, quindi un
                profilo senza biografia, senza lavori e senza ingaggi
                pubblicati rendeva una colonna **completamente vuota**: una
                voragine larga metà schermo con la barra laterale sospesa
                accanto. Non è un caso raro — è lo stato di ogni artista appena
                importato, e di chiunque si iscriva, cioè la prima impressione
                che il sito dà di sé.

                Non è nemmeno una pagina inutile: nome, disciplina e città ci
                sono, e sono ciò per cui qualcuno l'ha aperta. Manca il resto,
                e dirlo è più onesto che lasciare un buco — che chi legge
                interpreta come un errore del sito, non come un profilo nuovo. */}
            {!artist.bio &&
              artist.portfolioItems.length === 0 &&
              artist.eventsCreated.length === 0 && (
                <section className="card">
                  <h2 className="text-fluid-lg font-bold">Profilo appena aperto</h2>
                  <p className="mt-3 max-w-xl text-fluid-sm text-ink-muted">
                    {artist.name.split(" ")[0]} non ha ancora aggiunto una
                    presentazione né caricato lavori. Quello che sappiamo è qui
                    sopra
                    {artist.city ? `: ${disciplineLeggibili || "artista"} a ${artist.city}` : ""}.
                    Se è la persona che cerchi, scriverle è il modo più veloce
                    per sapere il resto.
                  </p>
                  <Link
                    href={`/dashboard/messaggi/nuovo?a=${artist.slug}`}
                    className="btn-ghost mt-5 inline-flex"
                  >
                    Contatta {artist.name.split(" ")[0]}
                  </Link>
                </section>
              )}

            {artist.bio && (
              <section>
                <p className="eyebrow">Il profilo</p>
                <h2 className="mt-2 text-fluid-xl">Chi è {artist.name}</h2>
                <div className="prose-vybes mt-6 max-w-2xl whitespace-pre-line text-ink-muted">
                  {artist.bio}
                </div>
              </section>
            )}

            {artist.portfolioItems.length > 0 && (
              <section>
                <p className="eyebrow">Lavori</p>
                <h2 className="mt-2 text-fluid-xl">Portfolio</h2>

                {/* Due colonne e non tre: il portfolio è la ragione per cui
                    qualcuno apre questa pagina, e le immagini grandi lo
                    dicono meglio di qualunque titolo. */}
                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                  {artist.portfolioItems.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/portfolio/${item.slug}`}
                        className="card-interactive group block overflow-hidden p-0"
                      >
                        {/* ── Cosa c'è sotto l'immagine, e perché ──
                            Prima non c'era niente: un riquadro 4:3 vuoto per
                            ogni lavoro che non sia una fotografia — un brano,
                            un video — cioè metà del portfolio di un musicista.
                            Ed è la stessa causa dei sette difetti trovati
                            nell'audit precedente: spazio riservato a immagini
                            che non ci sono.

                            Il segnaposto sta **dietro**, sempre presente, e
                            l'immagine gli si sovrappone. Così copre due casi
                            con una cosa sola: il tipo di file senza anteprima,
                            e l'immagine che non carica — un file rimosso dal
                            blob storage, un indirizzo sbagliato — dove prima
                            restava il rettangolo bianco del browser.

                            Nessun `onError`, che richiederebbe un componente
                            client: questa è la pagina su cui poggia tutta la
                            strategia di ricerca, e non vale idratarla per
                            gestire meglio un caso che così degrada comunque in
                            qualcosa di voluto. */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                          <SfondoLavoro tipo={item.mediaType} />
                          {item.mediaType === "image" && (
                            <Image
                              src={item.mediaUrl}
                              /* Alt vuoto, e non è una dimenticanza: il titolo
                                 del lavoro è scritto due centimetri sotto,
                                 dentro lo stesso collegamento. Ripeterlo
                                 nell'immagine lo farebbe leggere due volte di
                                 fila a chi usa uno screen reader — e su
                                 un'immagine che non carica lo fa comparire
                                 **scritto** sopra il segnaposto, che è come
                                 l'abbiamo scoperto. */
                              alt=""
                              fill
                              sizes="(max-width: 768px) 100vw, 40vw"
                              className="object-cover transition-transform duration-600 ease-out group-hover:scale-105"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-fluid-sm font-semibold transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                            {item.title}
                          </h3>
                          {item.year && (
                            <p className="mt-0.5 text-fluid-xs text-ink-faint">{item.year}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {artist.eventsCreated.length > 0 && (
              <section>
                <p className="eyebrow">Organizza</p>
                <h2 className="mt-2 text-fluid-xl">Ingaggi pubblicati da {artist.name}</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {artist.eventsCreated.map((e) => (
                    <EventCard key={e.slug} event={e} />
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* ─────────────────────────── COLONNA ─────────────────────────── */}
          <aside className="space-y-6">
            {/* ── Perché «Cosa risulta a noi» non c'è più ──

                Elencava le voci di reputazione già ottenute: «Indirizzo
                confermato», «Identità verificata», «Discipline dichiarate».
                Con i distintivi nell'intestazione la stessa informazione
                finiva sulla pagina **tre volte** — la spunta accanto al nome,
                il distintivo, e questo riquadro — e due di quelle tre erano
                sotto la piega, dove un organizzatore che sta decidendo se
                scrivere non arriva.

                I distintivi dicono le stesse cose in modo più leggibile e nel
                punto in cui servono. Questo riquadro nasceva quando quelli non
                c'erano: teneva un posto, e ora quel posto ha un inquilino
                migliore. */}
            {sameAs.length > 0 && (
              <div className="card">
                <p className="text-fluid-xs uppercase tracking-wider text-ink-faint">Altrove</p>
                <ul className="mt-3 space-y-2">
                  {sameAs.map((url) => (
                    <li key={url}>
                      {/* nofollow: sono link dichiarati dall'utente, non
                          raccomandazioni editoriali. Senza, il profilo
                          diventerebbe un bersaglio per lo spam di link. */}
                      <a
                        href={url}
                        rel="me noopener nofollow"
                        target="_blank"
                        className="link-underline inline-flex items-center gap-1.5 text-fluid-sm"
                      >
                        {new URL(url).hostname.replace("www.", "")}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* In fondo e in piccolo: trovabile da chi lo cerca, non
                proposto a chi non lo cerca. */}
            <div className="pt-2">
              <Segnala targetType="USER" targetId={artist.slug} etichetta="Segnala questo profilo" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
