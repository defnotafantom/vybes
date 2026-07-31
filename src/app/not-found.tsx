import Link from "next/link";
import type { Metadata } from "next";

// Un 404 restituisce lo status corretto: non va indicizzato.
export const metadata: Metadata = { title: "Pagina non trovata", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Questa pagina non esiste</h1>
      <p className="mx-auto mt-3 max-w-md muted">
        Il link potrebbe essere scaduto o l&apos;artista potrebbe aver reso privato il profilo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">Torna alla home</Link>
        <Link href="/artisti" className="btn-ghost">Esplora gli artisti</Link>
        <Link href="/eventi" className="btn-ghost">Vedi gli ingaggi</Link>
      </div>
    </div>
  );
}
