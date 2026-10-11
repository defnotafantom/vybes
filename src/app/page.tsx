import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/constants";
import { ScenaLanding } from "@/components/ScenaLanding";

// La home resta statica; nessun dato strutturato FAQ per risposte non visibili.
export const metadata: Metadata = buildMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  description:
    "Artisti e chi li ingaggia si trovano qui, senza intermediari. Musicisti, DJ, band, ballerini e performer da una parte; locali, festival e agenzie dall'altra.",
  path: "/",
  keywords: [
    "trovare artisti",
    "ingaggiare musicisti",
    "casting artisti Italia",
    "musica dal vivo locali",
    "piattaforma artisti",
  ],
});

export default function HomePage() {
  return <ScenaLanding />;
}
