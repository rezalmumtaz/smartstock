"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  Wand2,
  ScanLine,
  Camera,
  Image as ImageIcon,
  Plus,
  Minus,
  Calculator,
  ChevronRight,
  ChevronDown,
  X,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { SKUWithCurrentStock, Warehouse, SKU } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";
import { uploadImageToSupabase } from "@/lib/storage-service";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<SKU, "id" | "created_at" | "updated_at">, initialStock: number) => void;
  productToEdit?: SKUWithCurrentStock | null;
  activeWarehouse: Warehouse;
  onOpenScanner?: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  activeWarehouse,
  onOpenScanner,
}) => {
  const [nama, setNama] = useState("");
  const [kodeSku, setKodeSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [kuantitas, setKuantitas] = useState(0);
  const [satuan, setSatuan] = useState("Pcs");
  const [hargaBeli, setHargaBeli] = useState(0);
  const [hargaJual, setHargaJual] = useState(0);
  const [minStock, setMinStock] = useState(10);
  const [lokasiRak, setLokasiRak] = useState("Rak A-01");
  const [fotoUrl, setFotoUrl] = useState<string>("");

  // Custom Fields (Bidang Barang)
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [warna, setWarna] = useState("");
  const [ukuran, setUkuran] = useState("");

  useEffect(() => {
    if (productToEdit) {
      setNama(productToEdit.nama_barang);
      setKodeSku(productToEdit.kode_sku);
      setBarcode(productToEdit.barcode);
      setDeskripsi(productToEdit.deskripsi || "");
      setKuantitas(productToEdit.sisa_stok);
      setSatuan(productToEdit.satuan);
      setHargaBeli(productToEdit.harga_beli);
      setHargaJual(productToEdit.harga_jual || 0);
      setMinStock(productToEdit.batas_stok_minimum);
      setLokasiRak(productToEdit.lokasi_rak || "Rak A-01");
      setFotoUrl(productToEdit.foto_produk_url || "");
      setExpiryDate(productToEdit.custom_fields?.expiry_date || "");
      setWarna(productToEdit.custom_fields?.color || "");
      setUkuran(productToEdit.custom_fields?.size || "");
    } else {
      resetForm();
    }
  }, [productToEdit, isOpen]);

  const resetForm = () => {
    setNama("");
    setKodeSku("");
    setBarcode("");
    setDeskripsi("");
    setKuantitas(0);
    setSatuan("Pcs");
    setHargaBeli(0);
    setHargaJual(0);
    setMinStock(10);
    setLokasiRak("Rak A-01");
    setFotoUrl("");
    setExpiryDate("");
    setWarna("");
    setUkuran("");
  };

  const handleGenerateBarcode = () => {
    const random12 = "899" + Math.floor(100000000 + Math.random() * 900000000).toString();
    setBarcode(random12);
    if (!kodeSku) {
      setKodeSku("SKU-" + random12.slice(-4));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Instant local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Cloud Supabase Storage upload
      const cloudUrl = await uploadImageToSupabase(file, "products");
      if (cloudUrl) {
        setFotoUrl(cloudUrl);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      alert("Nama barang wajib diisi!");
      return;
    }

    const finalBarcode = barcode.trim() || "899" + Math.floor(100000000 + Math.random() * 900000000).toString();
    const finalSku = kodeSku.trim() || "SKU-" + finalBarcode.slice(-4);

    onSave(
      {
        nama_barang: nama.trim(),
        kode_sku: finalSku,
        barcode: finalBarcode,
        deskripsi: deskripsi.trim(),
        satuan,
        lokasi_rak: lokasiRak,
        harga_beli: Number(hargaBeli) || 0,
        harga_jual: Number(hargaJual) || 0,
        batas_stok_minimum: Number(minStock) || 5,
        foto_produk_url: fotoUrl || undefined,
        custom_fields: {
          expiry_date: expiryDate || undefined,
          color: warna || undefined,
          size: ukuran || undefined,
        },
        is_active: true,
      },
      Number(kuantitas) || 0
    );

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white h-full sm:h-auto sm:max-h-[92vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar (Matching StoDo Screenshot 22.16.52) */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 active:scale-95 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-base text-slate-900">
                {productToEdit ? "Edit Barang" : "Tambahkan barang"}
              </h2>
              <div className="inline-flex items-center space-x-1 text-[11px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
                <WarehouseIcon className="w-3 h-3" />
                <span>{activeWarehouse.name}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-md active:scale-95 transition-all"
            title="Simpan"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1. Nama Barang */}
          <div>
            <label className="block text-xs font-semibold text-teal-800 mb-1">
              Nama Barang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Kopi Robusta 250g"
              className="w-full text-base font-semibold text-slate-900 border-b-2 border-teal-700 focus:border-teal-900 focus:outline-hidden py-1 px-1 bg-teal-50/20"
            />
          </div>

          {/* 2. Kode Barang (SKU) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kode barang (SKU)</label>
            <input
              type="text"
              value={kodeSku}
              onChange={(e) => setKodeSku(e.target.value)}
              placeholder="Contoh: KOB-01"
              className="w-full text-sm text-slate-800 border-b border-slate-300 focus:border-teal-700 focus:outline-hidden py-1 px-1"
            />
          </div>

          {/* 3. Barcode with Auto-generate & Scan Button */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Barcode</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan atau input barcode"
                className="flex-1 text-sm text-slate-800 border-b border-slate-300 focus:border-teal-700 focus:outline-hidden py-1 px-1 font-mono"
              />
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="p-2 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 active:scale-95 transition-all shadow-xs"
                title="Auto Generate Barcode"
              >
                <Wand2 className="w-4 h-4" />
              </button>
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="p-2 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 active:scale-95 transition-all shadow-xs"
                  title="Scan via Kamera"
                >
                  <ScanLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Deskripsi */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Tambahkan keterangan barang..."
              className="w-full text-xs text-slate-800 border-b border-slate-300 focus:border-teal-700 focus:outline-hidden py-1 px-1 resize-none"
            />
          </div>

          {/* 5. Banner "Atur Bidang Barang" (Custom Fields Accordion) */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3">
            <button
              type="button"
              onClick={() => setIsCustomFieldsOpen(!isCustomFieldsOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                  +
                </div>
                <div>
                  <div className="text-xs font-bold text-teal-900">Atur bidang barang</div>
                  <div className="text-[11px] text-teal-700">Tanggal kedaluwarsa, warna, ukuran, rak</div>
                </div>
              </div>
              {isCustomFieldsOpen ? (
                <ChevronDown className="w-4 h-4 text-teal-700" />
              ) : (
                <ChevronRight className="w-4 h-4 text-teal-700" />
              )}
            </button>

            {isCustomFieldsOpen && (
              <div className="mt-3 pt-3 border-t border-teal-200/60 space-y-2.5 text-xs animate-in fade-in">
                <div>
                  <label className="block text-slate-600 mb-0.5">Tanggal Kedaluwarsa (EXP)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 focus:ring-1 focus:ring-teal-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Warna</label>
                    <input
                      type="text"
                      value={warna}
                      onChange={(e) => setWarna(e.target.value)}
                      placeholder="Merah / Hitam"
                      className="w-full p-2 rounded-xl bg-white border border-slate-200 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Ukuran</label>
                    <input
                      type="text"
                      value={ukuran}
                      onChange={(e) => setUkuran(e.target.value)}
                      placeholder="L / XL / 500ml"
                      className="w-full p-2 rounded-xl bg-white border border-slate-200 focus:ring-1 focus:ring-teal-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-0.5">Lokasi Rak / Penyimpanan</label>
                  <input
                    type="text"
                    value={lokasiRak}
                    onChange={(e) => setLokasiRak(e.target.value)}
                    placeholder="Contoh: Rak A-02"
                    className="w-full p-2 rounded-xl bg-white border border-slate-200 focus:ring-1 focus:ring-teal-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Kuantitas & Satuan */}
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kuantitas</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="0"
                  value={kuantitas}
                  onChange={(e) => setKuantitas(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-base font-bold text-slate-900 border-b border-slate-300 py-1 px-1 focus:border-teal-700 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setKuantitas((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setKuantitas((prev) => prev + 1)}
                  className="p-1.5 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Ukuran</label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full border-b border-slate-300 py-1.5 px-1 bg-transparent text-sm font-semibold text-slate-800 focus:border-teal-700 focus:outline-hidden"
              >
                <option value="Pcs">Pcs</option>
                <option value="Box">Box</option>
                <option value="Dus">Dus</option>
                <option value="Sak">Sak</option>
                <option value="Kg">Kg</option>
                <option value="Liter">Liter</option>
                <option value="Pack">Pack</option>
                <option value="Lusin">Lusin</option>
                <option value="Unit">Unit</option>
              </select>
            </div>
          </div>

          {/* 7. Harga Beli & Harga Jual */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Harga Beli</label>
                <Calculator className="w-3.5 h-3.5 text-teal-700" />
              </div>
              <div className="relative">
                <span className="absolute left-1 top-1 text-xs text-slate-400">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={hargaBeli}
                  onChange={(e) => setHargaBeli(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-7 pr-1 text-sm font-bold text-slate-900 border-b border-slate-300 py-1 focus:border-teal-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Harga Jual</label>
                <Calculator className="w-3.5 h-3.5 text-teal-700" />
              </div>
              <div className="relative">
                <span className="absolute left-1 top-1 text-xs text-slate-400">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={hargaJual}
                  onChange={(e) => setHargaJual(parseInt(e.target.value, 10) || 0)}
                  className="w-full pl-7 pr-1 text-sm font-bold text-slate-900 border-b border-slate-300 py-1 focus:border-teal-700 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Batas Stok Minimum (Safety Stock) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Batas Kuantitas Minimum (Peringatan Stok Tipis)
            </label>
            <input
              type="number"
              min="1"
              value={minStock}
              onChange={(e) => setMinStock(parseInt(e.target.value, 10) || 5)}
              className="w-32 text-sm font-semibold text-slate-800 border-b border-slate-300 py-1 px-1 focus:border-teal-700 focus:outline-hidden"
            />
          </div>

          {/* 8. Foto Produk (Upload / Preview) (Matching StoDo Screenshot 22.16.52) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto Produk</label>
            {fotoUrl ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                <img src={fotoUrl} alt="Preview Produk" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotoUrl("")}
                  className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                  title="Hapus Foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-teal-300/80 rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 bg-teal-50/20 hover:bg-teal-50/40 transition-colors">
                <div className="flex items-center space-x-3">
                  {/* Upload via Camera / File */}
                  <label className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-teal-600 text-teal-700 font-semibold text-xs shadow-xs hover:bg-teal-50 cursor-pointer active:scale-95 transition-all">
                    <Camera className="w-4 h-4" />
                    <span>Ambil Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-teal-600 text-teal-700 font-semibold text-xs shadow-xs hover:bg-teal-50 cursor-pointer active:scale-95 transition-all">
                    <ImageIcon className="w-4 h-4" />
                    <span>Dari Galeri</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-[11px] text-slate-400">
                  Format JPG, PNG, atau WebP (Disimpan ke Cloud)
                </span>
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer Save Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Barang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
