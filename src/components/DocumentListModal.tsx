"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  FileSpreadsheet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  Calendar,
  Building,
  User,
} from "lucide-react";
import { TransactionDoc, Warehouse } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface DocumentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionDoc[];
  activeWarehouse: Warehouse;
  onAddNewDocument: () => void;
}

export const DocumentListModal: React.FC<DocumentListModalProps> = ({
  isOpen,
  onClose,
  transactions,
  activeWarehouse,
  onAddNewDocument,
}) => {
  const [activeTab, setActiveTab] = useState<"semua" | "masuk" | "keluar" | "opname">("semua");
  const [search, setSearch] = useState("");

  const filteredDocs = useMemo(() => {
    return transactions.filter((doc) => {
      const matchTab =
        activeTab === "semua"
          ? true
          : activeTab === "masuk"
          ? doc.type === "masuk" || doc.type === "retur_pelanggan"
          : activeTab === "keluar"
          ? doc.type === "keluar" || doc.type === "retur_pemasok"
          : doc.type === "opname";

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        doc.doc_number.toLowerCase().includes(q) ||
        (doc.contact_name && doc.contact_name.toLowerCase().includes(q)) ||
        (doc.notes && doc.notes.toLowerCase().includes(q));

      return matchTab && matchSearch;
    });
  }, [transactions, activeTab, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Bar (Matching StoDo Screenshot 22.16.53) */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base text-slate-900">Dokumen</h1>
            <div className="text-[11px] text-teal-800 font-semibold">{activeWarehouse.name}</div>
          </div>
        </div>

        {/* Action icons: Search & Excel */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => alert("Ekspor Excel (.xlsx) siap diunduh")}
            className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 active:scale-95 border border-emerald-200 shadow-xs"
            title="Ekspor ke Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onAddNewDocument}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Dokumen</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar (SEMUA | MASUK | KELUAR | STOK OPNAME) */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center space-x-6 text-xs font-bold uppercase tracking-wider overflow-x-auto">
        {(["semua", "masuk", "keluar", "opname"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab === "semua"
              ? "Semua"
              : tab === "masuk"
              ? "Masuk"
              : tab === "keluar"
              ? "Keluar"
              : "Stok Opname"}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor dokumen, pihak terkait..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-700 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              📄
            </div>
            <div className="font-bold text-slate-700 text-sm">Belum ada dokumen transaksi</div>
            <p className="text-xs text-slate-400 mt-1">
              Buat dokumen penerimaan atau pengeluaran barang pertama Anda.
            </p>
            <button
              onClick={onAddNewDocument}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold shadow-md active:scale-95"
            >
              + Tambah Dokumen Sekarang
            </button>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isMasuk = doc.type === "masuk" || doc.type === "retur_pelanggan";
            const badgeColor =
              doc.type === "masuk"
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : doc.type === "keluar"
                ? "bg-sky-100 text-sky-700 border-sky-200"
                : "bg-lime-100 text-lime-800 border-lime-200";

            const Icon =
              doc.type === "masuk"
                ? ArrowDownLeft
                : doc.type === "keluar"
                ? ArrowUpRight
                : ClipboardCheck;

            const totalItemCount = doc.items.reduce((acc, i) => acc + i.quantity, 0);

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all flex items-start justify-between space-x-3"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">
                        {doc.doc_number}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeColor}`}>
                        {doc.type}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
                      {doc.contact_name && (
                        <span className="flex items-center space-x-1 font-semibold text-slate-800">
                          {isMasuk ? <Building className="w-3 h-3 text-slate-400" /> : <User className="w-3 h-3 text-slate-400" />}
                          <span>{doc.contact_name}</span>
                        </span>
                      )}
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center space-x-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{doc.transaction_date}</span>
                      </span>
                    </div>

                    {doc.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1">&ldquo;{doc.notes}&rdquo;</p>
                    )}

                    <div className="text-[11px] text-slate-500 mt-1">
                      {doc.items.length} jenis item ({totalItemCount} total unit)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-extrabold text-sm sm:text-base text-teal-900">
                    {formatRupiah(doc.grand_total)}
                  </span>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        doc.payment_status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {doc.payment_status === "paid" ? "Lunas" : "Belum Bayar"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Add Document Button for Mobile */}
      <button
        type="button"
        onClick={onAddNewDocument}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-800 hover:bg-teal-900 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all z-20"
        title="Tambah Dokumen"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
