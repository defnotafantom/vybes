/**
 * Ogni `var(--qualcosa)` deve puntare a una variabile che esiste.
 *
 * ── Perché serve un controllo apposta ──
 *
 * Una variabile CSS inesistente **non è un errore**. Il browser scarta la
 * dichiarazione in silenzio e la proprietà resta al valore che aveva prima:
 * niente in console, niente in build, niente nei tipi. Il risultato è un
 * colore sbagliato, o — nel caso che ha fatto nascere questo script — testo
 * nero su fondo nero.
 *
 * ── Il caso vero ──
 *
 * Scrivendo il tema dei comandi della mappa ho usato `var(--ink)` e
 * `var(--ink-muted)`, che non esistono: le variabili si chiamano `--fg` e
 * `--muted`. `--ink` è il nome **Tailwind** (`text-ink`), che la
 * configurazione mappa su `--fg`; i due vocabolari si somigliano abbastanza
 * da confondersi e non coincidono.
 *
 * Sarebbe finito in produzione come «i comandi dello zoom sono spariti», e la
 * causa sarebbe stata cercata in Leaflet.
 *
 * ── Cosa esclude ──
 *
 * Le variabili passate da JavaScript con `style={{ "--dx": … }}`: esistono a
 * tempo di esecuzione e non possono comparire in un foglio di stile. Sono
 * elencate a mano, poche e riconoscibili — un elenco che si allunga di rado è
 * meno peggio di un controllo che non trova niente.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Iniettate da JS al momento del rendering: vedi ElencoQuest, Logo, Onde. */
const A_TEMPO_DI_ESECUZIONE = new Set(["--dx", "--dy", "--px", "--py", "--rot"]);

function fogli(cartella = "src") {
  const fuori = [];
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name);
    if (voce.isDirectory()) fuori.push(...fogli(percorso));
    else if (voce.name.endsWith(".css")) fuori.push(percorso);
  }
  return fuori;
}

const file = fogli();
const definite = new Set();
const usate = [];

for (const f of file) {
  const testo = readFileSync(f, "utf8");
  for (const m of testo.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) definite.add(m[1]);
  for (const m of testo.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
    usate.push({ nome: m[1], file: f });
  }
}

const orfane = usate.filter(
  (u) => !definite.has(u.nome) && !A_TEMPO_DI_ESECUZIONE.has(u.nome)
);

if (orfane.length > 0) {
  console.error("\n✗ Variabili CSS usate e mai definite:\n");
  for (const o of new Map(orfane.map((o) => [`${o.nome}|${o.file}`, o])).values()) {
    console.error(`  ${o.nome}  in ${o.file}`);
  }
  console.error(
    "\nUna var() inesistente non dà errore: il browser scarta la riga e la\n" +
      "proprietà resta com'era. Controlla i nomi — quelli Tailwind (--ink)\n" +
      "non sono quelli CSS (--fg).\n"
  );
  process.exit(1);
}

console.log(
  `✓ ${file.length} fogli di stile: ${definite.size} variabili definite, tutte le var() risolvono`
);
