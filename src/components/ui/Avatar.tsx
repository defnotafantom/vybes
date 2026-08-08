"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

const SIZES = {
  xs: { box: "h-7 w-7", text: "text-xs", px: 28 },
  sm: { box: "h-9 w-9", text: "text-sm", px: 36 },
  md: { box: "h-12 w-12", text: "text-base", px: 48 },
  lg: { box: "h-16 w-16", text: "text-xl", px: 64 },
  xl: { box: "h-28 w-28", text: "text-4xl", px: 112 },
} as const;

/**
 * Avatar con ripiego sulle iniziali.
 *
 * Il colore di sfondo è derivato dal nome, non casuale: lo stesso utente ha
 * sempre la stessa tinta in tutta l'applicazione, il che rende i profili
 * riconoscibili a colpo d'occhio anche senza foto.
 *
 * ── Perché il ripiego scatta anche se la foto c'è ──
 *
 * Prima bastava che `src` fosse valorizzato per andare sul ramo immagine. Ma
 * «c'è un indirizzo» e «l'immagine si carica» sono due cose diverse, e la
 * distanza fra le due si è vista in produzione nel modo peggiore: chi entrava
 * con Google riceveva da Google l'indirizzo della propria foto, e `next/image`
 * lo rifiutava perché quel dominio non era fra quelli autorizzati. Risultato:
 * al posto della faccia, il rettangolo rotto del browser con scritto **«Foto
 * di Daniele Bucca»** — in topbar, sul profilo pubblico, in ogni elenco, per
 * ogni account creato con il percorso di iscrizione più breve del sito.
 *
 * Il dominio ora è autorizzato, e quella era la causa. Ma correggere solo la
 * causa lascia la stessa scena pronta a ripetersi al prossimo indirizzo che
 * non carica: un file cancellato dallo storage, un dominio nuovo dimenticato,
 * una foto che l'utente ha reso privata altrove.
 *
 * Quindi la difesa sta **nel componente**: se l'immagine fallisce, si passa
 * alle iniziali. Vale anche per i dati già scritti ieri, che è tutta la
 * differenza fra correggere un dato e correggere un difetto — la stessa
 * ragione per cui esiste `SfondoLavoro`.
 *
 * ── Il prezzo, dichiarato ──
 *
 * `onError` esiste solo nel browser, quindi questo componente è diventato
 * client. È piccolo e senza dipendenze, e comparire come una faccia rotta è
 * un prezzo più alto di qualche riga di JavaScript.
 */
const TINTS = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  rounded = "full",
  priority = false,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  rounded?: "full" | "xl";
  priority?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  const shape = rounded === "full" ? "rounded-full" : "rounded-2xl";
  const [rotta, setRotta] = useState(false);

  const mostraFoto = Boolean(src) && !rotta;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden",
        s.box,
        shape,
        !mostraFoto && tintFor(name),
        className
      )}
    >
      {mostraFoto ? (
        <Image
          src={src!}
          alt={`Foto di ${name}`}
          fill
          sizes={`${s.px}px`}
          priority={priority}
          className="object-cover"
          onError={() => setRotta(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("flex h-full w-full items-center justify-center font-bold", s.text)}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}
