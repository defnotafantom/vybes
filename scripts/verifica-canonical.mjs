#!/usr/bin/env node
/**
 * Controlla che ogni pagina dichiari il canonical del proprio percorso.
 *
 * Nasce da un guasto vero. Il file `src/app/artisti/[slug]/page.tsx` è stato
 * sovrascritto da una copia della landing — un salvataggio finito sul percorso
 * sbagliato. Il codice compilava, i test passavano, il lint era pulito e la
 * pagina si apriva senza errori: l'unico sintomo era che ogni profilo artista
 * dichiarava `canonical: "/"`, cioè diceva a Google «la pagina vera è la home».
 *
 * Il tipo di pagina su cui poggia tutta la strategia di ricerca si sarebbe
 * deindicizzato da solo, in silenzio, e ce ne saremmo accorti fra mesi
 * guardando il traffico che non arrivava.
 *
 * Nessuno degli strumenti in uso poteva accorgersene, perché nessuno di loro
 * sa cosa una pagina *dovrebbe* dichiarare. Questo controllo sì: confronta il
 * percorso passato a `buildMetadata` con la posizione del file nell'albero
 * delle rotte, che è la sola fonte di verità su quale URL serve quella pagina.
 *
 * Uso:  node scripts/verifica-canonical.mjs
 * In CI: gira insieme a tipi, lint e test.
 */

import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";

const RADICE = "src/app";

/** Da `src/app/artisti/[slug]/page.tsx` a `/artisti/*`. */
function rottaDaFile(file) {
  const dir = file.slice(RADICE.length).split("/").slice(0, -1).join("/");
  return (
    dir
      // I gruppi di rotta `(auth)` organizzano i file senza comparire nell'URL.
      .replace(/\/\([^)]*\)/g, "")
      // Un segmento dinamico può valere qualsiasi cosa: lo confrontiamo come
      // jolly, perché il canonical lo costruisce a runtime dai dati.
      .replace(/\[\.\.\.[^\]]+\]|\[[^\]]+\]/g, "*")
      .replace(/\/$/, "") || "/"
  );
}

/** Normalizza il percorso dichiarato: template letterali e query via. */
function normalizza(p) {
  return (
    p
      .replace(/\$\{[^}]*\}/g, "*")
      .split("?")[0]
      .replace(/\/$/, "") || "/"
  );
}

const problemi = [];
let esaminate = 0;

for await (const file of glob(`${RADICE}/**/page.tsx`)) {
  const sorgente = readFileSync(file, "utf8");

  // Tutti i `path:` che finiscono in buildMetadata, sia stringhe che template.
  const dichiarati = [...sorgente.matchAll(/path:\s*[`"']([^`"']*)/g)].map((m) =>
    normalizza(m[1])
  );

  // Una pagina senza metadata propri eredita quelli del layout: legittimo.
  if (dichiarati.length === 0) continue;

  esaminate++;
  const attesa = rottaDaFile(file.replaceAll("\\", "/"));

  if (!dichiarati.includes(attesa)) {
    problemi.push({ file, attesa, dichiarati: [...new Set(dichiarati)] });
  }
}

if (problemi.length === 0) {
  console.log(`✓ ${esaminate} pagine: ognuna dichiara il proprio percorso`);
  process.exit(0);
}

console.error(`\n✗ ${problemi.length} pagine dichiarano un canonical che non è il loro:\n`);
for (const p of problemi) {
  console.error(`  ${p.file}`);
  console.error(`     serve l'URL:  ${p.attesa}`);
  console.error(`     ma dichiara:  ${p.dichiarati.join(", ")}\n`);
}
console.error(
  "Un canonical sbagliato dice a Google che la pagina vera è un'altra: la\n" +
    "pagina sparisce dall'indice senza che nulla segnali un errore.\n"
);
process.exit(1);
