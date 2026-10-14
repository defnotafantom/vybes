/** Riferimenti pubblici configurati sul server, separati dal codice del portfolio. */
export const TITOLARE = {
  nome: process.env.TITOLARE_NOME?.trim() ?? "",
  indirizzo: process.env.TITOLARE_INDIRIZZO?.trim() ?? "",
  fiscale: process.env.TITOLARE_FISCALE?.trim() ?? "",
  email: process.env.TITOLARE_EMAIL?.trim() ?? "",
  foro: process.env.TITOLARE_FORO?.trim() ?? "",
} as const;

/** Le pagine mantengono l'avviso di incompletezza se manca un riferimento. */
export function titolareCompleto(): boolean {
  return Object.values(TITOLARE).every((v) => v.length > 0);
}
