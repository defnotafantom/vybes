import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const metadata: Metadata = buildMetadata({
  title: "Informativa privacy",
  description: "Come Vybes tratta i dati personali degli utenti ai sensi del GDPR.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="container-page py-10">
      <Breadcrumbs items={[{ name: "Privacy", path: "/privacy" }]} />
      <article className="prose-vybes max-w-3xl">
        <h1 className="text-3xl font-bold">Informativa privacy</h1>
        <p className="mt-4 text-sm muted">Ultimo aggiornamento: {new Date().toLocaleDateString("it-IT")}</p>
        <p className="mt-6 muted">
          <strong>Bozza da far validare a un legale prima della pubblicazione.</strong> Il testo che
          segue elenca i punti che l&apos;informativa deve coprire per essere conforme al GDPR.
        </p>
        <h2 className="mt-8 text-xl font-bold">Dati raccolti</h2>
        <p className="mt-3 muted">
          Email, password (salvata come hash bcrypt, mai in chiaro), nome pubblico, città, contenuti
          caricati volontariamente (bio, portfolio, post, messaggi) e dati tecnici di navigazione.
        </p>
        <h2 className="mt-8 text-xl font-bold">Finalità e base giuridica</h2>
        <p className="mt-3 muted">
          Erogazione del servizio (esecuzione del contratto), sicurezza dell&apos;account (interesse
          legittimo), comunicazioni di servizio. Il profilo pubblico è visibile e indicizzabile: puoi
          renderlo privato in qualsiasi momento dalle impostazioni.
        </p>
        <h2 className="mt-8 text-xl font-bold">Diritti dell&apos;interessato</h2>
        <p className="mt-3 muted">
          Accesso, rettifica, cancellazione, portabilità, limitazione e opposizione. La cancellazione
          dell&apos;account rimuove profilo, portfolio, post e messaggi.
        </p>
      </article>
    </div>
  );
}
