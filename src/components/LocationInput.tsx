"use client";

import { useId } from "react";
import { IconPin } from "./icons";

/** Isian lokasi simpan dengan saran dari lokasi yang sudah pernah dipakai di gudang itu. */
export default function LocationInput({ value, onChange, suggestions, id, label }: { value: string; onChange: (v: string) => void; suggestions: string[]; id?: string; label?: string }) {
  const auto = useId();
  const listId = `${id ?? auto}-list`;
  return (
    <label className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong bg-white px-3 focus-within:border-brand">
      <IconPin size={16} className="flex-none text-indigo" />
      <input id={id} list={listId} value={value} maxLength={120} onChange={(e) => onChange(e.target.value)} aria-label={label ?? "Lokasi simpan"}
        placeholder="Lokasi, contoh: Lt 1 · Rak kanan · atas" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted" />
      <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
    </label>
  );
}
