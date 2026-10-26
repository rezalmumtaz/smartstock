import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTanggalWaktu(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTanggal(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(date);
}
