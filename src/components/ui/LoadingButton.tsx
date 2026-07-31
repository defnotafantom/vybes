"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Bottone con indicatore di attesa.
 *
 * Lo spinner sostituisce l'icona ma **il testo resta lo stesso**: cambiare
 * l'etichetta da "Pubblica" a "Pubblicazione…" fa cambiare larghezza al
 * bottone, e quel salto sotto il dito è fastidioso. Se serve un'etichetta
 * diversa in attesa, si passa `pendingLabel`.
 */
export function LoadingButton({
  children,
  pending = false,
  pendingLabel,
  variant = "primary",
  icon,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger";
  icon?: React.ReactNode;
}) {
  const base =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost";

  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cn(base, className)}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
