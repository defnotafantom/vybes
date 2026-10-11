import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), deleteMany: vi.fn(), deleteFile: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { uploadedFile: { findMany: mocks.findMany, deleteMany: mocks.deleteMany } } }));
vi.mock("@/lib/upload", () => ({ deleteFile: mocks.deleteFile }));
import { cleanupPendingUploads } from "@/lib/upload-cleanup";
beforeEach(() => vi.resetAllMocks());
describe("cancellazioni storage ripetibili", () => {
  it("rimuove dal registro soltanto dopo la cancellazione del file", async () => {
    mocks.findMany.mockResolvedValue([{ id: "file-test", url: "https://test.public.blob.vercel-storage.com/portfolio/test.jpg" }]);
    expect(await cleanupPendingUploads("owner-test")).toEqual({ attempted: 1, removed: 1, failed: 0 });
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({ ownerId: "owner-test", deleteRequestedAt: { not: null } });
    expect(mocks.deleteFile.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteMany.mock.invocationCallOrder[0]);
  });
  it("conserva una richiesta fallita per un nuovo tentativo", async () => {
    mocks.findMany.mockResolvedValue([{ id: "file-test", url: "url-test" }]);
    mocks.deleteFile.mockRejectedValue(new Error("storage temporaneamente offline"));
    expect(await cleanupPendingUploads()).toEqual({ attempted: 1, removed: 0, failed: 1 });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
  it("continua con gli altri file quando uno fallisce", async () => {
    mocks.findMany.mockResolvedValue([{ id: "a", url: "a" }, { id: "b", url: "b" }]);
    mocks.deleteFile.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    expect(await cleanupPendingUploads()).toEqual({ attempted: 2, removed: 1, failed: 1 });
    expect(mocks.deleteMany).toHaveBeenCalledOnce();
    expect(mocks.deleteMany.mock.calls[0][0].where.id).toBe("b");
  });
});
