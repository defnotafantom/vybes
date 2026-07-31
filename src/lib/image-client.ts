"use client";

/**
 * Compressione delle immagini nel browser, prima dell'upload.
 *
 * Ha tre effetti concreti: un JPEG da 6 MB scattato col telefono parte come
 * WebP da qualche centinaio di kB, l'upload finisce in un attimo anche in 4G,
 * e sullo storage finisce un file che il browser di chi visita la pagina
 * scarica in fretta — cosa che ricade direttamente su LCP e quindi sui Core
 * Web Vitals.
 *
 * La validazione lato server in `lib/upload.ts` resta: questa è un'ottimizzazione,
 * non un controllo di sicurezza, e tutto ciò che arriva dal client è sospetto.
 */
export type ImagePreset = "avatar" | "post" | "evento" | "portfolio";

type PresetConfig = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  /** Oltre questa soglia il file viene rifiutato prima ancora di comprimerlo. */
  maxInputBytes: number;
};

const PRESETS: Record<ImagePreset, PresetConfig> = {
  avatar: { maxWidth: 512, maxHeight: 512, quality: 0.85, maxInputBytes: 15 * 1024 * 1024 },
  post: { maxWidth: 1600, maxHeight: 1600, quality: 0.82, maxInputBytes: 15 * 1024 * 1024 },
  evento: { maxWidth: 1920, maxHeight: 1080, quality: 0.85, maxInputBytes: 15 * 1024 * 1024 },
  portfolio: { maxWidth: 2000, maxHeight: 2000, quality: 0.88, maxInputBytes: 15 * 1024 * 1024 },
};

const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export type CompressResult = {
  file: File;
  originalBytes: number;
  finalBytes: number;
  /** false se il file è passato senza modifiche (GIF animate, video, audio). */
  compressed: boolean;
};

export async function compressImage(file: File, preset: ImagePreset): Promise<CompressResult> {
  const config = PRESETS[preset];

  if (file.size > config.maxInputBytes) {
    throw new Error(
      `Il file pesa ${(file.size / 1024 / 1024).toFixed(1)} MB, il massimo è ${
        config.maxInputBytes / 1024 / 1024
      } MB`
    );
  }

  // GIF animate, video e audio passano intatti: ricomprimerli su canvas
  // significherebbe perdere l'animazione o la traccia.
  if (!COMPRESSIBLE.has(file.type)) {
    return { file, originalBytes: file.size, finalBytes: file.size, compressed: false };
  }

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = fit(bitmap.width, bitmap.height, config.maxWidth, config.maxHeight);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas non disponibile");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", config.quality)
    );
    if (!blob) throw new Error("conversione fallita");

    // Se la compressione non guadagna niente (immagini già ottimizzate,
    // grafica piatta) si tiene l'originale.
    if (blob.size >= file.size) {
      return { file, originalBytes: file.size, finalBytes: file.size, compressed: false };
    }

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      file: new File([blob], name, { type: "image/webp", lastModified: Date.now() }),
      originalBytes: file.size,
      finalBytes: blob.size,
      compressed: true,
    };
  } catch (e) {
    // Un browser che non collabora non deve impedire il caricamento:
    // si manda l'originale e ci pensa il server a validarlo.
    console.warn("[image-client] compressione non riuscita, invio l'originale", e);
    return { file, originalBytes: file.size, finalBytes: file.size, compressed: false };
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if ("createImageBitmap" in window) {
    // imageOrientation: le foto da telefono hanno la rotazione nell'EXIF e
    // senza questo finirebbero ruotate.
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  throw new Error("createImageBitmap non supportato");
}

function fit(w: number, h: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
