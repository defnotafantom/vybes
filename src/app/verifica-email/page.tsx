import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { verifyToken, consumeToken } from "@/lib/tokens";
import { confirmEmail } from "@/lib/account";
import { ResendVerification } from "@/components/ResendVerification";

export const metadata: Metadata = buildMetadata({
  title: "Verifica email",
  description: "Conferma il tuo indirizzo email per attivare l'account Vybes.",
  path: "/verifica-email",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function VerificaEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Shell title="Link non valido">
        <p className="muted">
          Manca il codice di verifica. Apri il link direttamente dall&apos;email che ti abbiamo
          inviato.
        </p>
        <ResendVerification />
      </Shell>
    );
  }

  const check = await verifyToken(token, "EMAIL_VERIFY");

  if (!check.ok) {
    return (
      <Shell title={check.reason === "expired" ? "Link scaduto" : "Link non valido"}>
        <p className="muted">
          {check.reason === "expired"
            ? "I link di verifica durano 24 ore. Richiedine uno nuovo qui sotto."
            : "Questo link è già stato usato oppure non è corretto. Puoi richiederne uno nuovo."}
        </p>
        <ResendVerification />
      </Shell>
    );
  }

  await confirmEmail(check.userId);
  await consumeToken(check.tokenId);

  return (
    <Shell title="Email confermata">
      <p className="muted">Il tuo account è attivo. Puoi accedere e completare il profilo.</p>
      <Link href="/accedi" className="btn-primary mt-6">
        Accedi
      </Link>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-20">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
