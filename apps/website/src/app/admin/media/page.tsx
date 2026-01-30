"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";

type MediaItem = {
  id: string;
  bucket: string;
  path: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string | null;
  created_at: string;
};

const readImageMetadata = (file: File) =>
  new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

const readVideoMetadata = (file: File) =>
  new Promise<
    { width: number; height: number; duration_seconds: number } | null
  >((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration_seconds: video.duration,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });

const guessKind = (file: File) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
};

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("media")
      .select(
        "id, bucket, path, kind, mime_type, size_bytes, width, height, duration_seconds, alt_text, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setNotice(null);
    setError(null);

    for (const file of files) {
      const safeName = file.name.replace(/\s+/g, "-");
      const timestamp = new Date();
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, "0");
      const path = `media/${year}/${month}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const kind = guessKind(file);
      let width: number | null = null;
      let height: number | null = null;
      let durationSeconds: number | null = null;

      if (kind === "image") {
        const meta = await readImageMetadata(file);
        width = meta?.width ?? null;
        height = meta?.height ?? null;
      }

      if (kind === "video") {
        const meta = await readVideoMetadata(file);
        width = meta?.width ?? null;
        height = meta?.height ?? null;
        durationSeconds = meta?.duration_seconds ?? null;
      }

      const { error: insertError } = await supabase.from("media").insert({
        path,
        kind,
        mime_type: file.type,
        size_bytes: file.size,
        width,
        height,
        duration_seconds: durationSeconds,
      });

      if (insertError) {
        setError(insertError.message);
      }
    }

    event.target.value = "";
    setNotice("Upload complete.");
    setUploading(false);
    fetchMedia();
  };

  const list = useMemo(
    () =>
      items.map((item) => {
        const { data } = supabase.storage
          .from(item.bucket)
          .getPublicUrl(item.path);
        return { ...item, publicUrl: data.publicUrl };
      }),
    [items]
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Media uploads
        </h2>
        <p className="mt-2 text-sm text-[#4D3F33]">
          Upload images, video, or documents to the public media bucket.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="rounded-full bg-[#4CAF50] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white">
            <input
              type="file"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            {uploading ? "Uploading..." : "Upload files"}
          </label>
          {notice ? (
            <span className="text-sm text-[#2F3E2E]">{notice}</span>
          ) : null}
          {error ? (
            <span className="text-sm text-[#B4321E]">{error}</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E3D4BA] bg-white/70 p-6">
        <h3 className="text-xl font-semibold text-[#2F3E2E] font-[var(--font-display)]">
          Recent media
        </h3>
        {loading ? (
          <p className="mt-4 text-sm text-[#4D3F33]">Loading...</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-[#E3D4BA] bg-white/80 p-4"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#E3D4BA] bg-[#F7F2E8]">
                  {item.kind === "image" ? (
                    <img
                      src={item.publicUrl}
                      alt={item.alt_text ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : item.kind === "video" ? (
                    <video
                      src={item.publicUrl}
                      className="h-full w-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.3em] text-[#6B5A45]">
                      {item.kind}
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-xs text-[#6B5A45]">
                  <p className="uppercase tracking-[0.3em]">{item.kind}</p>
                  <p>{item.path}</p>
                  <p>
                    {item.width && item.height
                      ? `${item.width}x${item.height}`
                      : ""}
                    {item.duration_seconds
                      ? ` - ${item.duration_seconds.toFixed(1)}s`
                      : ""}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(item.id)}
                    className="rounded-full border border-[#E3D4BA] px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                  >
                    Copy ID
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(item.publicUrl)}
                    className="rounded-full border border-[#E3D4BA] px-3 py-1 text-[10px] uppercase tracking-[0.3em]"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ))}
            {list.length === 0 ? (
              <p className="text-sm text-[#4D3F33]">No media yet.</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
