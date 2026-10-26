"use client";

import React, { useState, useRef } from "react";
import { Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { VoiceParseResult } from "@/types/stock";

interface VoiceNoteButtonProps {
  onParsedResult: (result: VoiceParseResult) => void;
  knownSkus: Array<{ kode_sku: string; nama_barang: string }>;
}

export const VoiceNoteButton: React.FC<VoiceNoteButtonProps> = ({
  onParsedResult,
  knownSkus,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcriptPreview, setTranscriptPreview] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    // 1. Coba gunakan Web Speech API (sangat cepat di browser HP Android/Chrome/Safari)
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
          setTranscriptPreview("Mendengarkan suara Anda...");
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscriptPreview(text);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
          setTranscriptPreview("");
        };

        recognition.onend = async () => {
          setIsRecording(false);
          if (transcriptPreview && transcriptPreview !== "Mendengarkan suara Anda...") {
            await sendToAiParser(transcriptPreview);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err) {
        console.warn("Fallback to audio recorder:", err);
      }
    }

    // Fallback simulasi suara / text prompt jika speech API diblokir browser
    fallbackPrompt();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const fallbackPrompt = async () => {
    const text = window.prompt(
      "Ketik atau ucapkan perintah mutasi (misal: 'Baut Baja masuk 50 dari Toko Bintang'):"
    );
    if (text) {
      setTranscriptPreview(text);
      await sendToAiParser(text);
    }
  };

  const sendToAiParser = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          catalogSummary: knownSkus,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        // Human-in-the-loop: Teruskan ke form untuk diisi otomatis
        onParsedResult(data.data);
      }
    } catch (err) {
      console.error("Failed to parse voice note:", err);
    } finally {
      setIsLoading(false);
      setTranscriptPreview("");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isRecording ? stopListening : startListening}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${
          isRecording
            ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-400/30"
            : isLoading
            ? "bg-indigo-100 text-indigo-700 cursor-wait"
            : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}

        <span>
          {isLoading
            ? "Menganalisis AI..."
            : isRecording
            ? "Klik untuk Selesai"
            : "Voice Note AI"}
        </span>

        {!isLoading && !isRecording && <Sparkles className="w-3 h-3 text-amber-300" />}
      </button>

      {/* Floating Status Banner saat Merekam */}
      {isRecording && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs flex items-center space-x-2 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span className="truncate italic">{transcriptPreview || "Silakan bicara..."}</span>
        </div>
      )}
    </div>
  );
};
