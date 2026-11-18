"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { IconBox, IconChart, IconDoc, IconHome, IconLogout, IconMenu, IconPrinter, IconScan, IconSettings, IconTransfer, IconUpload, IconWarehouse } from "./icons";
import { cx, Spinner } from "./ui";
import { blockedFor, ROLE_LABEL } from "@/lib/access";

const NAV = [
  { href: "/", label: "Beranda", icon: IconHome },
  { href: "/barang", label: "Barang", icon: IconBox },
  { href: "/dokumen", label: "Dokumen", icon: IconDoc },
  { href: "/laporan", label: "Laporan", icon: IconChart },
];

/** Bottom nav HP: Laporan & pengaturan pindah ke tab Menu. */
const MOBILE_NAV = [
  NAV[0], NAV[1], NAV[2],
  { href: "/menu", label: "Menu", icon: IconMenu, match: ["/menu", "/laporan", "/pengaturan"] },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { ready, session, memberships, tenant, role, signOut } = useApp();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/masuk");
    else if (memberships.length === 0) router.replace("/mulai");
  }, [ready, session, memberships, router]);

  if (!ready || !session || !tenant) return <div className="min-h-screen"><Spinner /></div>;

  // Halaman kerja (form & dokumen) punya tombol aksi sendiri di bawah: sembunyikan bottom nav di mobile
  const focusMode = /^\/(dokumen\/.+|transfer\/baru|barang\/.+|impor|pengaturan\/grup)/.test(path);

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col gap-1 border-r border-line bg-white px-3 py-5 lg:flex">
        <Link href="/" className="mb-5 flex items-center gap-2.5 px-2">
          <img src="/icons/icon-192.png" alt="" width={34} height={34} className="rounded-[10px]" />
          <span className="flex min-w-0 flex-col">
            <span className="text-[17px] font-bold leading-tight">Smart Stock</span>
            <span className="truncate text-xs text-ink-muted">{tenant.name}</span>
          </span>
        </Link>
        {[...NAV.filter((n) => role !== "supervisor" || n.href !== "/laporan"),
          { href: "/transfer/baru", label: "Transfer gudang", icon: IconTransfer },
          { href: "/impor", label: "Impor Excel", icon: IconUpload },
          { href: "/barang/label", label: "Cetak label", icon: IconPrinter },
          { href: "/barang/katalog", label: "Katalog digital", icon: IconDoc },
          { href: "/pengaturan/gudang", label: "Gudang", icon: IconWarehouse },
          { href: "/pengaturan", label: "Pengaturan", icon: IconSettings },
        ].filter((n) => !blockedFor(role, n.href)).map((n) => (
          <Link key={n.href} href={n.href}
            className={cx("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold", isActive(path, n.href) && !(n.href === "/pengaturan" && path.startsWith("/pengaturan/")) && !(n.href === "/barang" && (path === "/barang/label" || path === "/barang/katalog")) ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-canvas")}>
            <n.icon size={19} />{n.label}
          </Link>
        ))}
        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
          <span className="px-3 text-xs text-ink-muted">{session.user.email} · {role ? ROLE_LABEL[role] : ""}</span>
          <button onClick={() => signOut()} className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-2 hover:bg-canvas"><IconLogout size={19} />Keluar</button>
        </div>
      </aside>

      <div className={cx("flex min-w-0 flex-1 flex-col lg:pb-0", focusMode ? "pb-6" : "pb-24")}>
        {blockedFor(role, path) ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-20 text-center">
            <span className="text-lg font-bold">Halaman ini tidak tersedia</span>
            <span className="text-sm leading-relaxed text-ink-muted">Akun {role ? ROLE_LABEL[role] : ""} hanya untuk mengisi dan mengubah stok. Minta owner bila perlu akses lebih.</span>
            <Link href="/" className="mt-2 flex h-11 items-center rounded-xl2 bg-brand px-5 text-sm font-bold text-white">Ke beranda</Link>
          </div>
        ) : children}
      </div>

      {/* Bottom nav mobile */}
      <nav aria-label="Navigasi utama" className={cx("pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white lg:hidden", focusMode && "hidden")}>
        <div className="mx-auto flex h-[68px] max-w-lg items-start justify-around px-2 pt-2">
          {MOBILE_NAV.slice(0, 2).map((n) => <NavItem key={n.href} {...n} active={isActive(path, n.href)} />)}
          <Link href="/scan" aria-label="Scan barcode" className="-mt-6 flex h-14 w-14 items-center justify-center rounded-[18px] border-4 border-canvas bg-brand text-white shadow-md">
            <IconScan size={24} />
          </Link>
          {MOBILE_NAV.slice(2).map((n) => <NavItem key={n.href} {...n} active={"match" in n && n.match ? n.match.some((m) => isActive(path, m)) : isActive(path, n.href)} />)}
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof IconHome; active: boolean }) {
  return (
    <Link href={href} className={cx("flex min-w-[60px] flex-col items-center gap-1 pt-1 text-[11px] font-semibold", active ? "text-brand" : "text-ink-muted")}>
      <Icon size={22} />{label}
    </Link>
  );
}

/** Pemilih gudang untuk header (filter global). */
export function WarehousePicker({ allowAll = true }: { allowAll?: boolean }) {
  const { warehouses, warehouseFilter, setWarehouseFilter } = useApp();
  if (warehouses.length <= 1 && !allowAll) return null;
  return (
    <label className="relative flex h-11 items-center gap-2 rounded-xl2 border border-line bg-canvas pl-3 pr-2 text-sm font-semibold">
      <IconWarehouse size={17} className="text-brand" />
      <span className="sr-only">Pilih gudang</span>
      <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-6 outline-none">
        {allowAll && warehouses.length > 1 ? <option value="all">Semua gudang ({warehouses.length})</option> : null}
        {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5D6679" strokeWidth="2" className="pointer-events-none absolute right-3"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  );
}
