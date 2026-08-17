import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArtistCard } from "@/components/ArtistCard";
import { ARTISTA_PUBBLICO } from "@/lib/visibilita";
import { DISCIPLINES } from "@/lib/constants";
import { arteDa } from "@/lib/arti";
import { fromCsv } from "@/lib/slug";

/**
 * La pagina di un'arte.
 *
 * ── Cosa cambia rispetto a `/artisti?disciplina=…` ──
 *
 * Un filtro risponde a «chi fa questa cosa». Questa pagina risponde prima a
 * «**cos'è** questa cosa», e solo dopo mostra chi la fa.
 *
 * Non è una sfumatura: chi arriva da un motore di ricerca cercando «cos'è la
 * pizzica» o «la danza contemporanea è uno sport» non sta cercando un elenco di
 * professionisti, e su un elenco se ne va. È il pubblico più numeroso che
 * questo progetto possa avere, ed è quello che oggi non trova niente.
 *
 * ── L'ordine, che ripete quello dell'incontro ──
 *
 * Prima il pregiudizio, poi la correzione, poi le forme, e per ultime le
 * persone. Chi arriva ha già un'idea: se le persone parlano per prime, le
 * guarda attraverso quell'idea.
 *
 * ── Perché la scheda dichiara il proprio stato ──
 *
 * Tutte e dieci le arti hanno adesso un testo, e tutte e dieci sono `bozza`:
 * scritte per avere il modello completo, non rilette da chi quelle arti le
 * pratica. La pagina lo dice.
 *
 * Un abbozzo che non dichiara di esserlo diventa definitivo per inerzia —
 * nessuno lo riscrive perché nessuno si accorge che andrebbe riscritto.
 *
 * Il ramo «scheda assente» resta comunque: aggiungere una disciplina a
 * `DISCIPLINES` senza scriverne la scheda dev'essere possibile, e la pagina
 * deve reggere dicendo che manca invece di mostrare sezioni vuote. Uno spazio
 * dichiarato vuoto è un invito; uno riempito di parole generiche è una bugia
 * che poi nessuno riscrive.
 *
 * ── E la soglia sull'indicizzazione ──
 *
 * Senza scheda **e** senza artisti, la pagina è un guscio: si serve lo stesso,
 * ma con `noindex`. Il progetto ha già una difesa contro le pagine sottili
 * nella sitemap (ADR sul thin content) e questa è la sua estensione — una
 * pagina vuota indicizzata abbassa il giudizio su tutte le altre.
 */

export async function generateStaticParams() {
  return DISCIPLINES.map((d) => ({ arte: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arte: string }>;
}): Promise<Metadata> {
  const { arte } = await params;
  const trovata = arteDa(arte);
  if (!trovata) return buildMetadata({ title: "Arte", path: `/arti/${arte}`, noindex: true });

  const { disciplina, scheda } = trovata;

  /*
   * Senza scheda **e** senza nessuno che la pratichi, la pagina è un guscio.
   *
   * Si serve lo stesso — l'indirizzo esiste, e chi ci arriva deve trovare
   * qualcosa invece di un 404 — ma non si chiede a Google di indicizzarla. Il
   * progetto ha già questa regola per i profili sottili nella sitemap: una
   * pagina vuota indicizzata non danneggia se stessa, abbassa il giudizio su
   * tutte le altre dello stesso sito.
   *
   * Il conteggio costa una query in più su una rotta rigenerata ogni ora, ed
   * è il prezzo per non dover ricordarsi a mano quali pagine sono pronte.
   */
  const quanti = await prisma.user.count({
    where: { ...ARTISTA_PUBBLICO, disciplines: { contains: disciplina.slug } },
  });
  const guscio = !scheda && quanti === 0;

  return buildMetadata({
    noindex: guscio,
    title: `${disciplina.plural}: cos'è davvero`,
    description:
      scheda?.invece.slice(0, 155) ??
      `${disciplina.plural} in Italia: chi la pratica, dove la si vede, e come ingaggiare chi la fa.`,
    path: `/arti/${arte}`,
    keywords: [
      `cos'è ${disciplina.plural.toLowerCase()}`,
      `${disciplina.plural.toLowerCase()} italia`,
      `ingaggiare ${disciplina.plural.toLowerCase()}`,
    ],
  });
}

/** Un'ora: la scheda cambia raramente, chi la pratica di continuo. */
export const revalidate = 3600;

export default async function ArtePage({ params }: { params: Promise<{ arte: string }> }) {
  const { arte } = await params;
  const trovata = arteDa(arte);
  if (!trovata) notFound();

  const { disciplina, scheda } = trovata;

  const [artisti, quanti] = await Promise.all([
    prisma.user.findMany({
      where: { ...ARTISTA_PUBBLICO, disciplines: { contains: disciplina.slug } },
      orderBy: { reputation: "desc" },
      take: 6,
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
    prisma.user.count({
      where: { ...ARTISTA_PUBBLICO, disciplines: { contains: disciplina.slug } },
    }),
  ]);

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { name: "Arti", path: "/arti" },
          { name: disciplina.plural, path: `/arti/${arte}` },
        ]}
      />

      {/* ── Il pregiudizio per primo ──
          Come nell'incontro: se la spiegazione parla prima, viene letta
          attraverso l'idea che chi legge ha già. */}
      <header className="max-w-3xl">
        <p className="eyebrow">Quello che si crede</p>
        <h1 className="mt-2 text-[clamp(1.8rem,5vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          {scheda ? `«${scheda.siCrede}»` : disciplina.plural}
        </h1>
        {scheda && (
          <p className="mt-6 text-fluid-lg text-ink-muted">{scheda.invece}</p>
        )}
      </header>

      {!scheda && (
        /* Dichiarare il vuoto invece di riempirlo. Chi legge capisce che il
           posto esiste e che il testo arriverà; con due paragrafi generici
           capirebbe che il sito parla senza avere niente da dire. */
        <div className="mt-8 max-w-3xl rounded-2xl border border-dashed p-6">
          <p className="font-semibold">La scheda di quest&apos;arte non è ancora scritta.</p>
          <p className="mt-2 text-fluid-sm muted">
            Intanto qui sotto c&apos;è la parte viva: chi la pratica adesso.
          </p>
        </div>
      )}

      {/* ── La bozza si dichiara ──

          Un abbozzo che non dice di esserlo diventa definitivo per inerzia:
          nessuno lo riscrive perché nessuno si accorge che andrebbe riscritto.
          Dichiararlo tiene aperta la revisione, e dice al lettore quanto può
          pretendere da quello che sta leggendo.

          Ed è anche un invito: chi quest'arte la pratica e legge una frase
          storta ha adesso un motivo per scrivere. */}
      {scheda?.stato === "bozza" && (
        <p className="mt-6 max-w-3xl rounded-xl border border-dashed px-4 py-3 text-fluid-sm muted">
          <strong className="text-ink">Bozza.</strong> Questo testo è un primo
          abbozzo e non è stato riletto da chi pratica quest&apos;arte. Se sei tu,{" "}
          <Link href="/registrati" className="underline underline-offset-4">
            scrivicelo
          </Link>
          .
        </p>
      )}

      {scheda && (
        <>
          {/* ── Le forme ──
              È la sezione che lavora di più contro il pregiudizio: uno
              stereotipo vive perché la parola richiama **una** immagine, e
              l'elenco la moltiplica. */}
          <section className="mt-14">
            <h2 className="text-fluid-xl font-bold">Non è una cosa sola</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scheda.forme.map((f) => (
                <li key={f.nome} className="rounded-2xl border p-5">
                  <h3 className="font-semibold">{f.nome}</h3>
                  <p className="mt-1.5 text-fluid-sm muted">{f.nota}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14 max-w-3xl">
            <h2 className="text-fluid-xl font-bold">Dove la si incontra</h2>
            <p className="mt-4 text-fluid-base muted">{scheda.doveVederla}</p>
          </section>
        </>
      )}

      {/* ── Le persone, per ultime ──
          Prima si incontra un'arte, poi chi la fa. Al contrario sarebbe una
          directory con un cappello introduttivo. */}
      <section className="mt-16">
        <h2 className="text-fluid-xl font-bold">
          Chi la fa {quanti > 0 && <span className="muted">({quanti})</span>}
        </h2>

        {artisti.length === 0 ? (
          <p className="mt-4 muted">
            Ancora nessuno su Vybes.{" "}
            <Link href="/registrati" className="underline underline-offset-4">
              Se la pratichi, comincia tu
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {artisti.map((a) => (
                // `fromCsv` qui e non nella query: le discipline stanno in
                // colonna come CSV — scelta vecchia, documentata altrove — e
                // la scheda le vuole già divise. Convertire nel punto d'uso
                // evita che il formato di archiviazione risalga fino al
                // componente.
                <ArtistCard
                  key={a.slug}
                  artist={{ ...a, disciplines: fromCsv(a.disciplines) }}
                />
              ))}
            </div>
            {quanti > artisti.length && (
              <p className="mt-6">
                <Link
                  href={`/artisti?disciplina=${disciplina.slug}`}
                  className="btn-ghost inline-flex"
                >
                  Vedi tutti
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </p>
            )}
          </>
        )}
      </section>

      <p className="mt-16 text-fluid-sm muted">
        <Link href="/incontra" className="underline underline-offset-4">
          Incontra un&apos;opera
        </Link>{" "}
        — una al giorno, scelta perché smentisce quello che credevi.
      </p>
    </div>
  );
}
