import Image from "next/image";
import { SITE } from "@/lib/constants";
import { VybeWaves } from "@/components/VybeWaves";

/**
 * Marchio grande della landing.
 *
 * Riproduce le animazioni dell'originale — fluttuazione continua, rotazione
 * all'hover, scala, alone — interamente in CSS. L'originale usava
 * framer-motion: circa cinquanta kilobyte che sarebbero finiti nel bundle di
 * ogni pagina, incluse le duecento della directory locale che il marchio
 * grande non lo mostrano nemmeno.
 *
 * Nessuna direttiva "use client": non serve stato né gestori di eventi,
 * l'hover lo gestisce il CSS. Resta un componente server, quindi zero
 * JavaScript spedito al browser.
 *
 * I livelli annidati non sono decorativi: ogni elemento possiede una sola
 * trasformazione, perché due animazioni sullo stesso `transform` si
 * sovrascriverebbero.
 */
export function BrandHero() {
  return (
    <div className="brand flex flex-col items-center">
      {/* Contenitore alla misura del marchio: è il riferimento su cui il campo
          d'onda si centra. */}
      <div className="relative">
        {/* Prima del marchio nell'ordine del documento, quindi dietro di lui
            senza bisogno di z-index. Fuori da `brand-spin`: le onde escono dal
            marchio, non ruotano insieme a lui — se girassero anche loro il
            movimento relativo si annullerebbe e non si leggerebbe più come
            propagazione. */}
        <VybeWaves />

        <div className="brand-glow brand-float relative">
          <div className="brand-scale">
            <div className="brand-spin">
              <Image
                src="/logo-vybes.png"
                alt=""
                width={512}
                height={512}
                priority
                // Il marchio è l'elemento più grande sopra la piega: se arriva
                // tardi è lui a definire l'LCP. `priority` lo mette in coda
                // alta fin dall'HTML.
                //
                // La misura è relativa alla finestra, non ai breakpoint: 34vmin
                // significa poco più di un terzo del lato corto, quindi la
                // proporzione fra marchio e spazio libero resta la stessa su un
                // telefono e su un monitor. I due estremi del clamp evitano che
                // diventi minuscolo su schermi bassi o smisurato su quelli
                // grandi.
                className="h-[clamp(10rem,34vmin,24rem)] w-[clamp(10rem,34vmin,24rem)] object-contain drop-shadow-2xl"
                sizes="(max-width: 640px) 60vw, 34vmin"
              />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-fluid-xs font-semibold uppercase tracking-[0.22em] text-ink-faint">
        {SITE.tagline}
      </p>
    </div>
  );
}
