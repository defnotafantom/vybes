import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Chi siamo",
  description:
    "Vybes nasce per togliere gli intermediari tra chi fa arte e chi la programma. Perché esiste, come funziona il modello e chi c'è dietro.",
  path: "/chi-siamo",
});

export default function ChiSiamoPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Chi siamo", path: "/chi-siamo" }]} />
      <article className="prose-vybes max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">Chi siamo</h1>
        <p className="mt-6 muted">
          Vybes nasce da una constatazione semplice: in Italia ci sono migliaia di artisti bravi che
          non trovano date, e migliaia di locali che non trovano artisti. In mezzo, un mercato opaco
          fatto di passaparola, gruppi WhatsApp e agenzie che trattengono percentuali.
        </p>
        <p className="mt-4 muted">
          {/* Prima persona singolare, e non è modestia: RECLUTAMENTO.md dice
              testualmente «non dire *siamo un team*: sei tu, e si vede». La
              pagina pubblica faceva esattamente quello che il documento con cui
              contattiamo gli artisti vieta — e chi apre un sito nuovo e legge
              «abbiamo» da un progetto di una persona lo sente comunque. */}
          Ho costruito una piattaforma dove il profilo di un artista è una pagina pubblica vera,
          trovabile su Google, e dove ogni ingaggio dichiara data, luogo e compenso prima ancora che
          si apra una conversazione.
        </p>
        <h2 className="mt-10 text-2xl font-bold">Come si sostiene</h2>
        <p className="mt-4 muted">
          Non prendiamo commissioni sul cachet. Il modello si regge su strumenti opzionali per
          organizzatori professionali e su una futura sottoscrizione per profili business.
        </p>

        {/* Una via d'uscita, che non c'era.
            La pagina finiva con un punto e mezzo schermo vuoto: chi ci arriva
            — di solito dal piè di pagina, mentre sta decidendo se fidarsi —
            leggeva, si convinceva, e non aveva niente da fare. Una pagina che
            spiega perché esisti deve finire con il posto in cui lo si verifica. */}
        <div className="mt-12 flex flex-wrap gap-3 border-t pt-8">
          <Link href="/artisti" className="btn-primary">
            Guarda chi c&apos;è
          </Link>
          <Link href="/come-funziona" className="btn-ghost">
            Come funziona
          </Link>
        </div>
      </article>
    </div>
  );
}
