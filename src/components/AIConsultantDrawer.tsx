"use client";

import React, { useState, useRef, useEffect } from "react";
import { SKUWithCurrentStock } from "@/types/stock";
import { X, Sparkles, Send, Bot, User, ShieldCheck, Loader2 } from "lucide-react";

interface AIConsultantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryContext: SKUWithCurrentStock[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Barang apa yang kritis dan harus segera direstock?",
  "Berapa total estimasi nilai modal stok yang tersimpan di gudang?",
  "Rak mana yang aktivitas perputarannya paling tinggi?",
  "Bagaimana rekomendasi pembelanjaan barang minggu depan?",
];

export const AIConsultantDrawer: React.FC<AIConsultantDrawerProps> = ({
  isOpen,
  onClose,
  inventoryContext,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Halo! Saya Asisten AI Konsultan MM Smart Stock. Saya membaca data buku kartu stok gudang Anda secara real-time. Ada yang bisa saya analisiskan untuk perputaran barang atau efisiensi modal Anda hari ini?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = async (questionToSend?: string) => {
    const q = questionToSend || inputQuestion;
    if (!q.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setIsLoading(true);

    try {
      const simplifiedInventory = inventoryContext.map((item) => ({
        sku: item.kode_sku,
        nama: item.nama_barang,
        rak: item.lokasi_rak,
        stok: item.sisa_stok,
        min_rop: item.batas_stok_minimum,
        status: item.status_stok,
        hpp: item.harga_beli,
        nilai_aset: item.total_nilai_aset,
      }));

      const res = await fetch("/api/ai/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuestion: q,
          inventoryContext: simplifiedInventory,
        }),
      });

      const data = await res.json();
      const aiReply =
        data.answer || "Maaf, terjadi kendala saat memproses konsultasi data inventaris Anda.";

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: "Gagal terhubung ke layanan AI. Pastikan jaringan internet stabil.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0">
      <div className="bg-white w-full max-w-md h-[92vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center shadow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">AI Konsultan Gudang</h3>
              <p className="text-[10px] text-indigo-300">Google Gemini 2.5 • RAG In-Context</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Safety Banner */}
        <div className="px-4 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center space-x-2 text-[10px] text-indigo-900 flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          <span>
            <strong>Strict Read-Only Sandbox:</strong> AI hanya menganalisis ringkasan data inventaris dan tidak memiliki akses mutasi database.
          </span>
        </div>

        {/* Chat Message Feed */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5">
          {messages.map((m) => {
            const isAi = m.sender === "ai";
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-2 ${
                  isAi ? "justify-start" : "justify-end"
                }`}
              >
                {isAi && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isAi
                      ? "bg-slate-100 text-slate-900 rounded-tl-sm whitespace-pre-line"
                      : "bg-blue-600 text-white rounded-tr-sm"
                  }`}
                >
                  <p>{m.text}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      isAi ? "text-slate-400" : "text-blue-200"
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {!isAi && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>AI sedang menganalisis data ledger gudang...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 overflow-x-auto no-scrollbar flex space-x-1.5 flex-shrink-0">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="flex-shrink-0 text-[11px] bg-white border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-full text-slate-700 font-medium active:scale-95 transition-all shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 flex-shrink-0">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tanyakan analisis stok ke AI..."
            className="flex-1 bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputQuestion.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
