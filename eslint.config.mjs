import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

/**
 * Configurazione ESLint in formato "flat", quello previsto da ESLint 9.
 *
 * Alla base c'è il preset di Next, che porta con sé le regole su Core Web
 * Vitals: segnala per esempio un <img> al posto di next/image, che su questo
 * progetto è un errore concreto perché peggiora LCP e CLS.
 */
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "public/**", "prisma/migrations/**"],
  },
  {
    rules: {
      // Le variabili con underscore iniziale sono volutamente inutilizzate
      // (parametri di callback che servono solo per posizione).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // `any` va usato consapevolmente, non per pigrizia: warning, non errore,
      // così non blocca ma resta visibile.
      "@typescript-eslint/no-explicit-any": "warn",
      // console.log dimenticati in produzione sono rumore; warn ed error sono
      // legittimi e restano ammessi.
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
];
