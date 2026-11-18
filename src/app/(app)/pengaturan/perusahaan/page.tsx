"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, PageHeader, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { errorMessage, supabase } from "@/lib/supabase";

export default function PerusahaanPage() {
  const { tenant, isOwner, refresh } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ name: "", address: "", email: "", phone: "", npwp: "", bank_account: "", locked_until: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tenant) setF({ name: tenant.name, address: tenant.address ?? "", email: tenant.email ?? "", phone: tenant.phone ?? "", npwp: tenant.npwp ?? "", bank_account: tenant.bank_account ?? "", locked_until: tenant.locked_until ?? "" });
  }, [tenant]);

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setBusy(true);
    const { error } = await supabase().from("tenants").update({
      name: f.name.trim(), address: f.address || null, email: f.email || null, phone: f.phone || null,
      npwp: f.npwp || null, bank_account: f.bank_account || null, locked_until: f.locked_until || null,
    }).eq("id", tenant.id);
    setBusy(false);
    if (error) toast(errorMessage(error), "err"); else { toast("Data perusahaan disimpan"); refresh(); }
  }

  if (!isOwner) return <><PageHeader title="Perusahaan saya" back="/pengaturan" /><p className="p-6 text-center text-sm text-ink-muted">Hanya owner yang bisa mengubah data perusahaan.</p></>;

  return (
    <>
      <PageHeader title="Perusahaan saya" back="/pengaturan" />
      <form onSubmit={save} className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <Card className="flex flex-col gap-4">
          <Field label="Nama perusahaan" htmlFor="n"><Input id="n" required value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Alamat" htmlFor="a"><Textarea id="a" value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" htmlFor="e"><Input id="e" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Telepon" htmlFor="p"><Input id="p" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NPWP" htmlFor="t"><Input id="t" value={f.npwp} onChange={(e) => set("npwp", e.target.value)} /></Field>
            <Field label="Nomor rekening" htmlFor="b"><Input id="b" value={f.bank_account} onChange={(e) => set("bank_account", e.target.value)} /></Field>
          </div>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">Kunci periode</h2>
          <Field label="Dokumen sampai tanggal ini tidak bisa diposting atau dibatalkan" htmlFor="l" hint="Kosongkan bila tidak ingin mengunci periode">
            <Input id="l" type="date" value={f.locked_until} onChange={(e) => set("locked_until", e.target.value)} />
          </Field>
        </Card>
        <Button type="submit" loading={busy}>Simpan</Button>
      </form>
    </>
  );
}
