import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Iscrizione } from "@/components/Iscrizione";

export const metadata: Metadata = buildMetadata({
  title: "Iscriviti",
  description: "Crea il tuo account Vybes: gratis per artisti e organizzatori.",
  path: "/registrati",
  noindex: true,
});

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ruolo?: string }>;
}) {
  const sp = await searchParams;
  const role = sp.ruolo === "recruiter" ? "RECRUITER" : "ARTIST";
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="container-page py-16">
      {/* Il modulo era una colonna stretta al centro di uno schermo vuoto, e
          non c'era una sola ragione in vista per compilarlo. È il punto in cui
          si perde più gente di tutto l'imbuto, ed è dove arriva chi viene da
          un messaggio diretto: aveva letto due righe su Instagram, cliccava, e
          trovava un modulo che non gli ricordava perché era interessato. */}
      <div className="mx-auto w-full max-w-md lg:max-w-4xl">
        <h1 className="text-2xl font-bold">Crea il tuo account</h1>
        <p className="mt-2 text-sm muted">
          Hai già un account?{" "}
          <Link href="/accedi" className="text-brand-600 hover:underline">Accedi</Link>
        </p>
        <div className="mt-8">
          <Iscrizione defaultRole={role} googleEnabled={googleEnabled} />
        </div>
      </div>
    </div>
  );
}
