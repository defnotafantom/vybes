#!/usr/bin/env node
/**
 * Le uniform che il JavaScript chiede e quelle che il GLSL dichiara devono
 * essere le stesse.
 *
 * ── Perché questo controllo esiste ──
 *
 * Estraendo la formula del campo in `lib/campo.ts`, due dichiarazioni —
 * `risoluzione` e `chiaro` — sono rimaste indietro nel file di partenza. I tre
 * frammenti hanno continuato a usarle, nessuno le dichiarava più, e nessuno dei
 * tre shader ha più compilato.
 *
 * Il punto non è l'errore: è che **non si è visto**. In produzione il registro
 * di compilazione è muto per scelta — un ornamento che manda in errore la
 * pagina che ornava è peggio dell'ornamento assente — quindi la landing non si
 * è rotta: ha smesso di disegnare. Tipi a posto, build a posto, test a posto,
 * e tre tele ferme a 300×150. È la forma di difetto numero uno di COLLOQUIO.md
 * scritta in GLSL: il sistema dice di sì e non fa niente.
 *
 * Nessuno degli strumenti che il progetto già aveva poteva accorgersene:
 * TypeScript non entra dentro una stringa, ESLint nemmeno, e un test unitario
 * non ha una GPU su cui compilare.
 *
 * ── Cosa controlla, e perché basta ──
 *
 * Il confronto va in **due direzioni**, e servono entrambe:
 *
 * 1. Ogni uniform che il JavaScript cerca con `getUniformLocation` deve essere
 *    dichiarata nel GLSL. Senza, `gl.uniform*()` scrive su `null` — che WebGL
 *    accetta in silenzio — e il valore non arriva mai.
 * 2. Ogni uniform dichiarata deve essere fra quelle che il JavaScript scrive.
 *    Una dichiarata e mai valorizzata vale zero: uno shader che disegna il
 *    nero, senza un errore da nessuna parte.
 *
 * Il caso di partenza era il primo, e sarebbe stato preso a colpo sicuro.
 *
 * ── Perché non compilare gli shader per davvero ──
 *
 * Sarebbe il controllo giusto, e richiede una GPU o `headless-gl`, che è un
 * modulo nativo da compilare in CI. Questo costa zero dipendenze, gira in
 * cinquanta millisecondi e copre l'errore che è successo davvero. Se un giorno
 * un refuso dentro una funzione GLSL passerà comunque, allora varrà la pena
 * pagare quel prezzo — non prima.
 */
import { readFileSync } from "node:fs";

const RADICE = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const leggi = (p) => readFileSync(`${RADICE}/${p}`, "utf8");

/** Il corpo di una costante template: `const NOME = \`...\`;` */
function templateDi(sorgente, nome) {
  const inizio = sorgente.indexOf(`const ${nome} = \``);
  if (inizio === -1) return null;
  const da = inizio + `const ${nome} = \``.length;
  const a = sorgente.indexOf("`;", da);
  return a === -1 ? null : sorgente.slice(da, a);
}

/** Le uniform dichiarate in un pezzo di GLSL, commenti esclusi. */
function dichiarate(glsl) {
  const pulito = glsl.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  return new Set([...pulito.matchAll(/\buniform\s+\w+\s+(\w+)\s*(?:\[[^\]]*\])?\s*;/g)].map((m) => m[1]));
}

/** L'elenco di stringhe di un array letterale in TypeScript. */
function elenco(sorgente, dopo) {
  const i = sorgente.indexOf(dopo);
  if (i === -1) return [];
  const apre = sorgente.indexOf("[", i);
  const chiude = sorgente.indexOf("]", apre);
  return [...sorgente.slice(apre, chiude).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const prelude = templateDi(leggi("src/lib/campo.ts"), "CAMPO_GLSL");
if (!prelude) {
  console.error("✗ non trovo CAMPO_GLSL in src/lib/campo.ts");
  process.exit(1);
}

const motore = leggi("src/lib/tela-campo.ts");
const comuni = elenco(motore, "const COMUNI");
if (comuni.length === 0) {
  console.error("✗ non trovo l'elenco COMUNI in src/lib/tela-campo.ts");
  process.exit(1);
}

/** I componenti che accendono una superficie del campo. */
const SUPERFICI = [
  "src/components/OndeWebGL.tsx",
  "src/components/TitoloOnda.tsx",
  "src/components/MarchioCampo.tsx",
];

const dichiaratePrelude = dichiarate(prelude);
let errori = 0;

for (const file of SUPERFICI) {
  const sorgente = leggi(file);
  const frammento = templateDi(sorgente, "FRAMMENTO");
  if (!frammento) {
    console.error(`✗ ${file}: non trovo la costante FRAMMENTO`);
    errori++;
    continue;
  }

  const dich = new Set([...dichiaratePrelude, ...dichiarate(frammento)]);
  const chieste = new Set([...comuni, ...elenco(sorgente, "uniformi:")]);

  for (const nome of chieste) {
    if (!dich.has(nome)) {
      console.error(
        `✗ ${file}: il JavaScript scrive «${nome}», il GLSL non la dichiara.\n` +
          `  gl.uniform*() su una posizione nulla non dà errore: il valore non arriva e basta.`
      );
      errori++;
    }
  }
  for (const nome of dich) {
    if (!chieste.has(nome)) {
      console.error(
        `✗ ${file}: il GLSL dichiara «${nome}», nessuno gliela scrive.\n` +
          `  Vale zero a ogni fotogramma, e lo shader disegna una cosa plausibile e sbagliata.`
      );
      errori++;
    }
  }
}

if (errori > 0) {
  console.error(`\n${errori} disallineamenti fra JavaScript e GLSL.`);
  process.exit(1);
}
console.log(`✓ ${SUPERFICI.length} superfici: uniform dichiarate e valorizzate combaciano`);
