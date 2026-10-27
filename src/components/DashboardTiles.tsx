"use client";

import React from "react";
import {
  Package,
  FileText,
  BarChart3,
  DollarSign,
  PackagePlus,
  PackageMinus,
  ScanLine,
  Mic,
  Users,
  UserCheck,
  Settings,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";

interface DashboardTilesProps {
  totalItems: number;
  totalAssetValue: number;
  totalDocuments: number;
  totalExpenses: number;
  onOpenProducts: () => void;
  onOpenDocuments: () => void;
  onOpenReports: () => void;
  onOpenExpenses: () => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenScanner: () => void;
  onOpenVoiceAI: () => void;
  onOpenSuppliers: () => void;
  onOpenCustomers: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const DashboardTiles: React.FC<DashboardTilesProps> = ({
  totalItems,
  totalAssetValue,
  totalDocuments,
  totalExpenses,
  onOpenProducts,
  onOpenDocuments,
  onOpenReports,
  onOpenExpenses,
  onOpenStockIn,
  onOpenStockOut,
  onOpenScanner,
  onOpenVoiceAI,
  onOpenSuppliers,
  onOpenCustomers,
  onOpenSettings,
  onOpenHelp,
}) => {
  return (
    <div className="space-y-4">
      {/* 2-Column Grid of Big Teal Cards (Matching StoDo Simple Reference) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Barang Tile */}
        <button
          type="button"
          onClick={onOpenProducts}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Package className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Barang</span>
          <span className="text-xs sm:text-sm text-teal-200 mt-1 font-medium truncate max-w-full">
            {totalItems} / {formatRupiah(totalAssetValue)}
          </span>
        </button>

        {/* 2. Dokumen Tile */}
        <button
          type="button"
          onClick={onOpenDocuments}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Dokumen</span>
          <span className="text-xs sm:text-sm text-teal-200 mt-1 font-medium">
            {totalDocuments}
          </span>
        </button>

        {/* 3. Laporan Tile */}
        <button
          type="button"
          onClick={onOpenReports}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Laporan</span>
          <span className="text-[11px] sm:text-xs text-teal-200/90 mt-1 font-normal">
            Laba, Rugi & Stok
          </span>
        </button>

        {/* 4. Biaya Tile */}
        <button
          type="button"
          onClick={onOpenExpenses}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Biaya</span>
          <span className="text-xs sm:text-sm text-teal-200 mt-1 font-medium truncate max-w-full">
            {formatRupiah(totalExpenses)}
          </span>
        </button>

        {/* 5. Barang Masuk Baru Tile (Direct Stock In) */}
        <button
          type="button"
          onClick={onOpenStockIn}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <PackagePlus className="w-7 h-7 text-emerald-300" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Barang masuk baru</span>
          <span className="text-[11px] text-teal-200 mt-1">Terima ke gudang</span>
        </button>

        {/* 6. Barang Keluar Baru Tile (Direct Stock Out) */}
        <button
          type="button"
          onClick={onOpenStockOut}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <PackageMinus className="w-7 h-7 text-sky-300" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Barang keluar baru</span>
          <span className="text-[11px] text-teal-200 mt-1">Kirim atau jual</span>
        </button>

        {/* 7. Pindai Barcode Tile */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="bg-teal-800 hover:bg-teal-900 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-700/60 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <ScanLine className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base leading-tight">Pindai barcode</span>
          <span className="text-[11px] text-teal-200 mt-1">Kamera / Scanner</span>
        </button>

        {/* 8. Voice Note AI Tile (User Feature Request) */}
        <button
          type="button"
          onClick={onOpenVoiceAI}
          className="bg-gradient-to-br from-teal-800 to-indigo-900 hover:from-teal-900 hover:to-indigo-950 active:scale-[0.98] transition-all rounded-2xl p-4 sm:p-5 text-white flex flex-col items-center justify-center text-center shadow-md min-h-[120px] sm:min-h-[140px] group border border-teal-600/40"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Mic className="w-7 h-7 text-amber-300 animate-pulse" />
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-bold text-sm sm:text-base leading-tight">Voice Note AI</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <span className="text-[11px] text-amber-200 mt-1 font-medium">Bicara untuk input</span>
        </button>
      </div>

      {/* Bottom 4 Quick Action Buttons (Matching StoDo Simple Reference) */}
      <div className="grid grid-cols-4 gap-2.5 pt-2">
        <button
          type="button"
          onClick={onOpenSuppliers}
          className="bg-teal-800 hover:bg-teal-900 active:scale-95 transition-all text-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm"
          title="Pemasok"
        >
          <Users className="w-5 h-5 text-teal-100 mb-1" />
          <span className="text-[10px] font-semibold truncate w-full text-center">Pemasok</span>
        </button>

        <button
          type="button"
          onClick={onOpenCustomers}
          className="bg-teal-800 hover:bg-teal-900 active:scale-95 transition-all text-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm"
          title="Pelanggan"
        >
          <UserCheck className="w-5 h-5 text-teal-100 mb-1" />
          <span className="text-[10px] font-semibold truncate w-full text-center">Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-teal-800 hover:bg-teal-900 active:scale-95 transition-all text-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm"
          title="Pengaturan"
        >
          <Settings className="w-5 h-5 text-teal-100 mb-1" />
          <span className="text-[10px] font-semibold truncate w-full text-center">Pengaturan</span>
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          className="bg-teal-800 hover:bg-teal-900 active:scale-95 transition-all text-white p-3 rounded-2xl flex flex-col items-center justify-center shadow-sm"
          title="Bantuan"
        >
          <HelpCircle className="w-5 h-5 text-teal-100 mb-1" />
          <span className="text-[10px] font-semibold truncate w-full text-center">Bantuan</span>
        </button>
      </div>
    </div>
  );
};
