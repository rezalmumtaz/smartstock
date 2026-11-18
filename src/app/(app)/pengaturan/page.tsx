"use client";

import Link from "next/link";
import { IconBuilding, IconChevron, IconLogout, IconUpload, IconUsers, IconWarehouse, IconBox } from "@/components/icons";
import { PageHeader, Select } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { blockedFor, ROLE_LABEL } from "@/lib/access";

export default function PengaturanPage() {
  const { isOwner, role, tenant, session, memberships, switchTenant, signOut } = useApp();
  const items = [
    { href: "/pengaturan/perusahaan", label: "Perusahaan saya", desc: "Nama, alamat, NPWP, rekening · tampil di cetakan", icon: IconBuilding, owner: true },
    { href: "/pengaturan/gudang", label: "Gudang", desc: "Tambah dan ubah gudang", icon: IconWarehouse, owner: false },
    { href: "/pengaturan/tim", label: "Tim & akses", desc: "Owner dan admin gudang per gudang", icon: IconUsers, owner: true },
    { href: "/pengaturan/grup", label: "Grup barang", desc: "Ubah nama, hapus, pindahkan barang antar grup", icon: IconBox, owner: false },
    { href: "/pengaturan/kontak", label: "Pemasok & pelanggan", desc: "Daftar kontak untuk dokumen", icon: IconBox, owner: false },
    { href: "/impor", label: "Impor & ekspor Excel", desc: "Barang, stok awal, kontak", icon: IconUpload, owner: false },
  ].filter((i) => (isOwner || !i.owner) && !blockedFor(role, i.href));

  return (
    <>
      <PageHeader title="Pengaturan" subtitle={tenant?.name} />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4 lg:px-6">
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          {items.map((i) => (
            <Link key={i.href} href={i.href} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4 py-3.5 last:border-b-0 active:bg-canvas">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-canvas text-ink-2"><i.icon size={19} /></span>
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px] font-semibold">{i.label}</span><span className="truncate text-xs text-ink-muted">{i.desc}</span></span>
              <IconChevron size={18} className="text-[#98A2B3]" />
            </Link>
          ))}
        </section>
        {memberships.length > 1 ? (
          <section className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4">
            <label htmlFor="tn" className="text-xs font-semibold text-ink-3">Perusahaan aktif</label>
            <Select id="tn" value={tenant?.id} onChange={(e) => switchTenant(e.target.value)}>
              {memberships.map((m) => <option key={m.tenant_id} value={m.tenant_id}>{m.tenants.name} · {ROLE_LABEL[m.role]}</option>)}
            </Select>
          </section>
        ) : null}
        <section className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-semibold">{session?.user.email}</span><span className="text-xs text-ink-muted">{role ? ROLE_LABEL[role] : ""}</span></span>
          <button onClick={() => signOut()} className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong px-3 text-sm font-semibold text-ink-2"><IconLogout size={18} />Keluar</button>
        </section>
        <p className="px-1 text-center text-xs text-ink-muted">Smart Stock · versi MVP</p>
      </div>
    </>
  );
}
