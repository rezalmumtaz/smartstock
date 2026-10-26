"use client";

import React, { useState, useEffect, useRef } from "react";
import { SKU, SatuanBarang } from "@/types/stock";
import { ledgerService } from "@/lib/ledger-service";
import {
  X,
  Upload,
  Camera,
  Package,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  skuToEdit?: SKU | null;
  onScanBarcode: (onScanned: (code: string) => void) => void;
}

const SATUAN_OPTIONS: SatuanBarang[] = [
  "Pcs",
  "Box",
  "Kg",
  "Meter",
  "Liter",
  "Unit",
  "Roll",
  "Set",
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  skuToEdit,
  onScanBarcode,
}) => {
  const isEditing = Boolean(skuToEdit);

  const [kodeSku, setKodeSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [namaBarang, setNamaBarang] = useState("");
  const [satuan, setSatuan] = useState<string>("Pcs");
  const [lokasiRak, setLokasiRak] = useState("");
  const [hargaBeli, setHargaBeli] = useState<number>(0);
  const [batasStokMinimum, setBatasStokMinimum] = useState<number>(10);
  const [saldoAwal, setSaldoAwal] = useState<number>(0);
  const [fotoUrl, setFotoUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (skuToEdit) {
      setKodeSku(skuToEdit.kode_sku);
      setBarcode(skuToEdit.barcode);
      setNamaBarang(skuToEdit.nama_barang);
      setSatuan(skuToEdit.satuan);
      setLokasiRak(skuToEdit.lokasi_rak);
      setHargaBeli(skuToEdit.harga_beli);
      setBatasStokMinimum(skuToEdit.batas_stok_minimum);
      setFotoUrl(skuToEdit.foto_produk_url || "");
      setSaldoAwal(0);
    } else {
      // Form baru: generate kode & barcode acak
      const randomCode = Math.floor(100 + Math.random() * 900);
      setKodeSku(`SKU-${randomCode}`);
      setBarcode(`899${Date.now().toString().slice(-8)}`);
      setNamaBarang("");
      setSatuan("Pcs");
      setLokasiRak("Rak A-1");
      setHargaBeli(0);
      setBatasStokMinimum(10);
      setSaldoAwal(0);
      setFotoUrl("");
    }
    setErrorMessage(null);
  }, [isOpen, skuToEdit]);

  if (!isOpen) return null;

  // Handle Upload Foto dari File / Kamera HP
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batasi ukuran maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Ukuran gambar terlalu besar (Maksimal 5MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateBarcode = () => {
    setBarcode(`899${Date.now().toString().slice(-8)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!namaBarang.trim()) {
      setErrorMessage("Nama barang wajib diisi.");
      return;
    }
    if (!kodeSku.trim()) {
      setErrorMessage("Kode SKU wajib diisi.");
      return;
    }
    if (!barcode.trim()) {
      setErrorMessage("Barcode wajib diisi.");
      return;
    }
    if (!lokasiRak.trim()) {
      setErrorMessage("Lokasi rak wajib diisi.");
      return;
    }

    try {
      if (isEditing && skuToEdit) {
        ledgerService.updateSKU(skuToEdit.id, {
          kode_sku: kodeSku.trim().toUpperCase(),
          barcode: barcode.trim(),
          nama_barang: namaBarang.trim(),
          satuan,
          lokasi_rak: lokasiRak.trim().toUpperCase(),
          harga_beli: hargaBeli || 0,
          batas_stok_minimum: batasStokMinimum || 0,
          foto_produk_url: fotoUrl.trim() || undefined,
        });
      } else {
        ledgerService.addSKU(
          {
            kode_sku: kodeSku.trim().toUpperCase(),
            barcode: barcode.trim(),
            nama_barang: namaBarang.trim(),
            satuan,
            lokasi_rak: lokasiRak.trim().toUpperCase(),
            harga_beli: hargaBeli || 0,
            batas_stok_minimum: batasStokMinimum || 0,
            foto_produk_url: fotoUrl.trim() || undefined,
            is_active: true,
          },
          saldoAwal
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan produk.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* Drag Indicator */}
        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {isEditing ? "Pengaturan / Edit Barang" : "Tambah Item Produk Baru"}
            </h3>
            <p className="text-xs text-slate-500">
              {isEditing ? `Mengubah data ${skuToEdit?.kode_sku}` : "Daftarkan SKU baru ke Master Data Gudang"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Bagian Upload Foto Produk */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Foto Produk (Kamera / Galeri HP)
            </label>

            <div className="flex items-center space-x-3">
              {/* Preview Thumbnail */}
              <div className="relative w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {fotoUrl ? (
                  <>
                    <img
                      src={fotoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFotoUrl("")}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-400" />
                )}
              </div>

              {/* Action Buttons Upload */}
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Ambil Foto / Pilih File</span>
                </button>

                <input
                  type="text"
                  value={fotoUrl.startsWith("data:") ? "" : fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="Atau tempel URL gambar (https://...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Barang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="Contoh: Baut Baja Hitam M10 x 60mm"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Kode SKU & Lokasi Rak */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kode SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={kodeSku}
                onChange={(e) => setKodeSku(e.target.value.toUpperCase())}
                placeholder="B-003"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Lokasi Rak <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lokasiRak}
                onChange={(e) => setLokasiRak(e.target.value)}
                placeholder="Rak A-2"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Barcode System */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">
                Nomor Barcode / QR Code
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="text-[10px] text-blue-600 font-bold flex items-center space-x-0.5 hover:underline"
              >
                <RefreshCw className="w-3 h-3 mr-0.5" />
                <span>Auto-generate</span>
              </button>
            </div>

            <div className="flex space-x-1.5">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="89910010001"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => onScanBarcode((scanned) => setBarcode(scanned))}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 text-xs font-bold flex items-center space-x-1"
                title="Scan barcode fisik barang"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Scan</span>
              </button>
            </div>
          </div>

          {/* Satuan & Harga Beli (HPP) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Satuan
              </label>
              <select
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {SATUAN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Harga Beli (HPP)
              </label>
              <input
                type="number"
                min="0"
                value={hargaBeli || ""}
                onChange={(e) => setHargaBeli(parseInt(e.target.value, 10) || 0)}
                placeholder="1500"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Batas Stok Minimum (ROP) & Saldo Awal (Khusus Create Baru) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Min. Stok (ROP)
              </label>
              <input
                type="number"
                min="0"
                value={batasStokMinimum}
                onChange={(e) => setBatasStokMinimum(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400">Alarm menyala jika sisa &le; nilai ini</span>
            </div>

            {!isEditing ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Saldo Awal Fisik
                </label>
                <input
                  type="number"
                  min="0"
                  value={saldoAwal || ""}
                  onChange={(e) => setSaldoAwal(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400">Dicatat ke ledger Kwarto awal</span>
              </div>
            ) : (
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 flex items-center">
                <span>Perubahan stok dilakukan via menu <strong>Mutasi</strong> atau <strong>Opname</strong>.</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isEditing ? "SIMPAN PERUBAHAN PRODUK" : "TAMBAHKAN PRODUK KE MASTER"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
