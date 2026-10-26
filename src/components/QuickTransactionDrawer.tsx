"use client";

import React, { useState, useEffect } from "react";
import { SKUWithCurrentStock, VoiceParseResult } from "@/types/stock";
import { ledgerService } from "@/lib/ledger-service";
import { VoiceNoteButton } from "./VoiceNoteButton";
import { X, Camera, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";

interface QuickTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allSkus: SKUWithCurrentStock[];
  initialSku?: SKUWithCurrentStock | null;
  onOpenScannerForSKU: () => void;
}

export const QuickTransactionDrawer: React.FC<QuickTransactionDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allSkus,
  initialSku,
  onOpenScannerForSKU,
}) => {
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");
  const [jenis, setJenis] = useState<"Masuk" | "Keluar">("Masuk");
  const [jumlah, setJumlah] = useState<number>(1);
  const [noBukti, setNoBukti] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSku) {
      setSelectedSkuId(initialSku.id);
    } else if (allSkus.length > 0 && !selectedSkuId) {
      setSelectedSkuId(allSkus[0].id);
    }
    setNoBukti(`MUT-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`);
  }, [isOpen, initialSku, allSkus]);

  if (!isOpen) return null;

  const currentSku = allSkus.find((s) => s.id === selectedSkuId);
  const currentStock = currentSku ? currentSku.sisa_stok : 0;
  const simulatedNewStock =
    jenis === "Masuk" ? currentStock + (jumlah || 0) : currentStock - (jumlah || 0);

  const handleVoiceParsed = (result: VoiceParseResult) => {
    // HUMAN-IN-THE-LOOP: Hanya mengisi nilai form untuk direview manusia
    if (result.sku) {
      const match = allSkus.find(
        (s) =>
          s.kode_sku.toLowerCase() === result.sku.toLowerCase() ||
          s.barcode.toLowerCase() === result.sku.toLowerCase()
      );
      if (match) setSelectedSkuId(match.id);
    }
    if (result.jenis) setJenis(result.jenis);
    if (result.jumlah) setJumlah(result.jumlah);
    if (result.keterangan) setKeterangan(result.keterangan);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSkuId) {
      setErrorMessage("Silakan pilih SKU barang terlebih dahulu.");
      return;
    }

    if (!jumlah || jumlah <= 0) {
      setErrorMessage("Jumlah mutasi harus lebih besar dari 0.");
      return;
    }

    if (jenis === "Keluar" && simulatedNewStock < 0) {
      setErrorMessage(
        `Stok tidak mencukupi! Sisa saat ini ${currentStock}, Anda mencoba mengeluarkan ${jumlah}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      ledgerService.recordMutation({
        sku_id: selectedSkuId,
        no_bukti: noBukti,
        keterangan: keterangan || (jenis === "Masuk" ? "Penerimaan Barang" : "Pengeluaran Barang"),
        masuk: jenis === "Masuk" ? jumlah : 0,
        keluar: jenis === "Keluar" ? jumlah : 0,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mencatat mutasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustQty = (delta: number) => {
    setJumlah((prev) => Math.max(1, (prev || 0) + delta));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* Top Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

        {/* Header Drawer */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">Catat Mutasi Kartu Stok</h3>
            <p className="text-xs text-slate-500">Append-Only Kwarto Ledger Protocol</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Segmented Control Masuk / Keluar (Besar & Ramah Jempol) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setJenis("Masuk")}
              className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                jenis === "Masuk"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Barang Masuk</span>
            </button>

            <button
              type="button"
              onClick={() => setJenis("Keluar")}
              className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                jenis === "Keluar"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Barang Keluar</span>
            </button>
          </div>

          {/* Barcode Scanner & Voice Note Action Row */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={onOpenScannerForSKU}
              className="flex items-center space-x-2 py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 active:scale-95"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Scan Barcode</span>
            </button>

            <VoiceNoteButton
              onParsedResult={handleVoiceParsed}
              knownSkus={allSkus.map((s) => ({
                kode_sku: s.kode_sku,
                nama_barang: s.nama_barang,
              }))}
            />
          </div>

          {/* Pilih SKU Barang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Barang (SKU)
            </label>
            <select
              value={selectedSkuId}
              onChange={(e) => setSelectedSkuId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allSkus.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.kode_sku}] {s.nama_barang} (Sisa: {s.sisa_stok} {s.satuan})
                </option>
              ))}
            </select>
          </div>

          {/* Input Jumlah Mutasi dengan Stepper Cepat */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Jumlah Mutasi</label>
              <span className="text-xs font-medium text-slate-500">
                Satuan: {currentSku?.satuan || "Pcs"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => adjustQty(-10)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-90"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => adjustQty(-1)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-90"
              >
                -1
              </button>

              <input
                type="number"
                min="1"
                value={jumlah || ""}
                onChange={(e) => setJumlah(parseInt(e.target.value, 10) || 0)}
                className="flex-1 text-center font-mono font-black text-xl py-2 bg-slate-50 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900"
              />

              <button
                type="button"
                onClick={() => adjustQty(1)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-90"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => adjustQty(10)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 active:scale-90"
              >
                +10
              </button>
            </div>
          </div>

          {/* Live Saldo Simulation Card */}
          <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Sisa Stok Sekarang:</span>
              <div className="font-mono font-bold text-slate-800 text-sm">
                {currentStock} {currentSku?.satuan}
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Simulasi Stok Baru:</span>
              <div
                className={`font-mono font-black text-base ${
                  simulatedNewStock < 0 ? "text-rose-600" : "text-blue-700"
                }`}
              >
                {simulatedNewStock} {currentSku?.satuan}
              </div>
            </div>
          </div>

          {/* No Bukti & Keterangan */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                No. Bukti / Surat Jalan
              </label>
              <input
                type="text"
                value={noBukti}
                onChange={(e) => setNoBukti(e.target.value)}
                placeholder="No. DO / PO / SJ"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Keterangan / Supplier
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Vendor / Keperluan"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button (Thumb-accessible Full-Width) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2 ${
                jenis === "Masuk"
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                  : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>SIMPAN MUTASI KE BUKU KWARTO</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
