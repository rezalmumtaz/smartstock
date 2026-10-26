"use client";

import React from "react";
import { SKUWithCurrentStock, KartuStokLedger } from "@/types/stock";
import { ledgerService } from "@/lib/ledger-service";
import { formatTanggalWaktu, formatRupiah } from "@/lib/utils";
import { X, Lock, ShieldCheck, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface LedgerHistoryDrawerProps {
  sku: SKUWithCurrentStock | null;
  isOpen: boolean;
  onClose: () => void;
  onMutate: (sku: SKUWithCurrentStock) => void;
}

export const LedgerHistoryDrawer: React.FC<LedgerHistoryDrawerProps> = ({
  sku,
  isOpen,
  onClose,
  onMutate,
}) => {
  if (!isOpen || !sku) return null;

  const entries: KartuStokLedger[] = ledgerService.getLedgerBySKU(sku.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

        {/* Header Drawer */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-1.5 mb-1">
              <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {sku.kode_sku}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                📍 {sku.lokasi_rak}
              </span>
            </div>
            <h3 className="font-bold text-base text-slate-900 leading-tight">
              {sku.nama_barang}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              HPP: {formatRupiah(sku.harga_beli)} • ROP Min: {sku.batas_stok_minimum} {sku.satuan}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Banner Immutability */}
        <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Protokol Immutabilitas Kwarto:</strong> Seluruh baris mutasi bersifat permanen & append-only.
          </span>
        </div>

        {/* Timeline Mutasi Kwarto (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 py-1">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada mutasi untuk SKU ini.
            </div>
          ) : (
            entries.map((item, idx) => {
              const isMasuk = item.masuk > 0;
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-mono font-semibold text-slate-700">
                      #{item.no_bukti}
                    </span>
                    <span>{formatTanggalWaktu(item.tanggal_waktu)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">
                        {item.keterangan}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {isMasuk ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>+{item.masuk} Masuk</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>-{item.keluar} Keluar</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sisa Stok Berjalan */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Sisa Stok
                      </span>
                      <span className="font-mono font-black text-lg text-slate-900">
                        {item.sisa_stok}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onMutate(sku);
            }}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md active:scale-[0.98]"
          >
            + Tambah Mutasi untuk Barang Ini
          </button>
        </div>
      </div>
    </div>
  );
};
