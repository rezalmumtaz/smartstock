"use client";

import { useState } from "react";
import { IconPlus, IconWarehouse } from "@/components/icons";
import { Badge, Button, Field, Input, PageHeader, Sheet, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { errorMessage, supabase } from "@/lib/supabase";
import type { Warehouse } from "@/lib/types";

export default function GudangPage() {
  const { tenant, isOwner, warehouses, refresh } = useApp();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<Warehouse> | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !edit?.name?.trim()) return;
    setBusy(true);
    const sb = supabase();
    const { error } = edit.id
      ? await sb.from("warehouses").update({ name: edit.name.trim(), is_hidden: !!edit.is_hidden }).eq("id", edit.id)
      : await sb.from("warehouses").insert({ tenant_id: tenant.id, name: edit.name.trim() });
    setBusy(false);
    if (error) { toast(error.code === "23505" ? "Nama gudang sudah dipakai" : errorMessage(error), "err"); return; }
    toast(edit.id ? "Gudang diperbarui" : "Gudang ditambahkan");
    setEdit(null);
    refresh();
  }

  return (
    <>
      <PageHeader title="Gudang" back="/pengaturan"
        right={isOwner ? <button onClick={() => setEdit({ name: "" })} className="flex h-11 items-center gap-1.5 rounded-xl2 bg-brand px-3 text-sm font-bold text-white"><IconPlus size={18} />Gudang</button> : undefined} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        {!isOwner ? <p className="rounded-xl2 bg-canvas p-3 text-sm text-ink-3">Anda admin gudang. Hanya gudang yang ditugaskan ke Anda yang tampil di sini.</p> : null}
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          {warehouses.map((w) => (
            <button key={w.id} disabled={!isOwner} onClick={() => setEdit(w)} className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-3.5 text-left last:border-b-0 enabled:active:bg-canvas">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><IconWarehouse size={19} /></span>
              <span className="flex-1 text-[15px] font-semibold">{w.name}</span>
              {w.is_hidden ? <Badge>Disembunyikan</Badge> : null}
            </button>
          ))}
        </section>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Ubah gudang" : "Gudang baru"}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Nama gudang" htmlFor="wn"><Input id="wn" autoFocus required value={edit?.name ?? ""} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} /></Field>
          {edit?.id ? (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={!!edit.is_hidden} onChange={(e) => setEdit((x) => ({ ...x, is_hidden: e.target.checked }))} className="h-5 w-5 accent-[#0E7C66]" />
              Sembunyikan dari pilihan tujuan transfer
            </label>
          ) : null}
          <Button type="submit" loading={busy}>Simpan</Button>
        </form>
      </Sheet>
    </>
  );
}
