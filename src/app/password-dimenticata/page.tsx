import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = buildMetadata({
  title: "Password dimenticata",
  description: "Richiedi il link per reimpostare la password del tuo account Vybes.",
  path: "/password-dimenticata",
  noindex: true,
});

export default function PasswordDimenticataPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Password dimenticata</h1>
        <p className="muted mt-2 text-sm">
          Inserisci la tua email: ti mandiamo un link per sceglierne una nuova.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
        <p className="muted mt-6 text-sm">
          Te la sei ricordata?{" "}
          <Link href="/accedi" className="text-brand-600 hover:underline">
            Torna all&apos;accesso
          </Link>
        </p>
      </div>
    </div>
  );
}
