"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "./icons";

/**
 * Pemindai barcode via kamera (ZXing). Mendukung juga pemindai eksternal /
 * ketik manual lewat kolom input di bawah.
 */
export default function Scanner({ onDetected, onClose, title = "Scan barcode", continuous = false, footer }: {
  onDetected: (code: string) => void;
  onClose: () => void;
  title?: string;
  continuous?: boolean;
  footer?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const cb = useRef(onDetected);
  cb.current = onDetected;

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current || cancelled) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            // abaikan hasil sama dalam 1,5 detik (kamera membaca berkali-kali)
            if (code === last.current.code && now - last.current.at < 1500) return;
            last.current = { code, at: now };
            try { navigator.vibrate?.(60); } catch { /* abaikan */ }
            cb.current(code);
            if (!continuous) controls.stop();
          },
        );
        stop = () => controls.stop();
        if (cancelled) controls.stop();
      } catch (e) {
        const msg = (e as Error)?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan browser."
          : "Kamera tidak bisa dibuka. Gunakan kolom input di bawah untuk mengetik atau memakai pemindai eksternal.";
        setError(msg);
      }
    })();
    return () => { cancelled = true; stop?.(); };
  }, [continuous]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    setManual("");
    onDetected(code);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F14] text-white">
      <header className="flex h-16 items-center gap-2 px-3">
        <button onClick={onClose} aria-label="Tutup scanner" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><IconX /></button>
        <span className="flex-1 text-center text-[15px] font-bold">{title}</span>
        <span className="w-11" />
      </header>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
        <div className="relative h-44 w-72 rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
          <span className="absolute inset-x-4 top-1/2 h-0.5 bg-[#3CCB9E]" />
        </div>
        {error ? <p className="absolute inset-x-6 bottom-6 rounded-xl2 bg-black/70 p-3 text-center text-sm">{error}</p> : null}
      </div>
      <div className="flex flex-col gap-3 rounded-t-3xl bg-white p-4 text-ink pb-safe">
        <form onSubmit={submitManual} className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ketik barcode / pakai scanner eksternal" aria-label="Barcode manual"
            className="h-12 min-w-0 flex-1 rounded-xl2 border border-line-strong px-3 text-[15px] outline-none focus:border-brand" />
          <button type="submit" className="h-12 rounded-xl2 bg-brand px-4 font-bold text-white">Pakai</button>
        </form>
        {footer}
      </div>
    </div>
  );
}
