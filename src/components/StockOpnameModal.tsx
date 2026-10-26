"use client";

import React, { useState, useEffect } from "react";
import { SesiStockOpname, ItemStockOpname } from "@/types/stock";
import { ledgerService } from "@/lib/ledger-service";
import { formatRupiah } from "@/lib/utils";
import { X, Camera, Plus, Minus, CheckCircle, AlertTriangle, Lock } from "lucide-react";

interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenScanner: (onScanned: (barcode: string) => void) => void;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenScanner,
}) => {
  const [activeSession, setActiveSession] = useState<SesiStockOpname | null>(null);
  const [items, setItems] = useState<ItemStockOpname[]>([]);
  const [petugasName, setPetugasName] = useState("Petugas Lapangan");
  const [isPosting, setIsPosting] = useState(false);
  const [focusedSkuId, setFocusedSkuId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Cek apakah ada sesi draft yang sedang berjalan
    const sessions = ledgerService.getOpnameSessions();
    const draftSession = sessions.find((s) => s.status === "draft");

    if (draftSession) {
      setActiveSession(draftSession);
      setItems(ledgerService.getOpnameItems(draftSession.id));
    } else {
      // Buat sesi opname baru
      const newSession = ledgerService.createOpnameSession(petugasName);
      setActiveSession(newSession);
      setItems(ledgerService.getOpnameItems(newSession.id));
    }
  }, [isOpen]);

  if (!isOpen || !activeSession) return null;

  const handleUpdateCount = (itemId: string, count: number) => {
    const updated = ledgerService.updateOpnamePhysicalCount(itemId, count);
    setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
  };

  const handleBarcodeScanned = (barcode: string) => {
    const targetSku = ledgerService.getSKUByBarcode(barcode);
    if (targetSku) {
      const matchedItem = items.find((i) => i.sku_id === targetSku.id);
      if (matchedItem) {
        setFocusedSkuId(matchedItem.id);
        // Scroll to item
        const el = document.getElementById(`opname-item-${matchedItem.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  };

  const handlePostOpname = () => {
    if (!activeSession) return;
    const confirm = window.confirm(
      "Apakah Anda yakin ingin menyelesaikan Stock Opname ini?\nSistem akan OTOMATIS membuat baris penyesuaian (Adjustment) di Kartu Stok Ledger untuk semua barang yang berselisih."
    );
    if (!confirm) return;

    setIsPosting(true);
    try {
      ledgerService.postOpnameReconciliation(activeSession.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || "Gagal rekonsiliasi opname.");
    } finally {
      setIsPosting(false);
    }
  };

  const totalVarianceCount = items.reduce((acc, i) => acc + (i.selisih || 0), 0);
  const totalVarianceValue = items.reduce((acc, i) => acc + (i.nilai_selisih || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md h-[94vh] sm:h-[88vh] rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base">Sesi Stock Opname</h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
                {activeSession.no_opname}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Petugas: {activeSession.petugas} • {items.length} SKU
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Scan Barcode Bar */}
        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-slate-600 font-medium">Scan untuk lompat ke item:</span>
          <button
            onClick={() => onOpenScanner(handleBarcodeScanned)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold active:scale-95 transition-all shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Kamera</span>
          </button>
        </div>

        {/* List SKU Opname (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
          {items.map((item) => {
            const sku = ledgerService.getSKUById(item.sku_id);
            const isMatched = item.selisih === 0;
            const isLost = item.selisih < 0;
            const isGained = item.selisih > 0;
            const isTarget = focusedSkuId === item.id;

            return (
              <div
                id={`opname-item-${item.id}`}
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isTarget
                    ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                        {sku?.kode_sku}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        📍 {sku?.lokasi_rak}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-xs mt-1 truncate">
                      {sku?.nama_barang}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Stok Sistem: <strong className="text-slate-800">{item.stok_sistem} {sku?.satuan}</strong>
                    </p>
                  </div>

                  {/* Status Selisih Pill */}
                  <div className="text-right flex-shrink-0 pl-2">
                    {isMatched ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Cocok (0)
                      </span>
                    ) : isLost ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        Selisih: {item.selisih}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Selisih: +{item.selisih}
                      </span>
                    )}

                    {!isMatched && (
                      <div className="text-[10px] font-mono font-semibold mt-1 text-slate-600">
                        {formatRupiah(item.nilai_selisih)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stepper Input Fisik */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Hitung Fisik:</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleUpdateCount(item.id, item.stok_fisik - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={item.stok_fisik}
                      onChange={(e) =>
                        handleUpdateCount(item.id, parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 text-center font-mono font-bold text-sm py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                    />

                    <button
                      onClick={() => handleUpdateCount(item.id, item.stok_fisik + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Variance Summary Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between text-xs mb-3">
            <div>
              <span className="text-slate-500">Total Selisih Fisik:</span>
              <div className="font-mono font-bold text-slate-900 text-sm">
                {totalVarianceCount > 0 ? `+${totalVarianceCount}` : totalVarianceCount} Pcs
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Estimasi Nilai Varians:</span>
              <div
                className={`font-mono font-bold text-sm ${
                  totalVarianceValue < 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {formatRupiah(totalVarianceValue)}
              </div>
            </div>
          </div>

          <button
            onClick={handlePostOpname}
            disabled={isPosting}
            className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Posting & Rekonsiliasi Otomatis</span>
          </button>
        </div>
      </div>
    </div>
  );
};
