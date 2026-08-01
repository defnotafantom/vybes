import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { DashboardSidebar, DashboardMobileNav } from "@/components/dashboard/Nav";
import { puo } from "@/lib/moderazione";
import { PERMISSIONS } from "@/lib/permissions";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";

// L'intera area privata resta fuori dall'indice.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/accedi?next=/dashboard");

  // Il ruolo si legge dal database a ogni caricamento, non dalla sessione: una
  // revoca deve sparire dal menu subito, non alla scadenza del token.
  const puoModerare = await puo(session.user.id, PERMISSIONS.CONTENT_MODERATE);

  return (
    <div className="container-page py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={session.user.name ?? "?"} src={session.user.image} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{session.user.name}</p>
            <RoleBadge role={session.user.role} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
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
        <DashboardMobileNav puoModerare={puoModerare} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <DashboardSidebar puoModerare={puoModerare} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
