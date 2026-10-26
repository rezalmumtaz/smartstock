"use client";

import React, { useEffect, useRef, useState } from "react";
import { SKU } from "@/types/stock";
import { X, Printer, QrCode as QrIcon, BarChart2 } from "lucide-react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface BarcodePrintModalProps {
  sku: SKU | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  sku,
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<"code128" | "qrcode">("code128");
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen || !sku) return;

    if (format === "code128" && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, sku.barcode, {
          format: "CODE128",
          width: 2,
          height: 55,
          displayValue: true,
          font: "monospace",
          fontSize: 13,
          textMargin: 3,
          margin: 6,
        });
      } catch (err) {
        console.error("Barcode render error:", err);
      }
    } else if (format === "qrcode" && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        sku.barcode,
        {
          width: 140,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("QR render error:", err);
        }
      );
    }
  }, [isOpen, sku, format]);

  if (!isOpen || !sku) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">Cetak Label Barcode</h3>
            <p className="text-xs text-slate-500">Kompatibel Printer Thermal 58mm/80mm</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle Barcode Format */}
        <div className="mt-4 flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFormat("code128")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all ${
              format === "code128" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Code 128 (Stiker Garis)</span>
          </button>
          <button
            onClick={() => setFormat("qrcode")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1 transition-all ${
              format === "qrcode" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <QrIcon className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>
        </div>

        {/* Preview Label Stiker Thermal (Ditandai ID untuk print) */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
          <div
            id="thermal-print-area"
            className="w-[200px] bg-white border border-slate-300 p-3 rounded-lg shadow-sm text-center flex flex-col items-center"
          >
            {/* Header Toko / Label */}
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 border-b border-black pb-1 w-full">
              MM SMART STOCK • GUDANG
            </div>

            {/* Nama Barang & SKU */}
            <div className="mt-1.5 font-bold text-xs text-slate-900 leading-tight w-full line-clamp-2">
              {sku.nama_barang}
            </div>

            <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-700 mt-1">
              <span>SKU: {sku.kode_sku}</span>
              <span className="font-bold">📍 {sku.lokasi_rak}</span>
            </div>

            {/* Render Grafis Barcode */}
            <div className="my-2 flex justify-center w-full">
              {format === "code128" ? (
                <svg ref={barcodeSvgRef} className="max-w-full" />
              ) : (
                <canvas ref={qrCanvasRef} className="max-w-full" />
              )}
            </div>

            <div className="text-[9px] text-slate-500 w-full pt-1 border-t border-slate-200 flex justify-between">
              <span>Satuan: {sku.satuan}</span>
              <span>Min. ROP: {sku.batas_stok_minimum}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handlePrint}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Label ke Printer Thermal</span>
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-500 font-medium hover:text-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
