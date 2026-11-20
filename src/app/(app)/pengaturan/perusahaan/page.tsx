"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, Field, Input, PageHeader, Textarea, useToast } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { removeLogoFile, uploadLogo } from "@/lib/logo";
import { errorMessage, supabase } from "@/lib/supabase";

export default function PerusahaanPage() {
  const { tenant, isOwner, refresh } = useApp();
  const toast = useToast();
  const [f, setF] = useState({ name: "", address: "", email: "", phone: "", npwp: "", bank_account: "", locked_until: "" });
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function changeLogo(file: File | undefined) {
    if (!tenant || !file) return;
    setLogoBusy(true);
    try {
      const url = await uploadLogo(tenant.id, file);
      const { error } = await supabase().from("tenants").update({ logo_url: url }).eq("id", tenant.id);
      if (error) throw error;
      await removeLogoFile(tenant.logo_url);
      toast("Logo toko disimpan");
      await refresh();
    } catch (e) { toast(errorMessage(e), "err"); } finally { setLogoBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function deleteLogo() {
    if (!tenant?.logo_url || !confirm("Hapus logo toko?")) return;
    setLogoBusy(true);
    const { error } = await supabase().from("tenants").update({ logo_url: null }).eq("id", tenant.id);
    if (error) toast(errorMessage(error), "err");
    else { await removeLogoFile(tenant.logo_url); toast("Logo dihapus"); await refresh(); }
    setLogoBusy(false);
  }

  if (!isOwner) return <><PageHeader title="Perusahaan saya" back="/pengaturan" /><p className="p-6 text-center text-sm text-ink-muted">Hanya owner yang bisa mengubah data perusahaan.</p></>;

  return (
    <>
      <PageHeader title="Perusahaan saya" back="/pengaturan" />
      <form onSubmit={save} className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">Logo toko</h2>
          <div className="flex items-center gap-4">
            <span className="flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-2xl border border-line bg-[repeating-conic-gradient(#F2F4F7_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
              {tenant?.logo_url ? <img src={tenant.logo_url} alt="Logo toko" className="h-full w-full object-contain p-1.5" /> : <span className="px-2 text-center text-xs text-ink-muted">Belum ada logo</span>}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-ink-muted">Tampil di katalog, kop dokumen cetak, dan aplikasi. Pakai PNG berlatar transparan agar paling rapi.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" loading={logoBusy} onClick={() => fileRef.current?.click()} className="h-10 px-3 text-sm">{tenant?.logo_url ? "Ganti logo" : "Unggah logo"}</Button>
                {tenant?.logo_url ? <Button type="button" variant="danger" disabled={logoBusy} onClick={deleteLogo} className="h-10 px-3 text-sm">Hapus</Button> : null}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => changeLogo(e.target.files?.[0])} />
          </div>
        </Card>
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
