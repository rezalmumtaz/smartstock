"use client";

import React from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardCheck,
  ArrowRightLeft,
  RotateCcw,
  CornerDownLeft,
} from "lucide-react";
import { TransactionType } from "@/types/stock";

interface AddDocumentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: TransactionType) => void;
}

export const AddDocumentSheet: React.FC<AddDocumentSheetProps> = ({
  isOpen,
  onClose,
  onSelectType,
}) => {
  if (!isOpen) return null;

  const handleChoose = (type: TransactionType) => {
    onSelectType(type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Sheet Content (Matching StoDo Screenshot 22.16.53) */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 z-10 animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-base text-slate-900">Tambahkan dokumen</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: PERGERAKAN STOK */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Pergerakan Stok
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleChoose("masuk")}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-rose-50/60 transition-colors group text-left border border-transparent hover:border-rose-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-rose-700">
                      Masuk
                    </div>
                    <div className="text-xs text-slate-500">Terima ke gudang dari pemasok</div>
                  </div>
                </div>
                <span className="text-xl text-slate-300 font-light group-hover:text-rose-500">+</span>
              </button>

              <button
                type="button"
                onClick={() => handleChoose("keluar")}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-sky-50/60 transition-colors group text-left border border-transparent hover:border-sky-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-sky-700">
                      Keluar
                    </div>
                    <div className="text-xs text-slate-500">Kirim atau jual ke pelanggan</div>
                  </div>
                </div>
                <span className="text-xl text-slate-300 font-light group-hover:text-sky-500">+</span>
              </button>
            </div>
          </div>

          {/* Section 2: PRODUKSI & STOK OPNAME */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Produksi & Stok Opname
            </div>
            <button
              type="button"
              onClick={() => handleChoose("opname")}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-lime-50/60 transition-colors group text-left border border-transparent hover:border-lime-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-lime-100 text-lime-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-lime-800">
                    Stok opname
                  </div>
                  <div className="text-xs text-slate-500">Hitung fisik & cocokkan selisih</div>
                </div>
              </div>
              <span className="text-xl text-slate-300 font-light group-hover:text-lime-600">+</span>
            </button>
          </div>

          {/* Section 3: TRANSFER GUDANG */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Transfer Antar Lokasi
            </div>
            <button
              type="button"
              onClick={() => handleChoose("transfer")}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50/60 transition-colors group text-left border border-transparent hover:border-indigo-100"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-800">
                    Transfer gudang
                  </div>
                  <div className="text-xs text-slate-500">Pindahkan stok antar cabang fisik</div>
                </div>
              </div>
              <span className="text-xl text-slate-300 font-light group-hover:text-indigo-600">+</span>
            </button>
          </div>

          {/* Section 4: RETUR */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Retur
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleChoose("retur_pelanggan")}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-amber-50/60 transition-colors group text-left border border-transparent hover:border-amber-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-amber-800">
                      Retur dari pelanggan
                    </div>
                    <div className="text-xs text-slate-500">Barang kembali dari pembeli</div>
                  </div>
                </div>
                <span className="text-xl text-slate-300 font-light group-hover:text-amber-600">+</span>
              </button>

              <button
                type="button"
                onClick={() => handleChoose("retur_pemasok")}
                className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-teal-50/60 transition-colors group text-left border border-transparent hover:border-teal-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <CornerDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 group-hover:text-teal-800">
                      Retur ke pemasok
                    </div>
                    <div className="text-xs text-slate-500">Barang kembali ke supplier</div>
                  </div>
                </div>
                <span className="text-xl text-slate-300 font-light group-hover:text-teal-600">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
