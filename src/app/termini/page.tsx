import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = buildMetadata({
  title: "Termini di servizio",
  description: "Le condizioni d'uso della piattaforma Vybes per artisti e organizzatori.",
  path: "/termini",
});

export default function TerminiPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Termini", path: "/termini" }]} />
      <article className="prose-vybes max-w-3xl">
        <h1 className="text-3xl font-bold">Termini di servizio</h1>
        <p className="mt-6 muted">
          <strong>Bozza da far validare a un legale prima della pubblicazione.</strong>
        </p>
        <h2 className="mt-8 text-xl font-bold">Rapporto tra le parti</h2>
        <p className="mt-3 muted">
          Vybes è una piattaforma di incontro tra domanda e offerta. Non è parte del contratto tra
          artista e organizzatore, non garantisce l&apos;esito degli ingaggi e non gestisce i pagamenti.
        </p>
        <h2 className="mt-8 text-xl font-bold">Contenuti caricati</h2>
        <p className="mt-3 muted">
          Resti titolare dei diritti sui contenuti che carichi e concedi a Vybes una licenza non
          esclusiva per mostrarli sulla piattaforma. Non caricare materiale su cui non hai diritti.
        </p>
        <h2 className="mt-8 text-xl font-bold">Sospensione</h2>
        <p className="mt-3 muted">
          Gli account che pubblicano annunci ingannevoli, contenuti illeciti o spam possono essere
          sospesi senza preavviso.
        </p>
      </article>
    </div>
  );
}
