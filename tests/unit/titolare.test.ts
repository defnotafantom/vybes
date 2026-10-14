import { afterEach, expect, it, vi } from "vitest";
const fields = ["NOME", "INDIRIZZO", "FISCALE", "EMAIL", "FORO"];
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("mantiene l'informativa incompleta quando mancano i riferimenti", async () => {
  vi.resetModules();
  for (const field of fields) vi.stubEnv(`TITOLARE_${field}`, "");
  const { TITOLARE, titolareCompleto } = await import("@/lib/titolare");
  expect(titolareCompleto()).toBe(false);
  expect(Object.values(TITOLARE).every((v) => v === "")).toBe(true);
});
it("legge i riferimenti configurati sul server e considera vuoto lo spazio bianco", async () => {
  vi.resetModules();
  for (const field of fields) vi.stubEnv(`TITOLARE_${field}`, " Demo ");
  const complete = await import("@/lib/titolare");
  expect(complete.titolareCompleto()).toBe(true);
  expect(complete.TITOLARE.nome).toBe("Demo");
  vi.stubEnv("TITOLARE_FISCALE", "  ");
  vi.resetModules();
  const incomplete = await import("@/lib/titolare");
  expect(incomplete.titolareCompleto()).toBe(false);
});
