import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { DashboardSidebar, DashboardMobileNav } from "@/components/dashboard/Nav";
import { puo } from "@/lib/moderazione";
import { attenzioneDi } from "@/lib/attenzione";
import { PERMISSIONS } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RoleBadge } from "@/components/ui/Badge";

/**
 * L'intera area privata resta fuori dall'indice.
 *
 * Nessuna di queste pagine dichiarava però un proprio titolo, quindi ognuna
 * ereditava il `default` del layout radice: undici schede del browser tutte
 * chiamate «Vybes — La rete che connette artisti e chi li ingaggia», e la
 * cronologia altrettanto. Qui non è un problema di posizionamento — con
 * `noindex` nessun motore le legge — ma di orientamento: chi lavora tiene
 * aperte il profilo e l'ingaggio da gestire, e non riesce a distinguerli.
 *
 * Ogni pagina esporta quindi `metadata.title`, che il modello `%s | Vybes`
 * del layout radice completa da sé.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/dashboard");

  // Il ruolo si legge dal database a ogni caricamento, non dalla sessione: una
  // revoca deve sparire dal menu subito, non alla scadenza del token.
  const puoModerare = await puo(session.user.id, PERMISSIONS.CONTENT_MODERATE);

  // I contatori del menu. Stanno nel layout e non nelle singole pagine perché
  // il menu è visibile ovunque: calcolarli qui significa una volta per
  // navigazione invece che una per sezione.
  const contatori = await attenzioneDi(session.user.id, puoModerare);

  return (
    <div className="container-page py-8">
      {/* Questa riga è l'unica cornice dell'area personale: senza la barra
          superiore, qui devono trovare posto il logo — che è anche la via
          d'uscita verso il sito — le notifiche e il tema. */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Logo />
          <span className="hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <Avatar name={session.user.name ?? "?"} src={session.user.image} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.user.name}</p>
              <RoleBadge role={session.user.role} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <Link
            href={`/artisti/${session.user.slug}`}
            className="btn-ghost hidden text-sm sm:inline-flex"
          >
            Profilo pubblico
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="mb-6 lg:hidden">
        <DashboardMobileNav puoModerare={puoModerare} contatori={contatori} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <DashboardSidebar puoModerare={puoModerare} contatori={contatori} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
