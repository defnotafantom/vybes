"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Search, Users, CalendarDays, MapPin, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Navigazione del sito pubblico.
 *
 * Esisteva solo da 768px in su: `hidden md:flex`. Sotto quella soglia il sito
 * non aveva navigazione — nessun accesso ad artisti, ingaggi, città o mappa —
 * e sotto i 640px spariva anche «Accedi». Restavano il logo, il tema e
 * «Iscriviti».
 *
 * Su un progetto costruito attorno alla ricerca è il difetto più costoso
 * possibile: chi arriva da Google atterra su una pagina di città o su un
 * profilo, quasi sempre da telefono, e non ha modo di andare da nessun'altra
 * parte se non scorrendo fino al piè di pagina. Una visita che poteva
 * diventare una candidatura finisce lì.
 *
 * La ricerca è nell'elenco anche perché prima stava solo nel piè di pagina, e
 * su un sito che promette di far trovare qualcuno è il posto sbagliato.
 */

const VOCI = [
  { href: "/artisti", label: "Artisti", icon: Users },
  { href: "/eventi", label: "Ingaggi", icon: CalendarDays },
  { href: "/citta", label: "Città", icon: MapPin },
  { href: "/mappa", label: "Mappa", icon: MapIcon },
  { href: "/cerca", label: "Cerca", icon: Search },
] as const;

export function NavPubblica() {
  const pathname = usePathname();
  const [aperto, setAperto] = useState(false);

  // Chiude al cambio pagina: dimenticarlo aperto è l'errore classico di questi
  // menu, e lascia il pannello sopra la pagina appena aperta.
  useEffect(() => setAperto(false), [pathname]);

  useEffect(() => {
    if (!aperto) return;
    const suTasto = (e: KeyboardEvent) => e.key === "Escape" && setAperto(false);
    document.addEventListener("keydown", suTasto);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", suTasto);
      document.body.style.overflow = "";
    };
  }, [aperto]);

  const attiva = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Da tablet in su l'elenco sta in orizzontale e non serve nulla d'altro. */}
      <nav aria-label="Navigazione principale" className="hidden gap-6 text-sm md:flex">
        {VOCI.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            aria-current={attiva(v.href) ? "page" : undefined}
            className={cn(
              "link-underline hover:text-brand-600",
              attiva(v.href) ? "text-brand-600 dark:text-brand-400" : "text-ink"
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setAperto(true)}
        aria-expanded={aperto}
        aria-haspopup="dialog"
        aria-label="Apri il menu"
        className="btn-ghost px-2 md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {aperto && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Chiudi il menu"
            className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={() => setAperto(false)}
          />

          <div className="absolute inset-x-3 top-3 animate-fade-down rounded-2xl border bg-surface p-2 shadow-float">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-sm font-semibold">Vybes</span>
              <button
                type="button"
                onClick={() => setAperto(false)}
                aria-label="Chiudi"
                className="rounded-lg p-1.5 text-ink-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="mt-1">
              {VOCI.map((v) => {
                const Icona = v.icon;
                return (
                  <li key={v.href}>
                    <Link
                      href={v.href}
                      aria-current={attiva(v.href) ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                        attiva(v.href)
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                          : "text-ink"
                      )}
                    >
                      <Icona className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {v.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* «Accedi» era nascosto sotto i 640px: chi tornava sul sito dal
                telefono non aveva un modo evidente di rientrare, e l'unico
                pulsante visibile lo invitava a iscriversi di nuovo. */}
            <div className="mt-2 border-t p-2">
              <Link href="/accedi" className="btn-ghost w-full">
                Accedi
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
