import { Image as ImageIcon, Video, Music } from "lucide-react";

/**
 * Cosa si vede sotto — o al posto di — l'anteprima di un lavoro.
 *
 * ── Perché è un componente e non due mappe uguali ──
 *
 * La stessa idea era già nella griglia del profilo artista: una tinta e
 * un'icona per tipo, perché l'assenza di immagine non significhi assenza di
 * identità (ADR-040). Non era però sulla **pagina del singolo lavoro**, che è
 * l'unico posto in cui quel lavoro è il protagonista — e lì un brano
 * mostrava un rettangolo vuoto alto quattrocento pixel.
 *
 * Due copie della stessa mappa sarebbero divergite alla prima modifica: è la
 * forma di difetto che su questo progetto si è già ripetuta a sufficienza.
 *
 * ── Perché sta *dietro* e non *al posto di* ──
 *
 * Perché copre due casi con una cosa sola: il tipo che un'anteprima non ce
 * l'ha — un brano, un video — e il file che non carica. Il secondo non è
 * teorico: in produzione c'è un lavoro il cui indirizzo punta a un'immagine
 * che non esiste più, e prima mostrava il rettangolo rotto del browser.
 *
 * E soprattutto: cambiare il file del seed non cambia i dati già scritti nel
 * database. Una difesa che vive nel componente vale anche per i record
 * sbagliati di ieri, che è tutta la differenza fra correggere un dato e
 * correggere un difetto.
 */
export const ANTEPRIMA: Record<string, { tinta: string; Icona: typeof Music }> = {
  image: { tinta: "from-brand-500/20 to-accent-500/[0.08]", Icona: ImageIcon },
  video: { tinta: "from-accent-500/20 to-brand-500/[0.08]", Icona: Video },
  audio: { tinta: "from-brand-400/20 to-esito-attesa-tinta/[0.08]", Icona: Music },
};

/**
 * Lo sfondo di un'anteprima. Va messo dentro un contenitore `relative`, prima
 * del contenuto vero: quello che carica gli si sovrappone, quello che non
 * carica lo lascia vedere.
 */
export function SfondoLavoro({ tipo, grande = false }: { tipo: string; grande?: boolean }) {
  const { tinta, Icona } = ANTEPRIMA[tipo] ?? ANTEPRIMA.image;
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${tinta}`}
    >
      <Icona className={grande ? "h-14 w-14 text-ink-faint" : "h-8 w-8 text-ink-faint"} />
    </span>
  );
}
