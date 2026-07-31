import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = buildMetadata({
  title: "Accedi",
  description: "Accedi al tuo account Vybes.",
  path: "/accedi",
  noindex: true, // pagina di autenticazione: fuori dall'indice
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Accedi a Vybes</h1>
        <p className="mt-2 text-sm muted">
          Non hai un account?{" "}
          <Link href="/registrati" className="text-brand-600 hover:underline">Iscriviti gratis</Link>
        </p>
        {sp.reset && (
          <p role="status" className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-200">
            Password aggiornata. Accedi con quella nuova.
          </p>
        )}

        <div className="mt-8">
          {googleEnabled && <GoogleSignIn next={sp.next ?? "/dashboard"} />}
          <LoginForm next={sp.next ?? "/dashboard"} initialError={sp.error ? "Credenziali non valide" : null} />
        </div>
      </div>
    </div>
  );
}
