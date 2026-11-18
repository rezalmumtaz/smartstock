"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconBox, IconBuilding, IconChart, IconCheckList, IconChevron, IconDoc, IconIn, IconLogout, IconOut, IconPrinter,
  IconSettings, IconTransfer, IconUpload, IconUsers, IconWarehouse,
} from "@/components/icons";
import { cx } from "@/components/ui";
import { useApp } from "@/lib/app-context";
import { blockedFor, ROLE_LABEL } from "@/lib/access";

type Entry = { href: string; label: string; desc?: string; icon: (p: { size?: number }) => ReactNode; tone?: string; owner?: boolean };

/** Menu lengkap untuk HP (di desktop semuanya ada di sidebar). */
export default function MenuPage() {
  const { isOwner, role, tenant, session, signOut } = useApp();
  const quick: Entry[] = [
    { href: "/dokumen/baru?jenis=in", label: "Barang masuk", icon: IconIn, tone: "bg-brand-soft text-brand" },
    { href: "/dokumen/baru?jenis=out", label: "Barang keluar", icon: IconOut, tone: "bg-warn-soft text-warn" },
    { href: "/transfer/baru", label: "Transfer", icon: IconTransfer, tone: "bg-indigo-soft text-indigo" },
    { href: "/dokumen/baru?jenis=opname", label: "Stok opname", icon: IconCheckList, tone: "bg-[#F2F4F7] text-ink-2" },
  ];
  const groups: { title: string; items: Entry[] }[] = [
    {
      title: "Stok & laporan",
      items: [
        { href: "/laporan", label: "Laporan", desc: isOwner ? "Stok, pergerakan, transfer, penjualan & laba" : "Stok, pergerakan & transfer", icon: IconChart },
        { href: "/laporan?tab=mutasi", label: "Mutasi barang", desc: "Barang masuk & keluar per periode", icon: IconTransfer },
        { href: "/dokumen", label: "Semua dokumen", desc: "Masuk, keluar, opname, retur, transfer", icon: IconDoc },
        { href: "/dokumen/baru?jenis=return_in", label: "Retur dari pelanggan", icon: IconIn },
        { href: "/dokumen/baru?jenis=return_out", label: "Retur ke pemasok", icon: IconOut },
      ],
    },
    {
      title: "Barang & barcode",
      items: [
        { href: "/barang", label: "Daftar barang", desc: "Katalog, stok per gudang, ekspor Excel", icon: IconBox },
        { href: "/barang/katalog", label: "Katalog digital", desc: "PDF bergambar atau teks WA untuk pelanggan", icon: IconDoc },
        { href: "/pengaturan/grup", label: "Grup barang", desc: "Ubah nama, hapus, pindahkan barang antar grup", icon: IconCheckList },
        { href: "/barang/label", label: "Cetak label barcode", desc: "Printer thermal & kertas label A4", icon: IconPrinter },
        { href: "/impor", label: "Impor Excel", desc: "Barang, stok awal, pemasok/pelanggan", icon: IconUpload },
      ],
    },
    {
      title: "Pengaturan",
      items: [
        { href: "/pengaturan/perusahaan", label: "Perusahaan saya", desc: "Nama, NPWP, rekening, kunci periode", icon: IconBuilding, owner: true },
        { href: "/pengaturan/gudang", label: "Gudang", icon: IconWarehouse },
        { href: "/pengaturan/tim", label: "Tim & akses", desc: "Owner dan admin gudang", icon: IconUsers, owner: true },
        { href: "/pengaturan/kontak", label: "Pemasok & pelanggan", icon: IconBox },
        { href: "/pengaturan", label: "Pengaturan lainnya", desc: "Ganti perusahaan aktif", icon: IconSettings },
      ],
    },
  ];

  return (
    <>
      <header className="border-b border-line bg-white px-4 pb-3 pt-5 lg:px-6">
        <h1 className="text-xl font-bold">Menu</h1>
        <span className="text-xs text-ink-muted">{tenant?.name} · {role ? ROLE_LABEL[role] : ""}</span>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4 lg:px-6">
        <section className="grid grid-cols-4 gap-2">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-1 py-3 text-center text-[12px] font-semibold leading-tight active:bg-canvas">
              <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", q.tone)}><q.icon size={19} /></span>{q.label}
            </Link>
          ))}
        </section>

        {groups.filter((g) => g.items.some((i) => (isOwner || !i.owner) && !blockedFor(role, i.href.split("?")[0]))).map((g) => (
          <section key={g.title} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{g.title}</h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              {g.items.filter((i) => (isOwner || !i.owner) && !blockedFor(role, i.href.split("?")[0])).map((i) => (
                <Link key={i.href} href={i.href} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4 py-3 last:border-b-0 active:bg-canvas">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-canvas text-ink-2"><i.icon size={19} /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">{i.label}</span>
                    {i.desc ? <span className="truncate text-xs text-ink-muted">{i.desc}</span> : null}
                  </span>
                  <IconChevron size={18} className="text-[#98A2B3]" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-semibold">{session?.user.email}</span><span className="text-xs text-ink-muted">{role ? ROLE_LABEL[role] : ""}</span></span>
          <button onClick={() => signOut()} className="flex h-11 items-center gap-2 rounded-xl2 border border-line-strong px-3 text-sm font-semibold text-ink-2"><IconLogout size={18} />Keluar</button>
        </section>
      </main>
    </>
  );
}
