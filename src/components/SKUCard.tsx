"use client";

import React from "react";
import { SKUWithCurrentStock } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";
import { MapPin, AlertTriangle, BookOpen, Printer, ArrowRightLeft, Package } from "lucide-react";

interface SKUCardProps {
  sku: SKUWithCurrentStock;
  onOpenLedger: (sku: SKUWithCurrentStock) => void;
  onOpenPrint: (sku: SKUWithCurrentStock) => void;
  onQuickMutate: (sku: SKUWithCurrentStock) => void;
  onEditSKU: (sku: SKUWithCurrentStock) => void;
}

export const SKUCard: React.FC<SKUCardProps> = ({
  sku,
  onOpenLedger,
  onOpenPrint,
  onQuickMutate,
  onEditSKU,
}) => {
  const isCritical = sku.status_stok === "KRITIS";
  const isEmpty = sku.status_stok === "KOSONG";

  return (
    <div
      className={`relative bg-white rounded-2xl p-4 shadow-sm border transition-all duration-150 ${
        isCritical
          ? "border-rose-300 ring-2 ring-rose-500/20 bg-rose-50/30"
          : isEmpty
          ? "border-slate-300 bg-slate-50 opacity-80"
          : "border-slate-200 hover:border-blue-300"
      }`}
    >
      {/* Alarm Banner jika Kritis */}
      {isCritical && (
        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2.5 py-1 rounded-lg mb-2.5 border border-rose-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
          <span>ALARM: Stok menyentuh batas kritis (Min. {sku.batas_stok_minimum} {sku.satuan})</span>
        </div>
      )}

      {/* Main Content Row */}
      <div className="flex items-start space-x-3.5">
        {/* Thumbnail Foto (Bisa di-tap untuk edit foto/produk) */}
        <button
          type="button"
          onClick={() => onEditSKU(sku)}
          className="relative w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center hover:opacity-90 group"
          title="Klik untuk ubah foto atau detail barang"
        >
          {sku.foto_produk_url ? (
            <img
              src={sku.foto_produk_url}
              alt={sku.nama_barang}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder icon
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <Package className="w-7 h-7 text-slate-400 group-hover:text-blue-500" />
          )}
          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-center font-medium">
            Edit
          </span>
        </button>

        {/* Informasi SKU */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                {sku.kode_sku}
              </span>
              <div className="flex items-center text-[11px] text-slate-500 font-medium truncate">
                <MapPin className="w-3 h-3 text-slate-400 mr-0.5 flex-shrink-0" />
                <span>{sku.lokasi_rak}</span>
              </div>
            </div>

            {/* Tombol Edit / Setting */}
            <button
              type="button"
              onClick={() => onEditSKU(sku)}
              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 active:scale-90 transition-transform"
              title="Edit info / foto barang"
            >
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100">
                Edit
              </span>
            </button>
          </div>

          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
            {sku.nama_barang}
          </h3>

          <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500">
            <span>HPP: {formatRupiah(sku.harga_beli)}</span>
            <span>•</span>
            <span>Aset: {formatRupiah(sku.total_nilai_aset)}</span>
          </div>
        </div>

        {/* Saldo Sisa Stok Besar */}
        <div className="text-right flex-shrink-0 pl-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Sisa Stok
          </div>
          <div
            className={`font-black font-mono text-2xl tracking-tight ${
              isCritical
                ? "text-rose-600"
                : isEmpty
                ? "text-slate-400"
                : "text-emerald-700"
            }`}
          >
            {sku.sisa_stok}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {sku.satuan}
          </div>
        </div>
      </div>

      {/* Action Footer Buttons (Thumb-friendly) */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-semibold">
        <button
          onClick={() => onOpenLedger(sku)}
          className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>Kwarto</span>
        </button>

        <button
          onClick={() => onOpenPrint(sku)}
          className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span>Barcode</span>
        </button>

        <button
          onClick={() => onQuickMutate(sku)}
          className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95 transition-all"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Mutasi</span>
        </button>
      </div>
    </div>
  );
};
