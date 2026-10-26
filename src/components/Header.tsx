"use client";

import React, { useState } from "react";
import { BookOpen, Camera, Sparkles, ClipboardCheck, Search, X, Plus } from "lucide-react";

interface HeaderProps {
  totalSku: number;
  criticalCount: number;
  onOpenScanner: () => void;
  onOpenOpname: () => void;
  onOpenAIConsultant: () => void;
  onOpenCreateProduct: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalSku,
  criticalCount,
  onOpenScanner,
  onOpenOpname,
  onOpenAIConsultant,
  onOpenCreateProduct,
  searchQuery,
  onSearchChange,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
      {/* Top Bar */}
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-base tracking-tight">MM Smart Stock</span>
              <span className="text-[10px] bg-blue-500/30 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-400/30">
                Kwarto
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {totalSku} SKU •{" "}
              {criticalCount > 0 ? (
                <span className="text-rose-400 font-semibold">{criticalCount} Kritis</span>
              ) : (
                <span className="text-emerald-400">Semua Aman</span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenCreateProduct}
            aria-label="Tambah produk baru"
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow active:scale-95 transition-transform"
            title="Tambah SKU Baru"
          >
            <Plus className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Cari barang"
            className="p-2 rounded-full hover:bg-slate-800 text-slate-300 active:scale-95 transition-transform"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenScanner}
            aria-label="Scan barcode kamera"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 active:scale-95 transition-transform relative"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenOpname}
            aria-label="Stock opname"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 active:scale-95 transition-transform"
          >
            <ClipboardCheck className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenAIConsultant}
            aria-label="AI Konsultan"
            className="p-2 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow active:scale-95 transition-transform"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {showSearch && (
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nama barang, SKU, atau rak..."
              autoFocus
              className="w-full bg-slate-800 text-white text-sm pl-9 pr-9 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
