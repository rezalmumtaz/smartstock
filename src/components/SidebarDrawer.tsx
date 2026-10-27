"use client";

import React from "react";
import {
  X,
  Home,
  Package,
  FileText,
  DollarSign,
  BarChart3,
  Users,
  UserCheck,
  Warehouse as WarehouseIcon,
  Settings,
  CreditCard,
  HelpCircle,
  Sparkles,
} from "lucide-react";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentView,
}) => {
  if (!isOpen) return null;

  const handleSelect = (view: string) => {
    onNavigate(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Content */}
      <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Header Drawer */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-teal-800 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-500/40 flex items-center justify-center text-teal-100 shadow-inner">
              <Package className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">MM Smart Stock</div>
              <div className="text-[11px] text-teal-200">v1.0 Cloud & AI Edition</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 text-slate-700 text-sm font-medium">
          <button
            onClick={() => handleSelect("dashboard")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "dashboard" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <Home className="w-5 h-5 text-teal-700" />
            <span>Menu Utama</span>
          </button>

          <button
            onClick={() => handleSelect("products")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "products" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <Package className="w-5 h-5 text-teal-700" />
            <span>Barang</span>
          </button>

          <button
            onClick={() => handleSelect("documents")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "documents" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <FileText className="w-5 h-5 text-teal-700" />
            <span>Dokumen Transaksi</span>
          </button>

          <button
            onClick={() => handleSelect("expenses")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "expenses" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <DollarSign className="w-5 h-5 text-teal-700" />
            <span>Biaya Operasional</span>
          </button>

          <button
            onClick={() => handleSelect("reports")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "reports" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <span>Laporan & Analitik</span>
          </button>

          <div className="pt-2 pb-1 px-3">
            <div className="border-t border-slate-200/80" />
          </div>

          <button
            onClick={() => handleSelect("suppliers")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "suppliers" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <Users className="w-5 h-5 text-teal-700" />
            <span>Pemasok (Suppliers)</span>
          </button>

          <button
            onClick={() => handleSelect("customers")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "customers" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <UserCheck className="w-5 h-5 text-teal-700" />
            <span>Pelanggan (Customers)</span>
          </button>

          <button
            onClick={() => handleSelect("warehouses")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "warehouses" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <WarehouseIcon className="w-5 h-5 text-teal-700" />
            <span>Gudang (Multi-Warehouse)</span>
          </button>

          <div className="pt-2 pb-1 px-3">
            <div className="border-t border-slate-200/80" />
          </div>

          <button
            onClick={() => handleSelect("settings")}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-colors ${
              currentView === "settings" ? "bg-teal-50 text-teal-800 font-bold" : "hover:bg-slate-100"
            }`}
          >
            <Settings className="w-5 h-5 text-teal-700" />
            <span>Pengaturan</span>
          </button>

          <button
            onClick={() => handleSelect("subscription")}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-amber-700"
          >
            <div className="flex items-center space-x-3">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>Paket Berlangganan</span>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              PRO
            </span>
          </button>
        </div>

        {/* Footer Drawer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span className="truncate">Tersambung ke Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
