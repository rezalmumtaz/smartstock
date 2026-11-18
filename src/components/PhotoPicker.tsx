"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "./icons";
import { supabase } from "@/lib/supabase";

export const MAX_PHOTOS = 5;
const BUCKET = "item-images";

export type Photo = { kind: "url"; url: string } | { kind: "file"; file: Blob; preview: string };

/** Perkecil foto di HP sebelum diunggah (maks 1280 px, JPEG ±80%) supaya hemat kuota & cepat. */
export async function compressImage(file: File, max = 1280, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob ?? file;
}

/** Unggah foto baru, hapus yang dibuang; kembalikan daftar URL final. */
export async function syncPhotos(tenantId: string, itemId: string, photos: Photo[], original: string[]): Promise<string[]> {
  const sb = supabase();
  const urls: string[] = [];
  for (const p of photos) {
    if (p.kind === "url") { urls.push(p.url); continue; }
    const path = `${tenantId}/${itemId}/${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from(BUCKET).upload(path, p.file, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw error;
    urls.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  const removed = original.filter((u) => !urls.includes(u)).map(pathOf).filter((x): x is string => !!x);
  if (removed.length) await sb.storage.from(BUCKET).remove(removed);
  return urls;
}

function pathOf(url: string) {
  const i = url.indexOf(`/${BUCKET}/`);
  return i >= 0 ? decodeURIComponent(url.slice(i + BUCKET.length + 2).split("?")[0]) : null;
}

export default function PhotoPicker({ photos, onChange }: { photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const latest = useRef(photos);
  latest.current = photos;

  // bebaskan memori pratinjau saat komponen ditutup
  useEffect(() => () => latest.current.forEach((p) => p.kind === "file" && URL.revokeObjectURL(p.preview)), []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const next: Photo[] = [];
    for (const f of Array.from(files).slice(0, room)) {
      if (!f.type.startsWith("image/")) continue;
      const blob = await compressImage(f);
      next.push({ kind: "file", file: blob, preview: URL.createObjectURL(blob) });
    }
    onChange([...photos, ...next]);
    setBusy(false);
  }

  function remove(i: number) {
    const p = photos[i];
    if (p.kind === "file") URL.revokeObjectURL(p.preview);
    onChange(photos.filter((_, k) => k !== i));
  }

  const src = (p: Photo) => (p.kind === "url" ? p.url : p.preview);
  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <div key={src(p)} className="relative h-20 w-20 flex-none overflow-hidden rounded-xl2 bg-canvas ring-1 ring-line">
            <button type="button" onClick={() => setView(src(p))} className="h-full w-full" aria-label={`Lihat foto ${i + 1}`}>
              <img src={src(p)} alt="" className="h-full w-full bg-white object-contain" />
            </button>
            {i === 0 ? <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">Utama</span> : null}
            <button type="button" onClick={() => remove(i)} aria-label="Hapus foto" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"><IconX size={14} /></button>
          </div>
        ))}
        {photos.length === 0 ? <div className="flex h-20 flex-1 items-center justify-center rounded-xl2 border border-dashed border-line-strong text-xs text-ink-muted">Belum ada foto</div> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={full || busy} onClick={() => cam.current?.click()} className="flex h-11 items-center justify-center gap-2 rounded-xl2 border border-line-strong text-sm font-bold text-brand disabled:opacity-50">
          <CamIcon />Kamera
        </button>
        <button type="button" disabled={full || busy} onClick={() => gal.current?.click()} className="flex h-11 items-center justify-center gap-2 rounded-xl2 border border-line-strong text-sm font-bold text-brand disabled:opacity-50">
          <GalIcon />Galeri
        </button>
      </div>
      <span className="text-xs text-ink-muted">{busy ? "Memproses foto…" : `Maks ${MAX_PHOTOS} foto. Foto pertama jadi foto utama di daftar barang.`}</span>
      <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {view ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setView(null)}>
          <img src={view} alt="Foto barang" className="max-h-full max-w-full rounded-xl" />
        </div>
      ) : null}
    </div>
  );
}

const CamIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>;
const GalIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>;
