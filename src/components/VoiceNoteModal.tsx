"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  CheckCircle,
  PackagePlus,
  PackageMinus,
  DollarSign,
  Package,
} from "lucide-react";
import { VoiceParseResult, SKUWithCurrentStock } from "@/types/stock";
import { formatRupiah } from "@/lib/utils";

interface VoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResult: (result: VoiceParseResult) => void;
  knownSkus: SKUWithCurrentStock[];
}

export const VoiceNoteModal: React.FC<VoiceNoteModalProps> = ({
  isOpen,
  onClose,
  onApplyResult,
  knownSkus,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedData, setParsedData] = useState<VoiceParseResult | null>(null);
  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  const startListening = () => {
    setParsedData(null);
    setTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "id-ID"; // Bahasa Indonesia
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognition.onend = async () => {
          setIsRecording(false);
          if (transcript) {
            await processWithAI(transcript);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("Speech API failed, using prompt:", err);
      }
    }

    // Fallback prompt jika browser tidak mendukung Web Speech API
    const fallback = window.prompt(
      "Ketik perintah suara Anda (contoh: 'Barang masuk 20 box Kopi Robusta dari PT Sumber Pangan'):"
    );
    if (fallback) {
      setTranscript(fallback);
      processWithAI(fallback);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const processWithAI = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          catalogSummary: knownSkus.map((s) => ({
            id: s.id,
            sku: s.kode_sku,
            nama: s.nama_barang,
            harga_beli: s.harga_beli,
            harga_jual: s.harga_jual,
          })),
        }),
      });

      const resData = await res.json();
      if (resData.success && resData.data) {
        setParsedData(resData.data);
      } else {
        // Fallback parsing lokal cerdas
        const isKeluar = /keluar|jual|kirim/i.test(text);
        const isTambah = /tambah produk|barang baru/i.test(text);
        const isBiaya = /biaya|bayar|listrik|bensin/i.test(text);
        const numMatch = text.match(/\d+/);
        const qty = numMatch ? parseInt(numMatch[0], 10) : 10;

        setParsedData({
          action: isBiaya
            ? "BIAYA"
            : isTambah
            ? "TAMBAH_BARANG"
            : isKeluar
            ? "BARANG_KELUAR"
            : "BARANG_MASUK",
          nama_barang: text,
          jumlah: qty,
          keterangan: text,
          confidence_score: 0.85,
        });
      }
    } catch (err) {
      console.error("AI Parse Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onApplyResult(parsedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Badge */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Google Gemini Voice AI</span>
        </div>

        <h3 className="font-bold text-lg text-slate-900">Input Mutasi dengan Suara</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Tekan tombol mikrofon lalu bicarakan mutasi barang masuk, keluar, atau tambah produk baru.
        </p>

        {/* Big Mic Button with Pulsing Wave */}
        <div className="relative my-6 flex items-center justify-center">
          {isRecording && (
            <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
          )}

          <button
            type="button"
            onClick={isRecording ? stopListening : startListening}
            disabled={isLoading}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${
              isRecording
                ? "bg-rose-600 ring-4 ring-rose-400/40 animate-pulse"
                : isLoading
                ? "bg-indigo-600 cursor-wait"
                : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-9 h-9 animate-spin text-white" />
            ) : isRecording ? (
              <MicOff className="w-9 h-9 text-white" />
            ) : (
              <Mic className="w-9 h-9 text-white" />
            )}
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-700 mb-2">
          {isLoading
            ? "Memproses suara dengan AI..."
            : isRecording
            ? "Mendengarkan... Tekan lagi untuk selesai"
            : "Tekan untuk mulai berbicara"}
        </div>

        {/* Transcript Box */}
        {transcript && (
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 text-left mb-3">
            <span className="font-bold text-slate-400 block text-[10px] mb-1">TRANSKRIP:</span>
            &ldquo;{transcript}&rdquo;
          </div>
        )}

        {/* AI Extracted Result Card */}
        {parsedData && (
          <div className="w-full bg-teal-50/70 border border-teal-200 rounded-2xl p-3.5 text-left text-xs space-y-2 mb-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-900 flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Hasil Ekstraksi AI:</span>
              </span>
              <span className="text-[10px] bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                {parsedData.action}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
              {parsedData.nama_barang && (
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">Barang / Keterangan</span>
                  <span className="font-bold text-slate-900">{parsedData.nama_barang}</span>
                </div>
              )}
              {parsedData.jumlah && (
                <div>
                  <span className="text-[10px] text-slate-400 block">Jumlah</span>
                  <span className="font-bold text-slate-900">{parsedData.jumlah} {parsedData.satuan || "Unit"}</span>
                </div>
              )}
              {parsedData.nama_kontak && (
                <div>
                  <span className="text-[10px] text-slate-400 block">Kontak / Pihak</span>
                  <span className="font-bold text-slate-900">{parsedData.nama_kontak}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full mt-2 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-md active:scale-95 transition-all text-center"
            >
              Terapkan ke Transaksi
            </button>
          </div>
        )}

        {/* Sample Voice Hints */}
        <div className="w-full pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-left">
          <span className="font-semibold text-slate-500 block mb-1">Contoh ucapan yang dipahami:</span>
          <ul className="list-disc list-inside space-y-0.5">
            <li>&quot;Barang masuk 20 pack Kopi Robusta dari PT Sumber Pangan&quot;</li>
            <li>&quot;Kirim barang keluar 5 box Susu UHT ke Toko Berkah&quot;</li>
            <li>&quot;Tambah produk baru Sabun Cuci 50 pcs harga beli 5 ribu&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
