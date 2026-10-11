import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ unlink: vi.fn(), del: vi.fn() }));
vi.mock("node:fs/promises", () => ({ unlink: mocks.unlink, mkdir: vi.fn(), writeFile: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del: mocks.del }));
vi.mock("@/lib/moderazione-immagini", () => ({ moderaImmagine: vi.fn() }));
import { deleteFile } from "@/lib/upload";
beforeEach(() => vi.resetAllMocks());
describe("rimozione limitata ai file gestiti", () => {
  it("rifiuta percorsi arbitrari e attraversamenti di directory", async () => {
    for (const url of ["/uploads/../../.env", "/uploads/avatar/../file.jpg", "/etc/passwd"]) {
      await expect(deleteFile(url)).rejects.toThrow("Percorso upload non riconosciuto");
    }
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
  it("rifiuta storage esterni e credenziali negli URL", async () => {
    for (const url of ["https://example.test/file.jpg", "https://user:pass@test.public.blob.vercel-storage.com/file.jpg"]) {
      await expect(deleteFile(url)).rejects.toThrow("Storage non riconosciuto");
    }
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it("considera riuscito un nuovo tentativo su file locale già rimosso", async () => {
    mocks.unlink.mockRejectedValue(Object.assign(new Error("not found"), { code: "ENOENT" }));
    await expect(deleteFile("/uploads/avatar/00000000-0000-4000-8000-000000000001.jpg")).resolves.toBeUndefined();
  });
  it("propaga un guasto storage per conservarne la richiesta", async () => {
    mocks.del.mockRejectedValue(new Error("storage offline"));
    await expect(deleteFile("https://test.public.blob.vercel-storage.com/avatar/file.jpg")).rejects.toThrow("storage offline");
  });
});
