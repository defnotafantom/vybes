import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { RegisterForm } from "@/components/RegisterForm";

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
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Crea il tuo account</h1>
        <p className="mt-2 text-sm muted">
          Hai già un account?{" "}
          <Link href="/accedi" className="text-brand-600 hover:underline">Accedi</Link>
        </p>
        <div className="mt-8">
          {googleEnabled && <GoogleSignIn />}
          <RegisterForm defaultRole={role} />
        </div>
      </div>
    </div>
  );
}
