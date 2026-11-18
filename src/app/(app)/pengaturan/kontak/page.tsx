"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus, IconUsers } from "@/components/icons";
import { Badge, Button, cx, Empty, Field, Input, PageHeader, Sheet, Spinner, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { errorMessage, supabase } from "@/lib/supabase";

interface ContactRow { id: string; contact_type: "supplier" | "customer"; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null }

export default function KontakPage() {
  const { tenant } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<"supplier" | "customer">("supplier");
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [edit, setEdit] = useState<Partial<ContactRow> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase().from("contacts").select("*").eq("tenant_id", tenant.id).eq("contact_type", tab).eq("is_hidden", false).order("name");
    setRows((data ?? []) as ContactRow[]);
  }, [tenant, tab]);
  useEffect(() => { setRows(null); load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !edit?.name?.trim()) return;
    setBusy(true);
    const payload = { tenant_id: tenant.id, contact_type: edit.contact_type ?? tab, name: edit.name.trim(), phone: edit.phone || null, email: edit.email || null, address: edit.address || null, notes: edit.notes || null };
    const sb = supabase();
    const { error } = edit.id ? await sb.from("contacts").update(payload).eq("id", edit.id) : await sb.from("contacts").insert(payload);
    setBusy(false);
    if (error) { toast(errorMessage(error), "err"); return; }
    toast("Kontak disimpan"); setEdit(null); load();
  }

  return (
    <>
      <PageHeader title="Pemasok & pelanggan" back="/pengaturan"
        right={<button onClick={() => setEdit({ contact_type: tab })} className="flex h-11 items-center gap-1.5 rounded-xl2 bg-brand px-3 text-sm font-bold text-white"><IconPlus size={18} />Kontak</button>} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <div className="flex gap-1.5 rounded-xl2 bg-[#F2F4F7] p-1">
          {(["supplier", "customer"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cx("h-10 flex-1 rounded-[10px] text-[13px] font-bold", tab === t ? "bg-white shadow-sm" : "text-ink-muted")}>{t === "supplier" ? "Pemasok" : "Pelanggan"}</button>
          ))}
        </div>
        {!rows ? <Spinner /> : rows.length === 0 ? <Empty icon={<IconUsers />} title={`Belum ada ${tab === "supplier" ? "pemasok" : "pelanggan"}`}>Tambah manual atau impor dari Excel.</Empty> : (
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            {rows.map((c) => (
              <button key={c.id} onClick={() => setEdit(c)} className="flex w-full items-center gap-3 border-b border-[#EEF0F3] px-4 py-3.5 text-left last:border-b-0 active:bg-canvas">
                <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-semibold">{c.name}</span><span className="truncate text-xs text-ink-muted">{[c.phone, c.address].filter(Boolean).join(" · ") || "-"}</span></span>
                <Badge>{c.contact_type === "supplier" ? "Pemasok" : "Pelanggan"}</Badge>
              </button>
            ))}
          </section>
        )}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Ubah kontak" : "Kontak baru"}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Nama" htmlFor="cn"><Input id="cn" required value={edit?.name ?? ""} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telepon / WA" htmlFor="cp"><Input id="cp" inputMode="tel" value={edit?.phone ?? ""} onChange={(e) => setEdit((x) => ({ ...x, phone: e.target.value }))} /></Field>
            <Field label="Email" htmlFor="ce"><Input id="ce" type="email" value={edit?.email ?? ""} onChange={(e) => setEdit((x) => ({ ...x, email: e.target.value }))} /></Field>
          </div>
          <Field label="Alamat" htmlFor="ca"><Textarea id="ca" value={edit?.address ?? ""} onChange={(e) => setEdit((x) => ({ ...x, address: e.target.value }))} /></Field>
          <Button type="submit" loading={busy}>Simpan</Button>
        </form>
      </Sheet>
    </>
  );
}
