"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { IconBack, IconMinus, IconPlus, IconX } from "./icons";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({ variant = "primary", className, loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-[#9DCFC4]",
    secondary: "bg-white text-ink-2 border border-line-strong hover:bg-canvas disabled:text-ink-muted",
    ghost: "bg-transparent text-brand hover:bg-brand-soft",
    danger: "bg-white text-danger border border-[#FDA29B] hover:bg-danger-soft",
  }[variant];
  return (
    <button {...rest} disabled={rest.disabled || loading}
      className={cx("inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl2 text-[15px] font-bold transition-colors disabled:cursor-not-allowed", v, className)}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-3">{label}</label>
      {children}
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx("h-12 w-full rounded-xl2 border border-line-strong bg-white px-3 text-[15px] text-ink outline-none placeholder:text-[#98A2B3] focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-canvas", className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cx("h-12 w-full rounded-xl2 border border-line-strong bg-white px-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", className)}>{children}</select>;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx("min-h-[80px] w-full rounded-xl2 border border-line-strong bg-white p-3 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20", className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("rounded-2xl border border-line bg-white p-4", className)}>{children}</section>;
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "green" | "amber" | "indigo" | "red"; children: ReactNode }) {
  const t = {
    gray: "bg-[#F2F4F7] text-ink-3",
    green: "bg-brand-soft text-brand",
    amber: "bg-warn-soft text-warn",
    indigo: "bg-indigo-soft text-indigo",
    red: "bg-danger-soft text-danger",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

/** Header halaman dengan tombol kembali (mobile-first). */
export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: ReactNode; back?: string | true; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-white/95 px-3 backdrop-blur lg:px-6">
      {back ? (
        typeof back === "string"
          ? <Link href={back} aria-label="Kembali" className="flex h-11 w-11 items-center justify-center rounded-xl2 hover:bg-canvas"><IconBack size={22} /></Link>
          : <button onClick={() => router.back()} aria-label="Kembali" className="flex h-11 w-11 items-center justify-center rounded-xl2 hover:bg-canvas"><IconBack size={22} /></button>
      ) : <span className="w-1" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate text-[17px] font-bold lg:text-xl">{title}</h1>
        {subtitle ? <span className="truncate text-xs text-ink-muted">{subtitle}</span> : null}
      </div>
      {right}
    </header>
  );
}

export function Stepper({ value, onChange, min = 0, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const clamp = (v: number) => Math.max(min, max === undefined ? v : Math.min(max, v));
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Kurangi" onClick={() => onChange(clamp(value - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl2 border border-line-strong bg-white active:bg-canvas"><IconMinus size={16} /></button>
      <input aria-label="Jumlah" inputMode="decimal" value={String(value)} onChange={(e) => { const n = Number(e.target.value.replace(",", ".")); if (Number.isFinite(n)) onChange(clamp(n)); }}
        className="h-10 w-16 rounded-xl2 border border-line-strong text-center text-[17px] font-bold outline-none focus:border-brand" />
      <button type="button" aria-label="Tambah" onClick={() => onChange(clamp(value + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl2 border border-line-strong bg-white active:bg-canvas"><IconPlus size={16} /></button>
    </div>
  );
}

/** Bottom sheet di mobile, dialog di desktop. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white lg:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-xl2 hover:bg-canvas"><IconX /></button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon ? <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-muted ring-1 ring-line">{icon}</div> : null}
      <p className="text-[15px] font-bold">{title}</p>
      {children ? <div className="max-w-xs text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}

export function Spinner({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />{label}
    </div>
  );
}

/* ---------- Toast ---------- */
type Toast = { id: number; text: string; tone: "ok" | "err" };
const ToastCtx = createContext<(text: string, tone?: "ok" | "err") => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === "err" ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto max-w-md rounded-xl2 px-4 py-3 text-sm font-semibold shadow-lg", t.tone === "ok" ? "bg-ink text-white" : "bg-danger text-white")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
