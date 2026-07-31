import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { verifyToken } from "@/lib/tokens";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = buildMetadata({
  title: "Scegli una nuova password",
  description: "Imposta una nuova password per il tuo account Vybes.",
  path: "/reimposta-password",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function ReimpostaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Il token si valida prima di mostrare il form: inutile far compilare
  // una password per poi dire che il link è scaduto.
  const check = token ? await verifyToken(token, "PASSWORD_RESET") : null;

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Scegli una nuova password</h1>

        {check?.ok ? (
          <div className="mt-8">
            <ResetPasswordForm token={token!} />
          </div>
        ) : (
          <>
            <p className="mt-4 muted">
              {check?.reason === "expired"
                ? "Questo link è scaduto: i link di reset durano un'ora."
                : "Link mancante o non valido. Potrebbe essere già stato usato."}
            </p>
            <Link href="/password-dimenticata" className="btn-primary mt-6">
              Richiedi un nuovo link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
