"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  LayoutGrid,
  List as ListIcon,
  AlertTriangle,
  Edit2,
  Trash2,
  Package,
  Barcode,
  Sparkles,
} from "lucide-react";
import { SKUWithCurrentStock, Warehouse } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface ProductListModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: SKUWithCurrentStock[];
  activeWarehouse: Warehouse;
  onAddNewProduct: () => void;
  onEditProduct: (product: SKUWithCurrentStock) => void;
  onDeleteProduct: (id: string) => void;
  onQuickStockIn: (product: SKUWithCurrentStock) => void;
  onQuickStockOut: (product: SKUWithCurrentStock) => void;
}

export const ProductListModal: React.FC<ProductListModalProps> = ({
  isOpen,
  onClose,
  products,
  activeWarehouse,
  onAddNewProduct,
  onEditProduct,
  onDeleteProduct,
  onQuickStockIn,
  onQuickStockOut,
}) => {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.nama_barang.toLowerCase().includes(search.toLowerCase()) ||
        p.kode_sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);

      const matchCritical = !filterCriticalOnly || p.status_stok === "KRITIS" || p.status_stok === "KOSONG";

      return matchSearch && matchCritical;
    });
  }, [products, search, filterCriticalOnly]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Header Bar */}
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
            <h1 className="font-bold text-base text-slate-900">Daftar Barang</h1>
            <div className="text-[11px] text-teal-700 font-medium">
              Lokasi: {activeWarehouse.name} ({filteredProducts.length} SKU)
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Add Button */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-white text-teal-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Grid Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table" ? "bg-white text-teal-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Tampilan Tabel Kompak"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onAddNewProduct}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, SKU, atau barcode..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-700 focus:bg-white transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
            filterCriticalOnly
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Stok Tipis / Kritis</span>
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <div className="font-bold text-slate-700 text-base">Tidak ada barang ditemukan</div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? "Coba ganti kata kunci pencarian Anda"
                : "Mulai dengan menambahkan master barang pertama Anda."}
            </p>
            <button
              onClick={onAddNewProduct}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold shadow-md active:scale-95"
            >
              + Tambah Barang Baru
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
              >
                {/* Photo & Badge */}
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  {p.foto_produk_url ? (
                    <img
                      src={p.foto_produk_url}
                      alt={p.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Package className="w-10 h-10 mb-1" />
                      <span className="text-[10px]">Tanpa Foto</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs ${
                        p.status_stok === "KRITIS" || p.status_stok === "KOSONG"
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {p.sisa_stok} {p.satuan}
                    </span>
                  </div>

                  {/* SKU Pill */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="text-[10px] font-mono font-semibold bg-slate-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {p.kode_sku}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1">
                      {p.nama_barang}
                    </h3>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                      <Barcode className="w-3 h-3" />
                      <span className="font-mono">{p.barcode}</span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Harga Beli</div>
                        <div className="font-semibold text-slate-700">{formatRupiah(p.harga_beli)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Harga Jual</div>
                        <div className="font-bold text-teal-800">{formatRupiah(p.harga_jual || 0)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => onQuickStockIn(p)}
                        className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold transition-colors"
                        title="Tambah Stok Masuk"
                      >
                        + Masuk
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickStockOut(p)}
                        className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-semibold transition-colors"
                        title="Kirim Stok Keluar"
                      >
                        - Keluar
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => onEditProduct(p)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Edit Barang"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus barang "${p.nama_barang}"?`)) {
                            onDeleteProduct(p.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Barang</th>
                    <th className="p-3">SKU & Barcode</th>
                    <th className="p-3 text-right">Sisa Stok</th>
                    <th className="p-3 text-right">Harga Beli</th>
                    <th className="p-3 text-right">Harga Jual</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          {p.foto_produk_url ? (
                            <img
                              src={p.foto_produk_url}
                              alt={p.nama_barang}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">{p.nama_barang}</div>
                            <div className="text-[10px] text-slate-400">{p.lokasi_rak}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-medium text-slate-700">{p.kode_sku}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.barcode}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`inline-block font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            p.status_stok === "KRITIS" || p.status_stok === "KOSONG"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.sisa_stok} {p.satuan}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600">
                        {formatRupiah(p.harga_beli)}
                      </td>
                      <td className="p-3 text-right font-bold text-teal-800">
                        {formatRupiah(p.harga_jual || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => onEditProduct(p)}
                            className="p-1 text-slate-500 hover:text-teal-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus barang "${p.nama_barang}"?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Product Button for Mobile */}
      <button
        type="button"
        onClick={onAddNewProduct}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-800 hover:bg-teal-900 text-white shadow-xl flex items-center justify-center active:scale-95 transition-all z-20"
        title="Tambah Barang"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
