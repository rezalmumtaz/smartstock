"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Building,
  Warehouse as WarehouseIcon,
  Palette,
  CreditCard,
  Cloud,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Warehouse } from "@/types/stock";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onAddWarehouse: (name: string, code: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  onAddWarehouse,
}) => {
  const [activeSection, setActiveSection] = useState<"menu" | "company" | "subscription" | "warehouse">("menu");

  // Company Profile state
  const [companyName, setCompanyName] = useState("CV Mitra Makmur Mandiri");
  const [companyAddress, setCompanyAddress] = useState("Sentra Logistik Pergudangan No. 8");
  const [companyPhone, setCompanyPhone] = useState("021-5551234");
  const [companyNpwp, setCompanyNpwp] = useState("01.234.567.8-012.000");

  // Add Warehouse state
  const [newWhName, setNewWhName] = useState("");
  const [newWhCode, setNewWhCode] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              if (activeSection !== "menu") {
                setActiveSection("menu");
              } else {
                onClose();
              }
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-base text-slate-900">
            {activeSection === "company"
              ? "Perusahaan Saya"
              : activeSection === "subscription"
              ? "Paket Berlangganan"
              : activeSection === "warehouse"
              ? "Kelola Lokasi Gudang"
              : "Pengaturan"}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
        {activeSection === "menu" && (
          <div className="space-y-3">
            {/* SaaS Banner */}
            <div className="bg-gradient-to-r from-teal-800 to-indigo-900 rounded-3xl p-5 text-white shadow-md flex items-center justify-between">
              <div>
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase mb-1.5">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Uji Coba Gratis 7 Hari</span>
                </div>
                <div className="font-bold text-base">Paket Premium MM Smart Stock</div>
                <p className="text-xs text-teal-200 mt-0.5">
                  Multi-gudang tanpa batas, Voice AI, dan cloud sync otomatis.
                </p>
              </div>
              <button
                onClick={() => setActiveSection("subscription")}
                className="px-3.5 py-2 rounded-xl bg-white text-teal-900 font-bold text-xs shadow-md active:scale-95 transition-all shrink-0 ml-3"
              >
                Pilih Paket
              </button>
            </div>

            {/* Menu List (Matching StoDo Screenshot 22.16.59 (1)) */}
            <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setActiveSection("company")}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-teal-700" />
                  <span>Perusahaan Saya (Kop Faktur / Cetakan)</span>
                </div>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("warehouse")}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <WarehouseIcon className="w-5 h-5 text-teal-700" />
                  <span>Kelola Lokasi Gudang ({warehouses.length} Cabang)</span>
                </div>
                <span className="text-slate-400">&gt;</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("subscription")}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-amber-700 font-bold"
              >
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <span>Paket Berlangganan Anda</span>
                </div>
                <span className="text-amber-500">&gt;</span>
              </button>

              <div className="w-full p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Cloud className="w-5 h-5 text-teal-700" />
                  <div>
                    <span>Pencadangan Cloud (Supabase)</span>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Data tersimpan aman di server PostgreSQL
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Aktif
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Company Settings */}
        {activeSection === "company" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nama Perusahaan / Toko</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Alamat</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Telepon</label>
                <input
                  type="text"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">NPWP</label>
                <input
                  type="text"
                  value={companyNpwp}
                  onChange={(e) => setCompanyNpwp(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <button
              onClick={() => {
                alert("Pengaturan perusahaan berhasil disimpan!");
                setActiveSection("menu");
              }}
              className="w-full py-2.5 rounded-xl bg-teal-800 text-white font-bold shadow-md active:scale-95 transition-all"
            >
              Simpan Profil Perusahaan
            </button>
          </div>
        )}

        {/* Warehouses Settings */}
        {activeSection === "warehouse" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Tambah Cabang Gudang</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Nama Gudang (mis: Cabang Timur)"
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200"
                />
                <input
                  type="text"
                  placeholder="Kode (mis: GDG-03)"
                  value={newWhCode}
                  onChange={(e) => setNewWhCode(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newWhName.trim()) {
                    onAddWarehouse(newWhName.trim(), newWhCode.trim() || "GDG");
                    setNewWhName("");
                    setNewWhCode("");
                  }
                }}
                className="w-full py-2 bg-teal-800 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                + Tambah Gudang
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
              {warehouses.map((w) => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{w.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{w.code}</div>
                  </div>
                  {w.is_default && (
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                      Gudang Utama
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Plan Page (Matching StoDo Screenshot 22.16.51) */}
        {activeSection === "subscription" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header Card */}
            <div className="bg-teal-900 rounded-3xl p-6 text-white text-center shadow-lg">
              <span className="inline-block px-3 py-1 bg-amber-400 text-slate-900 text-xs font-bold rounded-full mb-2">
                GRATIS SELAMA 7 HARI
              </span>
              <h2 className="text-xl font-black">Coba Premium gratis selama seminggu</h2>
              <p className="text-xs text-teal-200 mt-1 max-w-sm mx-auto">
                Tidak ada biaya hari ini. Batalkan kapan saja sebelum masa uji coba berakhir.
              </p>
            </div>

            {/* Benefits Grid (Matching StoDo Screenshot 22.16.51) */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Harga jual & harga pokok</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Pelanggan & pemasok tanpa batas</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Gudang tanpa batas</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Bidang khusus (EXP, ukuran)</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Pencadangan cloud otomatis</span>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                <span className="font-semibold text-slate-800">Cetak tanpa tanda air</span>
              </div>
            </div>

            {/* Pricing Packages (Tahunan vs Bulanan) */}
            <div className="space-y-2">
              <div className="p-4 bg-white rounded-2xl border-2 border-teal-800 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">Tahunan</span>
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full">
                      Hemat 30%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Rp 23.525/bln • ditagih tahunan</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-base text-teal-900">Rp 282.305</div>
                  <span className="text-[10px] text-slate-400">per tahun</span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900">Bulanan</span>
                  <div className="text-xs text-slate-500 mt-0.5">Ditagih setiap bulan</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-base text-slate-900">Rp 33.827</div>
                  <span className="text-[10px] text-slate-400">per bulan</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert("Uji coba gratis 7 hari aktif!")}
              className="w-full py-3.5 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-sm shadow-xl active:scale-95 transition-all text-center"
            >
              Mulai Uji Coba Gratis 7 Hari
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
