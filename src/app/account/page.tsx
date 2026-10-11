import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { ZonaPericolosa } from "@/components/ZonaPericolosa";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildMetadata({
  title: "Gestisci i tuoi dati", path: "/account", noindex: true,
});

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/account");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id }, select: { name: true, password: true },
  });
  if (!me) redirect("/accedi");
  return (
    <div className="container-narrow py-16">
      <h1 className="text-fluid-2xl font-bold">Gestisci i tuoi dati</h1>
      <p className="mt-3 text-ink-muted">
        Puoi esportare i tuoi dati o eliminare l&apos;account anche prima di completare il profilo.
      </p>
      <ZonaPericolosa nome={me.name} haPassword={Boolean(me.password)} />
      <Link href="/benvenuto" className="btn-ghost mt-8 inline-flex">Torna al profilo</Link>
    </div>
  );
}
