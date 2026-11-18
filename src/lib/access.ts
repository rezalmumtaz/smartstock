import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin_gudang: "Admin gudang", supervisor: "Supervisor" };
export const ROLE_DESC: Record<Role, string> = {
  owner: "Akses penuh: semua gudang, harga, laporan, tim",
  admin_gudang: "Gudang yang ditugaskan: barang, stok, impor, label, katalog (tanpa harga & laba)",
  supervisor: "Gudang yang ditugaskan: hanya isi & ubah stok (masuk, keluar, transfer, opname, lokasi simpan)",
};

/** Halaman yang tidak boleh dibuka supervisor (hanya mengurus stok). */
const SUPERVISOR_BLOCKED = /^\/(barang\/(baru|katalog|label)(\/|$)|impor|laporan|pengaturan\/(grup|kontak|perusahaan|tim|gudang))/;
export const blockedFor = (role: Role | null, path: string) => role === "supervisor" && SUPERVISOR_BLOCKED.test(path);
