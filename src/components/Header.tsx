"use client";

import React, { useState } from "react";
import { Menu, ScanLine, Mic, ChevronDown, Warehouse as WarehouseIcon, Sparkles } from "lucide-react";
import { Warehouse } from "@/types/stock";

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenScanner: () => void;
  onOpenVoiceAI: () => void;
  warehouses: Warehouse[];
  activeWarehouse: Warehouse;
  onSelectWarehouse: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenDrawer,
  onOpenScanner,
  onOpenVoiceAI,
  warehouses,
  activeWarehouse,
  onSelectWarehouse,
}) => {
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Drawer Hamburger & Brand */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onOpenDrawer}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                MM Smart Stock
              </span>
            </div>

            {/* Warehouse Selector Pill (Matching Reference) */}
            <div className="relative mt-0.5">
              <button
                type="button"
                onClick={() => setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-800 text-teal-50 hover:bg-teal-900 transition-colors shadow-xs"
              >
                <WarehouseIcon className="w-3 h-3 text-teal-300" />
                <span className="truncate max-w-[130px]">{activeWarehouse.name}</span>
                <ChevronDown className="w-3 h-3 text-teal-300" />
              </button>

              {/* Warehouse Dropdown Menu */}
              {isWarehouseDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsWarehouseDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Pilih Lokasi Gudang
                    </div>
                    {warehouses.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          onSelectWarehouse(w.id);
                          setIsWarehouseDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50/80 transition-colors ${
                          w.id === activeWarehouse.id ? "text-teal-800 font-bold bg-teal-50/50" : "text-slate-700"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <WarehouseIcon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{w.name}</span>
                        </div>
                        {w.is_default && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            Utama
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Actions (Voice Note AI & Barcode Scanner) */}
        <div className="flex items-center space-x-1.5">
          {/* Voice AI Shortcut */}
          <button
            type="button"
            onClick={onOpenVoiceAI}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100 active:scale-95 transition-all text-xs font-semibold shadow-xs"
            title="Input Suara AI"
          >
            <Mic className="w-4 h-4 text-amber-600" />
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Voice AI</span>
          </button>

          {/* Barcode Scanner Shortcut */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition-all border border-slate-200 shadow-xs"
            title="Scan Barcode"
          >
            <ScanLine className="w-5 h-5 text-teal-700" />
          </button>
        </div>
      </div>
    </header>
  );
};
