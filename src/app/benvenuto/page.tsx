import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { CompletaProfilo } from "@/components/CompletaProfilo";
import { ruoloDi } from "@/lib/ruolo";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Benvenuto",
  path: "/benvenuto",
  noindex: true,
});

/**
 * Le tre domande che Google non sa fare.
 *
 * ── Perché questa pagina esiste ──
 *
 * Entrando con Google si arriva dentro con nome, email e foto — e senza le
 * informazioni che decidono tutto il resto: **come vuoi chiamarti**, **a quale
 * indirizzo**, e **se sei un artista o se cerchi artisti**.
 *
 * Google verifica un'identità: chi sei davvero. Non sa da che parte stai, e il
 * nickname se lo inventava il sistema partendo dal nome — con un numero in
 * coda quando era già preso. Da qui questa schermata, che è la sola porta
 * verso la dashboard.
 *
 * Prima il valore restava il default, `ARTIST`. Chi si iscriveva per cercare
 * artisti riceveva quindi il prodotto dell'altro lato — menu, obiettivi e
 * formula della reputazione — senza aver mai avuto occasione di dire il
 * contrario, e senza nemmeno sapere che ci fosse un contrario.
 *
 * ── Perché una pagina e non un pannello nella dashboard ──
 *
 * Perché non è un'impostazione fra le altre: finché non è risposta, ogni
 * pagina dell'area personale mostra la cosa sbagliata. Un pannello lo si
 * chiude e si continua a usare un prodotto tarato male; una pagina che
 * precede tutto si risponde e basta — sono tre righe e un clic.
 *
 * ── Perché si mostra una volta sola ──
 *
 * Il segnale non è `role`, che ha sempre un valore: è `ruoloSceltoIl`, che
 * distingue «è ARTIST perché l'ha detto» da «è ARTIST perché è il default».
 * Senza quella colonna la domanda o non sarebbe mai comparsa a nessuno, o
 * sarebbe ricomparsa a ogni accesso a tutti.
 *
 * Chi ha già risposto e capita qui viene rimandato in dashboard: una pagina
 * che ripropone una decisione già presa fa dubitare che sia stata registrata.
 */
export default async function BenvenutoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/benvenuto");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, slug: true, role: true, ruoloSceltoIl: true },
  });
  if (!me) redirect("/accedi");
  if (me.ruoloSceltoIl) redirect("/dashboard");

  return (
    <div className="container-narrow flex min-h-[70dvh] flex-col justify-center py-16">
      <div className="mb-10 text-center">
        <Logo href={null} />
      </div>

      <h1 className="text-fluid-2xl font-bold">
        Ciao {me.name.split(" ")[0]}, tre cose e sei dentro.
      </h1>
      <p className="mt-3 max-w-xl text-fluid-base text-ink-muted">
        Sono le uniche che il sistema non può indovinare da solo — e da cui
        dipende tutto il resto.
      </p>

      <div className="mt-10">
        <CompletaProfilo nomeIniziale={me.name} ruoloIniziale={ruoloDi(me.role)} />
      </div>
    </div>
  );
}
