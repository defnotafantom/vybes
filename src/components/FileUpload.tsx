"use client";

import { useRef, useState } from "react";
import { compressImage, formatBytes, type ImagePreset } from "@/lib/image-client";

export type UploadedFile = { url: string; kind: "image" | "video" | "audio"; bytes: number };

/**
 * Upload con compressione preventiva nel browser e stato leggibile.
 * `folder` fa da preset di compressione oltre che da destinazione.
 */
export function FileUpload({
  folder,
  accept = "image/*,video/mp4,audio/mpeg",
  label = "Allega un file",
  onUploaded,
}: {
  folder: ImagePreset | string;
  accept?: string;
  label?: string;
  onUploaded: (file: UploadedFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    setMessage(null);

    try {
      let toSend = original;
      const preset = (["avatar", "post", "evento", "portfolio"] as const).find((p) => p === folder);

      if (preset && original.type.startsWith("image/")) {
        setStatus("compressing");
        const result = await compressImage(original, preset);
        toSend = result.file;
        if (result.compressed) {
          setMessage(
            `Ottimizzata: ${formatBytes(result.originalBytes)} → ${formatBytes(result.finalBytes)}`
          );
        }
      }

      setStatus("uploading");
      const body = new FormData();
      body.append("file", toSend);
      body.append("folder", String(folder));

      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload non riuscito");

      onUploaded(json.data);
      setStatus("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload non riuscito");
      setStatus("error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = status === "compressing" || status === "uploading";

  return (
    <div>
      <label className={`btn-ghost ${busy ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
        {status === "compressing" ? "Ottimizzazione…" : status === "uploading" ? "Caricamento…" : label}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={handleChange}
          disabled={busy}
        />
      </label>

      <p aria-live="polite" className="mt-1 text-xs">
        {status === "done" && (
          <span className="text-green-600">File caricato{message ? ` · ${message}` : ""}</span>
        )}
        {status === "error" && <span className="text-red-600">{message}</span>}
        {status === "compressing" && message && <span className="muted">{message}</span>}
      </p>
    </div>
  );
}
