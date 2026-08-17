import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { incontroDiOggi } from "@/lib/incontro-server";
import { giornoDi } from "@/lib/vetrina";
import { DISCIPLINES } from "@/lib/constants";

/**
 * L'incontro del giorno.
 *
 * ── A cosa serve questa pagina ──
 *
 * È l'asse dell'incontro di POSIZIONE.md, nella sua forma più piccola: **una
 * cosa al giorno, che non hai chiesto**, accanto alla frase che smentisce
 * quello che credevi di sapere.
 *
 * Non è una galleria e non deve diventarlo. Una galleria presuppone che tu
 * sappia già cosa cerchi; qui il presupposto è il contrario — che tu non
 * sappia nemmeno che questa cosa esiste.
 *
 * ── Perché pubblica, e non dentro la dashboard ──
 *
 * Perché è la sola parte del progetto che funziona **con un lato solo**. Un
 * mercato a due lati con zero utenti è morto: gli artisti non vengono perché
 * non ci sono ingaggi, gli organizzatori perché non ci sono artisti. L'incontro
 * ha bisogno soltanto di opere, quindi può essere utile, indicizzabile e
 * condivisibile mentre il mercato è ancora vuoto — e mentre lo fa, riempie il
 * lato dell'offerta.
 *
 * Metterla dietro l'accesso l'avrebbe resa inutile esattamente nella fase in
 * cui è più necessaria.
 *
 * ── L'ordine degli elementi, che non è impaginazione ──
 *
 * Prima la frase, poi l'opera, poi il nome di chi l'ha fatta.
 *
 * Chi arriva qui non ha un vuoto da riempire: ha già un'idea di cosa sia la
 * danza, o il cucito, e la userà per interpretare tutto quello che vede. Se
 * l'opera parla per prima, la guarda attraverso quell'idea. Se invece la prima
 * cosa che incontra è la propria convinzione detta ad alta voce da chi
 * quell'arte la fa, per un istante la sospende — ed è in quell'istante che
 * l'opera viene guardata davvero.
 *
 * Il nome dell'artista viene per ultimo di proposito: prima si incontra
 * un'arte, poi una persona. Al contrario sarebbe un profilo, cioè un social.
 */

export const metadata: Metadata = buildMetadata({
  title: "Incontra un'arte",
  description:
    "Un'opera al giorno, e il pregiudizio che smentisce, raccontato da chi quell'arte la fa. Un modo per incontrare arti che non avresti cercato.",
  path: "/incontra",
});

/**
 * Rigenerata ogni ora, non ogni giorno.
 *
 * L'opera cambia col giorno, quindi in teoria basterebbe una volta a
 * mezzanotte. Ma l'elenco dei candidati cambia quando qualcuno carica
 * un'opera con la sua credenza, e con una cache giornaliera quell'opera
 * entrerebbe in rotazione il giorno dopo — un ritardo che chi l'ha appena
 * caricata legge come «non ha funzionato».
 */
export const revalidate = 3600;

/** Il nome leggibile di una disciplina, dal suo slug. */
function nomeArte(slug: string | null): string | null {
  if (!slug) return null;
  return DISCIPLINES.find((d) => d.slug === slug)?.label ?? null;
}

export default async function IncontraPage() {
  // Chi ha la sessione ha una rotazione propria: due persone lo stesso giorno
  // incontrano opere diverse. Senza, la copertura di un catalogo di
  // cinquecento opere sarebbe di trecentosessantacinque all'anno.
  const session = await auth();
  const opera = await incontroDiOggi(session?.user?.id ?? "");
  const giorno = giornoDi();

  return (
    <div className="container-narrow py-10">
      <Breadcrumbs items={[{ name: "Incontra", path: "/incontra" }]} />

      <p className="eyebrow mt-2">Oggi</p>

      {!opera ? (
        /* Lo stato vuoto dice la verità invece di fingere una rotazione.
           Sotto tre opere «una al giorno» diventa «sempre la stessa», e chi
           torna domani lo scopre da solo — meglio dirlo subito. */
        <div className="mt-6 rounded-2xl border border-dashed p-8 text-center">
          <h1 className="text-fluid-xl font-bold">Non ancora.</h1>
          <p className="mx-auto mt-3 max-w-md muted">
            Perché ci sia qualcosa da incontrare servono opere in cui l&apos;autore ha
            scritto <em>cosa la gente crede della sua arte</em>. Sono ancora troppo poche.
          </p>
          <Link href="/dashboard/portfolio" className="btn-primary mt-6 inline-flex">
            Aggiungine una tua
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <article className="mt-4">
          {/* La frase. È il titolo della pagina — l'`h1` — e non una
              didascalia dell'immagine: la cosa che questa pagina afferma è
              il pregiudizio, non l'opera. */}
          <h1 className="text-[clamp(1.6rem,4.4vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.02em]">
            <span className="muted">Quello che si crede</span>
            {nomeArte(opera.disciplina) ? (
              <>
                {" "}
                <span className="muted">di chi fa</span>{" "}
                <span className="text-gradient">{nomeArte(opera.disciplina)}</span>
              </>
            ) : null}
            :
            <br />
            «{opera.credenza}»
          </h1>

          {/* L'opera. Nessuna cornice, nessuna ombra: è la cosa da guardare,
              e ogni decorazione intorno la commenterebbe. */}
          <div className="relative mt-8 overflow-hidden rounded-2xl border bg-surface-sunken">
            {opera.mediaType === "image" ? (
              <Image
                src={opera.mediaUrl}
                alt={opera.titolo}
                width={1200}
                height={900}
                sizes="(max-width: 768px) 92vw, 44rem"
                className="h-auto w-full object-cover"
                priority
              />
            ) : opera.mediaType === "audio" ? (
              <audio controls preload="metadata" className="w-full p-6" aria-label={opera.titolo}>
                <source src={opera.mediaUrl} />
              </audio>
            ) : (
              <video controls preload="metadata" className="h-auto w-full" aria-label={opera.titolo}>
                <source src={opera.mediaUrl} />
              </video>
            )}
          </div>

          {/* Per ultimo, chi l'ha fatta. Prima si incontra un'arte, poi una
              persona: al contrario sarebbe un profilo, cioè un social. */}
          <p className="mt-5 text-fluid-base">
            <Link href={`/portfolio/${opera.slug}`} className="font-semibold hover:underline">
              {opera.titolo}
            </Link>
            <span className="muted">
              {" "}
              — di{" "}
              <Link href={`/artisti/${opera.autore.slug}`} className="hover:underline">
                {opera.autore.nome}
              </Link>
            </span>
          </p>

          <p className="mt-8 text-fluid-sm muted">
            Domani ce n&apos;è un&apos;altra.{" "}
            <Link href="/artisti" className="underline underline-offset-4">
              Oppure guarda chi c&apos;è
            </Link>
            .
          </p>

          {/* Il numero del giorno non si mostra: sarebbe una metrica, e questa
              pagina non ne ha nessuna. Sta qui solo come chiave di cache
              leggibile in fase di verifica. */}
          <span className="sr-only">Giorno {giorno}</span>
        </article>
      )}
    </div>
  );
}
