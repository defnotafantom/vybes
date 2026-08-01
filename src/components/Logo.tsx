import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logotipo.
 *
 * Solo testo, niente icona. Non è una rinuncia: è la separazione classica fra
 * marchio completo e logotipo. La spirale vuole spazio per leggersi — nella
 * barra ne ha trentasei pixel, e a quella misura i suoi filamenti si
 * impastano in una macchia. Ridurla lì avrebbe indebolito il segno proprio
 * nel punto in cui compare più spesso.
 *
 * Così la spirale resta l'unico marchio figurativo del progetto, mostrato
 * dove ha respiro, e la barra porta il nome scritto — che oltretutto è
 * nitido a qualunque densità di schermo, non costa una richiesta di rete e
 * non ha bisogno di alcun testo alternativo.
 *
 * Il gradiente sulle prime due lettere è lo stesso della spirale: il legame
 * fra i due si tiene sul colore, non sulla ripetizione della forma.
 */
export function Logo({
  href = "/",
  className,
}: {
  href?: string | null;
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "brand inline-flex items-baseline text-fluid-lg font-bold tracking-tight",
        className
      )}
    >
      <span className="text-gradient">Vy</span>bes
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      // Il risalto all'hover è una transizione di luminosità, non un ciclo:
      // la barra è presente su ogni pagina e un marchio che si muove mentre
      // si legge è una distrazione permanente.
      className="logo-link rounded-lg"
    >
      {content}
    </Link>
  );
}
