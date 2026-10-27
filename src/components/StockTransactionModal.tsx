"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  Search,
  ScanLine,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Building,
  User,
  Percent,
} from "lucide-react";
import {
  TransactionType,
  TransactionDoc,
  TransactionItem,
  SKUWithCurrentStock,
  Warehouse,
  Contact,
} from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  products: SKUWithCurrentStock[];
  contacts: Contact[];
  activeWarehouse: Warehouse;
  onSaveTransaction: (
    txData: Omit<TransactionDoc, "id" | "doc_number" | "subtotal" | "grand_total" | "created_at"> & {
      doc_number?: string;
    }
  ) => void;
  onOpenScanner?: () => void;
  preselectedProduct?: SKUWithCurrentStock | null;
}

export const StockTransactionModal: React.FC<StockTransactionModalProps> = ({
  isOpen,
  onClose,
  type,
  products,
  contacts,
  activeWarehouse,
  onSaveTransaction,
  onOpenScanner,
  preselectedProduct,
}) => {
  const isMasuk = type === "masuk" || type === "retur_pelanggan";
  const title =
    type === "masuk"
      ? "Barang Masuk"
      : type === "keluar"
      ? "Barang Keluar"
      : type === "opname"
      ? "Stok Opname"
      : type === "transfer"
      ? "Transfer Antar Gudang"
      : type === "retur_pelanggan"
      ? "Retur Pelanggan"
      : "Retur ke Pemasok";

  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [docNumber, setDocNumber] = useState("");
  const [contactId, setContactId] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [keterangan, setKeterangan] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [items, setItems] = useState<TransactionItem[]>([]);

  // Modal selector item
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prefix = isMasuk ? "IN-" : "OUT-";
      setDocNumber(`${prefix}${String(Math.floor(100000 + Math.random() * 900000))}`);
      setTanggal(new Date().toISOString().split("T")[0]);
      setContactId("");
      setDiscountPercent(0);
      setKeterangan("");
      setPaymentStatus("paid");

      if (preselectedProduct) {
        setItems([
          {
            id: "line-1",
            sku_id: preselectedProduct.id,
            kode_sku: preselectedProduct.kode_sku,
            nama_barang: preselectedProduct.nama_barang,
            quantity: 1,
            unit_price: isMasuk ? preselectedProduct.harga_beli : (preselectedProduct.harga_jual || 0),
            total_price: isMasuk ? preselectedProduct.harga_beli : (preselectedProduct.harga_jual || 0),
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, type, preselectedProduct, isMasuk]);

  // Filter kontak berdasarkan tipe
  const availableContacts = contacts.filter((c) =>
    isMasuk ? c.type === "supplier" : c.type === "customer"
  );

  const handleAddItem = (prod: SKUWithCurrentStock) => {
    const existingIndex = items.findIndex((i) => i.sku_id === prod.id);
    const price = isMasuk ? prod.harga_beli : (prod.harga_jual || 0);

    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          id: "item-" + Date.now() + Math.random(),
          sku_id: prod.id,
          kode_sku: prod.kode_sku,
          nama_barang: prod.nama_barang,
          quantity: 1,
          unit_price: price,
          total_price: price,
        },
      ]);
    }
    setIsItemPickerOpen(false);
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    const updated = [...items];
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
      updated[index].total_price = newQty * updated[index].unit_price;
    }
    setItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    updated[index].unit_price = Math.max(0, newPrice);
    updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    setItems(updated);
  };

  const subtotal = items.reduce((acc, i) => acc + i.total_price, 0);
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Harap pilih minimal 1 barang untuk transaksi!");
      return;
    }

    const selectedContact = contacts.find((c) => c.id === contactId);

    onSaveTransaction({
      doc_number: docNumber,
      type,
      warehouse_id: activeWarehouse.id,
      contact_id: contactId || undefined,
      contact_name: selectedContact?.name,
      transaction_date: tanggal,
      discount_percent: discountPercent,
      payment_status: paymentStatus,
      notes: keterangan.trim(),
      items,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Bar (Matching StoDo Screenshot 22.16.57 (2)) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-base text-slate-900 leading-tight">
                {title} No. {docNumber}
              </h2>
              <div className="text-[11px] text-teal-800 font-semibold">{activeWarehouse.name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {onOpenScanner && (
              <button
                type="button"
                onClick={onOpenScanner}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95"
                title="Scan Barcode Barang"
              >
                <ScanLine className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="p-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-md active:scale-95 transition-all"
              title="Simpan Dokumen"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Card Properti Dokumen (Matching StoDo Reference) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Properti Dokumen</span>
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {isMasuk ? "Penerimaan" : "Pengeluaran"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Tanggal</span>
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1 flex items-center space-x-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  <span>No. Bukti</span>
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full p-2 bg-white rounded-xl border border-slate-200 font-mono font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Pemasok / Pelanggan Selector */}
            <div>
              <label className="block text-xs text-slate-500 mb-1 flex items-center space-x-1">
                {isMasuk ? <Building className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                <span>{isMasuk ? "Pilih Pemasok (Supplier)" : "Pilih Pelanggan (Customer)"}</span>
              </label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
              >
                <option value="">
                  -- Pilih {isMasuk ? "Pemasok" : "Pelanggan"} (Bisa Dikosongkan) --
                </option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Diskon (%) khusus barang keluar */}
            {!isMasuk && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 flex items-center space-x-1">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Diskon (%)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 text-xs"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status Pembayaran</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as "paid" | "unpaid")}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800 text-xs"
                  >
                    <option value="paid">Lunas (Sudah Dibayar)</option>
                    <option value="unpaid">Belum Dibayar (Tempo)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Catatan / Keterangan */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Keterangan / Catatan</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tambahkan catatan transaksi..."
                className="w-full p-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Barang ({items.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Barang</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-600">Belum ada barang dipilih</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik tombol &quot;Tambah Barang&quot; di atas untuk memilih item.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between space-x-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {item.nama_barang}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{item.kode_sku}</div>
                      <div className="text-[11px] text-teal-800 font-semibold mt-0.5">
                        {formatRupiah(item.unit_price)} x {item.quantity} = {formatRupiah(item.total_price)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItemQty(index, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 p-1.5 text-center font-bold text-xs bg-slate-100 rounded-xl border border-slate-200 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQty(index, 0)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Summary Bar (Matching StoDo Screenshot 22.16.57 (2) footer: Count, Qty, Total Rp) */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold sticky bottom-0 z-20">
          <div className="flex items-center space-x-3 text-slate-600">
            <div>
              <span className="text-slate-400 text-[10px] block">Item</span>
              <span>{items.length}</span>
            </div>
            <div className="border-l border-slate-300 pl-3">
              <span className="text-slate-400 text-[10px] block">Kuantitas</span>
              <span>{totalQty}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">Total Transaksi</span>
            <span className="text-teal-900 font-extrabold text-sm sm:text-base">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        {/* Item Picker Modal Overlay */}
        {isItemPickerOpen && (
          <div className="absolute inset-0 bg-white z-30 flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="font-bold text-sm text-slate-800">Pilih Barang dari Katalog</div>
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAddItem(p)}
                  className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    {p.foto_produk_url ? (
                      <img
                        src={p.foto_produk_url}
                        alt={p.nama_barang}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                        📦
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-teal-800">
                        {p.nama_barang}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.kode_sku} • Stok: {p.sisa_stok} {p.satuan}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-slate-700">
                      {formatRupiah(isMasuk ? p.harga_beli : (p.harga_jual || 0))}
                    </div>
                    <span className="text-[10px] text-teal-700 font-semibold">+ Pilih</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
