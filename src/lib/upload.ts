import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_TYPES: Record<string, { ext: string; kind: "image" | "video" | "audio" }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "audio/mpeg": { ext: "mp3", kind: "audio" },
  "audio/wav": { ext: "wav", kind: "audio" },
  "audio/ogg": { ext: "ogg", kind: "audio" },
};

export type UploadResult = { url: string; kind: "image" | "video" | "audio"; bytes: number };

type Driver = "vercel-blob" | "local";

function driver(): Driver {
  const configured = process.env.UPLOAD_DRIVER;
  if (configured === "vercel-blob" || configured === "local") return configured;
  // Su Vercel il filesystem e' effimero: il default sicuro e' il Blob store.
  return process.env.VERCEL ? "vercel-blob" : "local";
}

/**
 * Salva un file caricato e restituisce l'URL pubblico.
 *
 * Due driver:
 *  - "vercel-blob": storage persistente su CDN, obbligatorio in produzione.
 *    Il filesystem delle funzioni Vercel e' read-only e comunque effimero:
 *    qualsiasi file scritto su disco sparisce al deploy successivo.
 *  - "local": scrive in public/uploads. Solo per lo sviluppo.
 */
export async function storeFile(file: File, folder = "misc"): Promise<UploadResult> {
  const meta = ALLOWED_TYPES[file.type];
  if (!meta) throw new Error(`Tipo di file non consentito: ${file.type}`);
  if (file.size > MAX_FILE_BYTES) throw new Error("File troppo grande (max 15 MB)");
  if (file.size === 0) throw new Error("File vuoto");

  const buffer = Buffer.from(await file.arrayBuffer());

  // Il MIME dichiarato dal client non e' affidabile: si verifica il contenuto.
  if (!matchesMagicBytes(buffer, file.type)) {
    throw new Error("Il contenuto del file non corrisponde al tipo dichiarato");
  }

  const filename = `${randomUUID()}.${meta.ext}`;
  const key = `${folder}/${filename}`;

  if (driver() === "vercel-blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, buffer, {
      access: "public",
      contentType: file.type,
      // addRandomSuffix disattivato: il nome e' gia' un UUID, cosi' l'URL
      // resta prevedibile e la cancellazione e' possibile.
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
    return { url: blob.url, kind: meta.kind, bytes: buffer.length };
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return { url: `/uploads/${key}`, kind: meta.kind, bytes: buffer.length };
}

/**
 * Rimuove un file caricato. Non solleva: la cancellazione dello storage e'
 * accessoria rispetto a quella del record, e un file orfano e' meno grave di
 * un'operazione utente fallita.
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    if (url.startsWith("http")) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      await unlink(path.join(process.cwd(), "public", url));
    }
  } catch (e) {
    console.warn("[upload] cancellazione non riuscita", url, e);
  }
}

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8,
  "image/png": (b) => b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
  "image/gif": (b) => b.subarray(0, 3).toString("ascii") === "GIF",
  "image/webp": (b) =>
    b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  "image/avif": (b) => b.subarray(4, 8).toString("ascii") === "ftyp",
  "video/mp4": (b) => b.subarray(4, 8).toString("ascii") === "ftyp",
  "video/webm": (b) => b.subarray(0, 4).toString("hex") === "1a45dfa3",
  "audio/mpeg": (b) =>
    b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
  "audio/wav": (b) => b.subarray(0, 4).toString("ascii") === "RIFF",
  "audio/ogg": (b) => b.subarray(0, 4).toString("ascii") === "OggS",
};

function matchesMagicBytes(buffer: Buffer, mime: string): boolean {
  const check = MAGIC[mime];
  return check ? check(buffer) : false;
}
