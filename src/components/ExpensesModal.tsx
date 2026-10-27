"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  DollarSign,
  Calendar,
  Building,
  Tag,
  Paperclip,
  Check,
  X,
  Camera,
} from "lucide-react";
import { ExpenseItem, Warehouse } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";
import { uploadImageToSupabase } from "@/lib/storage-service";

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
  activeWarehouse: Warehouse;
  onAddExpense: (expense: Omit<ExpenseItem, "id" | "created_at">) => void;
}

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  isOpen,
  onClose,
  expenses,
  activeWarehouse,
  onAddExpense,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form Fields (Matching StoDo Screenshot 22.16.56 (1))
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [jumlah, setJumlah] = useState<number>(0);
  const [kategori, setKategori] = useState("Lainnya");
  const [nama, setNama] = useState("");
  const [catatan, setCatatan] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");

  if (!isOpen) return null;

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || jumlah <= 0) {
      alert("Nama pengeluaran dan jumlah (Rp) wajib diisi!");
      return;
    }

    onAddExpense({
      warehouse_id: activeWarehouse.id,
      expense_date: tanggal,
      amount: Number(jumlah),
      category: kategori,
      name: nama.trim(),
      receipt_url: receiptUrl || undefined,
      notes: catatan.trim() || undefined,
    });

    setNama("");
    setJumlah(0);
    setCatatan("");
    setReceiptUrl("");
    setIsAddOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Instant local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Cloud Supabase Storage upload
      const cloudUrl = await uploadImageToSupabase(file, "receipts");
      if (cloudUrl) {
        setReceiptUrl(cloudUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-100">
      {/* Top Bar */}
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
            <h1 className="font-bold text-base text-slate-900">Biaya Operasional</h1>
            <div className="text-[11px] text-teal-800 font-semibold">{activeWarehouse.name}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Biaya</span>
        </button>
      </div>

      {/* Total Card */}
      <div className="p-4 bg-teal-900 text-white flex items-center justify-between">
        <div>
          <span className="text-teal-200 text-xs">Total Pengeluaran Bulan Ini</span>
          <div className="text-xl sm:text-2xl font-black mt-0.5">
            {formatRupiah(totalExpenseAmount)}
          </div>
        </div>
        <div className="text-xs bg-teal-800 text-teal-100 px-3 py-1.5 rounded-xl border border-teal-700">
          {expenses.length} Catatan
        </div>
      </div>

      {/* Expenses List */}
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-3">
        {expenses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              🧾
            </div>
            <div className="font-bold text-slate-700 text-sm">Belum ada catatan biaya</div>
            <p className="text-xs text-slate-400 mt-1">
              Catat pengeluaran listrik, sewa, bensin, dan operasional gudang lainnya.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-800 text-white text-xs font-semibold shadow-md active:scale-95"
            >
              + Tambah Biaya Baru
            </button>
          </div>
        ) : (
          expenses.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all flex items-start justify-between space-x-3"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{e.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                      {e.category}
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{e.expense_date}</span>
                    </span>
                  </div>
                  {e.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">&ldquo;{e.notes}&rdquo;</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="font-extrabold text-sm sm:text-base text-rose-600">
                  - {formatRupiah(e.amount)}
                </span>
                {e.receipt_url && (
                  <span className="text-[10px] text-teal-700 font-semibold block mt-1">
                    📎 Ada Bukti Nota
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Form Modal (Matching StoDo Screenshot 22.16.56 (1)) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Menambahkan biaya</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Jumlah (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={jumlah || ""}
                    onChange={(e) => setJumlah(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kategori</label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800"
                >
                  <option value="Listrik & Air">Listrik & Air</option>
                  <option value="Sewa Gudang">Sewa Gudang</option>
                  <option value="Gaji & Upah">Gaji & Upah Karyawan</option>
                  <option value="Transport & Bensin">Transport & Bensin</option>
                  <option value="Packing & Lakban">Packing & Lakban</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nama / Keperluan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Beli lakban & kardus packing"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Lokasi Gudang</label>
                <input
                  type="text"
                  disabled
                  value={activeWarehouse.name}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600"
                />
              </div>

              {/* Lampiran Foto Nota */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Foto Bukti Nota</label>
                {receiptUrl ? (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200">
                    <img src={receiptUrl} alt="Nota" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReceiptUrl("")}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50/20 hover:bg-teal-50 cursor-pointer">
                    <Camera className="w-4 h-4 text-teal-700" />
                    <span className="text-teal-700 font-semibold">Upload Foto Bukti Nota</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold shadow-md"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
