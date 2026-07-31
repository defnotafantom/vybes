import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = buildMetadata({
  title: "Chi siamo",
  description:
    "Vybes nasce per togliere gli intermediari tra chi fa arte e chi la programma. La storia, la missione e il team dietro la piattaforma.",
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
          Abbiamo costruito una piattaforma dove il profilo di un artista è una pagina pubblica vera,
          trovabile su Google, e dove ogni ingaggio dichiara data, luogo e compenso prima ancora che
          si apra una conversazione.
        </p>
        <h2 className="mt-10 text-2xl font-bold">Come ci sosteniamo</h2>
        <p className="mt-4 muted">
          Non prendiamo commissioni sul cachet. Il modello si regge su strumenti opzionali per
          organizzatori professionali e su una futura sottoscrizione per profili business.
        </p>
      </article>
    </div>
  );
}
