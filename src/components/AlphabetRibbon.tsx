"use client";

import React, { useRef, useEffect } from "react";

interface AlphabetRibbonProps {
  selectedLetter: string;
  onSelectLetter: (letter: string) => void;
  availableLetters: string[];
  criticalLetters: string[];
}

const ALPHABET = [
  "SEMUA",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];

export const AlphabetRibbon: React.FC<AlphabetRibbonProps> = ({
  selectedLetter,
  onSelectLetter,
  availableLetters,
  criticalLetters,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll tab aktif ke posisi terlihat
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeElement = scrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedLetter]);

  return (
    <div className="sticky top-[56px] z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-2">
      <div
        ref={scrollRef}
        className="max-w-md mx-auto px-3 flex items-center space-x-1.5 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {ALPHABET.map((char) => {
          const isActive = selectedLetter === char;
          const isAvailable = char === "SEMUA" || availableLetters.includes(char);
          const hasCritical = criticalLetters.includes(char);

          return (
            <button
              key={char}
              data-active={isActive}
              onClick={() => onSelectLetter(char)}
              disabled={!isAvailable && char !== "SEMUA"}
              className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm scale-105"
                  : isAvailable
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95"
                  : "bg-slate-50 text-slate-300 cursor-not-allowed"
              }`}
            >
              <span>{char}</span>

              {/* Dot merah jika ada item kritis di huruf ini */}
              {hasCritical && !isActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
