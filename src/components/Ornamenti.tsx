import type { ReactNode } from "react";
import type { Cosmetico, Slot } from "@/lib/cosmetici";

/**
 * Come si vedono le cose comprate.
 *
 * ── La regola, resa visibile qui ──
 *
 * Un ornamento **circonda** ciò che conta, non lo sostituisce mai. La cornice
 * sta attorno alla foto vera; il titolo sta sotto il nome, mai al posto suo.
 *
 * È la traduzione grafica di ADR-047. Un avatar disegnato che prende il posto
 * della fotografia lavorerebbe contro lo scopo della pagina: un organizzatore
 * guarda la faccia prima di scrivere, e sostituirgliela con un pupazzo
 * comprato toglie alla pagina la cosa per cui esiste. Attorno, invece, non
 * costa niente a nessuno e dice quello che deve dire — «questa persona sta
 * qui da un po'».
 *
 * ── Perché è un componente e non tre classi sparse ──
 *
 * Perché il confine deve avere un posto solo. Sparso in cinque pagine, alla
 * sesta qualcuno userebbe la cornice come sfondo del nome, e da lì al «tema
 * che evidenzia la scheda in elenco» il passo è breve — e quello sarebbe
 * visibilità comprata, cioè il difetto che tutto questo esiste per impedire.
 */

/**
 * La cornice attorno all'avatar.
 *
 * Un anello disegnato **fuori** dal contenitore della foto (`padding` più
 * `rounded-full`), non un `border` sull'immagine: un bordo la rimpicciolirebbe
 * di quattro pixel per lato, e una foto ritagliata è un prezzo che chi non ha
 * comprato niente non paga.
 */
export function ConCornice({
  cornice,
  children,
}: {
  cornice?: Cosmetico;
  children: ReactNode;
}) {
  if (!cornice) return <>{children}</>;

  return (
    <span
      className="inline-block rounded-full p-[3px]"
      style={{ background: `linear-gradient(135deg, ${cornice.reso}, transparent 75%)` }}
      /* Decorazione pura: chi usa uno screen reader non deve sentirsi
         annunciare «Brace» prima del nome della persona. */
      aria-hidden={undefined}
    >
      <span className="block rounded-full bg-surface p-[2px]">{children}</span>
    </span>
  );
}

/**
 * Il titolo, sotto il nome.
 *
 * Piccolo e in maiuscoletto, cioè visibilmente **diverso** da un distintivo.
 * I distintivi affermano un fatto verificato — identità confermata, dieci
 * ingaggi conclusi — e confonderli con un ornamento comprato svaluterebbe i
 * primi: chi legge non saprebbe più quali delle due cose credere.
 */
export function Titolo({ titolo }: { titolo?: Cosmetico }) {
  if (!titolo) return null;
  return (
    <span className="mt-1 block text-fluid-xs uppercase tracking-[0.14em] text-ink-faint">
      {titolo.reso}
    </span>
  );
}

/** Ciò che una persona indossa, nella forma comoda per le pagine. */
export type Ornamenti = Partial<Record<Slot, Cosmetico>>;
