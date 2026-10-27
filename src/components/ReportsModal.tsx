"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Star,
  MoreVertical,
  TrendingUp,
  AlertTriangle,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { SKUWithCurrentStock, TransactionDoc, ExpenseItem, Contact } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: SKUWithCurrentStock[];
  transactions: TransactionDoc[];
  expenses: ExpenseItem[];
  contacts: Contact[];
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  expenses,
  contacts,
}) => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculations for P&L
  const totalSales = transactions
    .filter((t) => t.type === "keluar")
    .reduce((acc, t) => acc + t.grand_total, 0);

  const totalPurchases = transactions
    .filter((t) => t.type === "masuk")
    .reduce((acc, t) => acc + t.grand_total, 0);

  const totalExpensesAmount = expenses.reduce((acc, e) => acc + e.amount, 0);
  const estimatedGrossProfit = totalSales - totalSales * 0.75; // Approx 25% margin
  const netProfit = estimatedGrossProfit - totalExpensesAmount;

  // Critical stock items for Reorder Report
  const criticalItems = products.filter(
    (p) => p.status_stok === "KRITIS" || p.status_stok === "KOSONG"
  );

  const reportItems = [
    { id: "pl", title: "Laba dan Rugi", desc: "Ringkasan pendapatan, HPP, beban & laba bersih", icon: TrendingUp },
    { id: "reorder", title: "Laporan Pemesanan Ulang", desc: `${criticalItems.length} barang di bawah kuantitas minimum`, icon: AlertTriangle },
    { id: "buku_kas", title: "Buku Kas & Cashflow", desc: "Arus kas masuk & keluar riil", icon: BookOpen },
    { id: "biaya", title: "Biaya Operasional", desc: `Total ${formatRupiah(totalExpensesAmount)} beban tercatat`, icon: DollarSign },
    { id: "penjualan", title: "Penjualan berdasarkan Barang", desc: `Total ${formatRupiah(totalSales)} penjualan`, icon: ArrowUpRight },
    { id: "pembelian", title: "Pembelian berdasarkan Barang", desc: `Total ${formatRupiah(totalPurchases)} pembelian stok`, icon: ArrowDownLeft },
    { id: "piutang", title: "Piutang Pelanggan", desc: "Daftar tagihan ke customer belum lunas", icon: FileText },
    { id: "utang", title: "Utang ke Pemasok", desc: "Daftar tagihan dari supplier belum lunas", icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Bar (Matching StoDo Screenshot 22.16.56) */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-base text-slate-900">Laporan & Analitik</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-3">
        {/* Detail Report View if Selected */}
        {selectedReport === "pl" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-base text-slate-900">Laporan Laba dan Rugi</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-xs text-teal-700 font-semibold"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Penjualan Barang</span>
                <span className="font-bold text-slate-900">{formatRupiah(totalSales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                <span>Perkiraan HPP (Harga Pokok Penjualan)</span>
                <span className="font-bold">- {formatRupiah(totalSales - estimatedGrossProfit)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 font-bold text-teal-900">
                <span>Laba Kotor (Gross Profit)</span>
                <span>{formatRupiah(estimatedGrossProfit)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                <span>Total Beban Biaya Operasional</span>
                <span className="font-bold">- {formatRupiah(totalExpensesAmount)}</span>
              </div>
              <div className="flex justify-between py-2 text-base font-extrabold bg-teal-50 p-3 rounded-2xl text-teal-900">
                <span>Estimasi Laba Bersih</span>
                <span>{formatRupiah(netProfit)}</span>
              </div>
            </div>
          </div>
        )}

        {selectedReport === "reorder" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-base text-slate-900">Laporan Pemesanan Ulang</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-xs text-teal-700 font-semibold"
              >
                Tutup
              </button>
            </div>
            {criticalItems.length === 0 ? (
              <p className="text-xs text-emerald-600 font-semibold py-4 text-center">
                Semua stok barang masih di atas batas kuantitas minimum. Aman!
              </p>
            ) : (
              <div className="space-y-2">
                {criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{item.nama_barang}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {item.kode_sku} • Lokasi: {item.lokasi_rak}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600">
                        Sisa: {item.sisa_stok} {item.satuan}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        Batas Min: {item.batas_stok_minimum} {item.satuan}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reports Navigation List (Matching StoDo Screenshot 22.16.56) */}
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {reportItems.map((rep) => {
            const Icon = rep.icon;
            return (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedReport(rep.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-teal-800">
                      {rep.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{rep.desc}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-slate-300">
                  <Star className="w-4 h-4 hover:text-amber-400 transition-colors" />
                  <MoreVertical className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
