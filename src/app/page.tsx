"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SKU, SKUWithCurrentStock, VoiceParseResult } from "@/types/stock";
import { ledgerService } from "@/lib/ledger-service";
import { Header } from "@/components/Header";
import { AlphabetRibbon } from "@/components/AlphabetRibbon";
import { SKUCard } from "@/components/SKUCard";
import { QuickTransactionDrawer } from "@/components/QuickTransactionDrawer";
import { LedgerHistoryDrawer } from "@/components/LedgerHistoryDrawer";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { BarcodePrintModal } from "@/components/BarcodePrintModal";
import { StockOpnameModal } from "@/components/StockOpnameModal";
import { AIConsultantDrawer } from "@/components/AIConsultantDrawer";
import { ProductFormModal } from "@/components/ProductFormModal";
import { formatRupiah } from "@/lib/utils";
import { Mic, ArrowRightLeft, Sparkles, AlertCircle, PlusCircle, Plus } from "lucide-react";

export default function HomePage() {
  const [skus, setSkus] = useState<SKUWithCurrentStock[]>(() =>
    ledgerService.getSKUsWithCurrentStock()
  );
  const [selectedLetter, setSelectedLetter] = useState<string>("SEMUA");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Drawers State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [skuToEdit, setSkuToEdit] = useState<SKU | null>(null);

  const [isTxDrawerOpen, setIsTxDrawerOpen] = useState(false);
  const [selectedSkuForTx, setSelectedSkuForTx] = useState<SKUWithCurrentStock | null>(null);

  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [selectedSkuForLedger, setSelectedSkuForLedger] = useState<SKUWithCurrentStock | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedSkuForPrint, setSelectedSkuForPrint] = useState<SKUWithCurrentStock | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<((barcode: string) => void) | null>(null);

  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
  const [isAIConsultantOpen, setIsAIConsultantOpen] = useState(false);

  // Load data awal
  const refreshData = () => {
    setSkus(ledgerService.getSKUsWithCurrentStock());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filtered List berdasarkan Huruf Tab A-Z & Search
  const filteredSkus = useMemo(() => {
    return skus.filter((item) => {
      // Filter Abjad
      const firstChar = item.nama_barang.trim().charAt(0).toUpperCase();
      const matchLetter = selectedLetter === "SEMUA" || firstChar === selectedLetter;

      // Filter Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.nama_barang.toLowerCase().includes(q) ||
        item.kode_sku.toLowerCase().includes(q) ||
        item.lokasi_rak.toLowerCase().includes(q) ||
        item.barcode.includes(q);

      return matchLetter && matchSearch;
    });
  }, [skus, selectedLetter, searchQuery]);

  // Huruf yang tersedia & Huruf yang memiliki item kritis
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    skus.forEach((s) => {
      const char = s.nama_barang.trim().charAt(0).toUpperCase();
      if (char >= "A" && char <= "Z") set.add(char);
    });
    return Array.from(set);
  }, [skus]);

  const criticalLetters = useMemo(() => {
    const set = new Set<string>();
    skus
      .filter((s) => s.status_stok === "KRITIS")
      .forEach((s) => {
        const char = s.nama_barang.trim().charAt(0).toUpperCase();
        if (char >= "A" && char <= "Z") set.add(char);
      });
    return Array.from(set);
  }, [skus]);

  // Metrik Agregat
  const criticalCount = skus.filter((s) => s.status_stok === "KRITIS").length;
  const totalAssetValue = skus.reduce((acc, s) => acc + s.total_nilai_aset, 0);

  // Handler Scanner Barcode Kamera
  const handleOpenGlobalScanner = () => {
    setScannerCallback(() => (barcode: string) => {
      const found = ledgerService.getSKUByBarcode(barcode);
      if (found) {
        const withStock = skus.find((s) => s.id === found.id) || null;
        setSelectedSkuForTx(withStock);
        setIsTxDrawerOpen(true);
      } else {
        alert(`Barcode "${barcode}" belum terdaftar pada Master SKU.`);
      }
    });
    setIsScannerOpen(true);
  };

  const handleOpenScannerForTx = () => {
    setScannerCallback(() => (barcode: string) => {
      const found = ledgerService.getSKUByBarcode(barcode);
      if (found) {
        const withStock = skus.find((s) => s.id === found.id) || null;
        setSelectedSkuForTx(withStock);
      } else {
        alert(`Barcode "${barcode}" tidak ditemukan.`);
      }
    });
    setIsScannerOpen(true);
  };

  const handleOpenScannerForOpname = (onScanned: (barcode: string) => void) => {
    setScannerCallback(() => onScanned);
    setIsScannerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {/* Container Lebar Smartphone Max-Width (Portrait Native) */}
      <div className="w-full max-w-md bg-slate-100 min-h-screen flex flex-col relative">
        {/* Sticky Header */}
        <Header
          totalSku={skus.length}
          criticalCount={criticalCount}
          onOpenScanner={handleOpenGlobalScanner}
          onOpenOpname={() => setIsOpnameModalOpen(true)}
          onOpenAIConsultant={() => setIsAIConsultantOpen(true)}
          onOpenCreateProduct={() => {
            setSkuToEdit(null);
            setIsProductModalOpen(true);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Sticky A-Z Ribbon ala Buku Kwarto */}
        <AlphabetRibbon
          selectedLetter={selectedLetter}
          onSelectLetter={setSelectedLetter}
          availableLetters={availableLetters}
          criticalLetters={criticalLetters}
        />

        {/* Summary Card Ringkas */}
        <div className="px-4 pt-3 pb-1">
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Nilai Modal Gudang
              </span>
              <div className="font-mono font-black text-lg text-emerald-400">
                {formatRupiah(totalAssetValue)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Indeks Tab Aktif
              </span>
              <div className="font-mono font-bold text-sm text-blue-300">
                {selectedLetter === "SEMUA" ? "Semua Huruf" : `Huruf "${selectedLetter}"`} ({filteredSkus.length})
              </div>
            </div>
          </div>
        </div>

        {/* Feed Kartu SKU Vertikal (Scroll ke Bawah) */}
        <main className="flex-1 px-4 py-3 space-y-3">
          {filteredSkus.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 mt-4">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">Tidak Ada Barang Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Tidak ada barang dengan awalan huruf &quot;{selectedLetter}&quot; atau kata kunci tersebut.
              </p>
              <button
                onClick={() => {
                  setSkuToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Barang Baru Sekarang</span>
              </button>
            </div>
          ) : (
            filteredSkus.map((sku) => (
              <SKUCard
                key={sku.id}
                sku={sku}
                onOpenLedger={(s) => {
                  setSelectedSkuForLedger(s);
                  setIsLedgerDrawerOpen(true);
                }}
                onOpenPrint={(s) => {
                  setSelectedSkuForPrint(s);
                  setIsPrintModalOpen(true);
                }}
                onQuickMutate={(s) => {
                  setSelectedSkuForTx(s);
                  setIsTxDrawerOpen(true);
                }}
                onEditSKU={(s) => {
                  setSkuToEdit(s);
                  setIsProductModalOpen(true);
                }}
              />
            ))
          )}
        </main>

        {/* Sticky Bottom Action Bar (Thumb-Friendly Ergonomic) */}
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-md mx-auto px-4 pb-4 pt-2 pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-2">
              <button
                onClick={() => {
                  setSkuToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                title="Tambah SKU / Produk Baru"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Barang</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSkuForTx(null);
                  setIsTxDrawerOpen(true);
                }}
                className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>+ Catat Mutasi</span>
              </button>

              <button
                onClick={() => setIsAIConsultantOpen(true)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 active:scale-95 transition-all flex items-center justify-center"
                title="AI Konsultan"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modals & Drawers */}
        <QuickTransactionDrawer
          isOpen={isTxDrawerOpen}
          onClose={() => {
            setIsTxDrawerOpen(false);
            setSelectedSkuForTx(null);
          }}
          onSuccess={refreshData}
          allSkus={skus}
          initialSku={selectedSkuForTx}
          onOpenScannerForSKU={handleOpenScannerForTx}
        />

        <LedgerHistoryDrawer
          isOpen={isLedgerDrawerOpen}
          onClose={() => {
            setIsLedgerDrawerOpen(false);
            setSelectedSkuForLedger(null);
          }}
          sku={selectedSkuForLedger}
          onMutate={(s) => {
            setSelectedSkuForTx(s);
            setIsTxDrawerOpen(true);
          }}
        />

        <BarcodePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedSkuForPrint(null);
          }}
          sku={selectedSkuForPrint}
        />

        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerCallback(null);
          }}
          onScanSuccess={(code) => {
            if (scannerCallback) scannerCallback(code);
          }}
        />

        <StockOpnameModal
          isOpen={isOpnameModalOpen}
          onClose={() => setIsOpnameModalOpen(false)}
          onSuccess={refreshData}
          onOpenScanner={handleOpenScannerForOpname}
        />

        <AIConsultantDrawer
          isOpen={isAIConsultantOpen}
          onClose={() => setIsAIConsultantOpen(false)}
          inventoryContext={skus}
        />

        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSkuToEdit(null);
          }}
          onSuccess={refreshData}
          skuToEdit={skuToEdit}
          onScanBarcode={(callback) => {
            setScannerCallback(() => callback);
            setIsScannerOpen(true);
          }}
        />
      </div>
    </div>
  );
}
