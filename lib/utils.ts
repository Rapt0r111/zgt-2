import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — Tailwind class merger
 * Combines clsx (conditional classes) with tailwind-merge (deduplication)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * formatDate — Locale-aware date formatting for Russian locale
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

/**
 * formatDateTime — Date + time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * validateIMEI — Luhn algorithm for 15-digit IMEI
 * Also accepts 13–18 digit range (extended IMEI)
 */
export function validateIMEI(imei: string): boolean {
  const digits = imei.replace(/\D/g, "");

  if (digits.length < 13 || digits.length > 18) return false;

  // Luhn check only for standard 15-digit IMEI
  if (digits.length === 15) {
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = parseInt(digits[i], 10);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }

  return true; // Accept non-standard lengths without Luhn
}

/**
 * paginate — Server-side pagination helper
 */
export function getPaginationOffset(page: number, pageSize: number): number {
  return Math.max(0, (page - 1) * pageSize);
}

export function getTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
