import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  deleteUser: vi.fn(),
  rateLimit: vi.fn(),
  envReport: vi.fn(),
  revalidate: vi.fn(),
  transaction: vi.fn(),
  queue: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    uploadedFile: { updateMany: mocks.queue },
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      delete: mocks.deleteUser,
    },
  },
}));
vi.mock("@/lib/rate-limit", () => ({ clientKey: () => "test", rateLimit: mocks.rateLimit }));
vi.mock("@/lib/env", () => ({ envReport: mocks.envReport }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));
vi.mock("@/lib/gamification", () => ({ syncProfileQuest: vi.fn() }));
vi.mock("@/lib/reputazione-server", () => ({ ricalcolaReputazione: vi.fn() }));
vi.mock("@/lib/upload-cleanup", () => ({ cleanupPendingUploads: vi.fn() }));

import { guard } from "@/lib/api";
import { DELETE } from "@/app/api/profile/route";
import { GET as esporta } from "@/app/api/profile/esporta/route";
import { GET as health } from "@/app/api/health/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "test-id" } });
  mocks.rateLimit.mockResolvedValue({ ok: true });
});
const richiesta = (conferma = "Persona Test") =>
  new Request("http://localhost/api/profile", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conferma }),
  });

describe("gestione dei propri dati prima dell'onboarding", () => {
  it("esporta i dati dell'account autenticato incompleto", async () => {
    mocks.findUnique.mockResolvedValue({
      slug: "persona-test",
      disciplines: "",
      _count: { followers: 0, following: 0 },
    });
    const res = await esporta(richiesta());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({ id: "test-id" });
    expect((await res.json()).profilo.slug).toBe("persona-test");
  });
  it("cancella un account incompleto solo dopo la conferma", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "test-id",
      name: "Persona Test",
      slug: "persona-test",
      password: null,
      citySlug: null,
    });
    expect((await DELETE(richiesta())).status).toBe(200);
    expect(mocks.deleteUser).toHaveBeenCalledWith({ where: { id: "test-id" } });
    expect(mocks.queue).toHaveBeenCalledWith({
      where: { ownerId: "test-id" },
      data: { deleteRequestedAt: expect.any(Date) },
    });
    expect(mocks.transaction).toHaveBeenCalled();
  });
  it("non cancella dopo una conferma errata", async () => {
    mocks.findUnique.mockResolvedValue({ id: "test-id", name: "Persona Test", password: null });
    expect((await DELETE(richiesta("altro nome"))).status).toBe(403);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("rifiuta esportazione e cancellazione senza sessione", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await esporta(richiesta())).status).toBe(401);
    expect((await DELETE(richiesta())).status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("continua a bloccare le altre operazioni per un profilo incompleto", async () => {
    mocks.findUnique.mockResolvedValue({ ruoloSceltoIl: null });
    expect((await guard(richiesta(), { scope: "post" })).error?.status).toBe(403);
  });
  it("ammette le operazioni ordinarie dopo il completamento", async () => {
    mocks.findUnique.mockResolvedValue({ ruoloSceltoIl: new Date() });
    expect((await guard(richiesta(), { scope: "post" })).error).toBeNull();
  });
  it("mantiene il limite di richieste anche per l'esportazione", async () => {
    mocks.rateLimit.mockResolvedValue({ ok: false, resetAt: Date.now() + 1000 });
    expect((await esporta(richiesta())).status).toBe(429);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});

describe("diagnostica pubblica minima", () => {
  it("risponde senza rivelare dati o configurazione", async () => {
    mocks.findFirst.mockResolvedValue({ id: "non-deve-uscire" });
    mocks.envReport.mockReturnValue({ valid: true, features: { segreto: true } });
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "healthy" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
  it("oscura anche gli errori della connessione", async () => {
    mocks.findFirst.mockRejectedValue(new Error("postgres://credenziali@host-privato"));
    const res = await health();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded" });
  });
  it("segnala configurazione incompleta senza elencarne i valori", async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.envReport.mockReturnValue({ valid: false, errors: ["valore-riservato"] });
    const res = await health();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "degraded" });
  });
});
