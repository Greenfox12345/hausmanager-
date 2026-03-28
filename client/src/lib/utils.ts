import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a Date object to a yyyy-MM-dd string using LOCAL date components.
 * Use this instead of toISOString() when sending date-only values to the server
 * to avoid timezone-offset issues (e.g. 2026-03-29T00:00 UTC+1 → 2026-03-28 UTC).
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string from the server (ISO timestamp or yyyy-MM-dd) and
 * returns a Date whose LOCAL date components match the stored date.
 * Avoids the "one day off" bug caused by UTC midnight being interpreted
 * as the previous day in positive-offset timezones.
 */
export function parseLocalDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  // If it's a yyyy-MM-dd string (no time component), parse as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // For ISO timestamps from the DB (e.g. "2026-03-29T00:00:00.000Z"),
  // extract the date part and treat it as local midnight
  const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    const [, y, m, d] = isoDateMatch.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

/**
 * Formats a borrow date (from server) for display, avoiding timezone offset.
 * Returns dd.MM.yyyy format.
 */
export function formatBorrowDate(date: string | Date | null | undefined, locale?: string): string {
  if (!date) return '—';
  const d = parseLocalDate(date);
  if (!d) return '—';
  return d.toLocaleDateString(locale ?? 'de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
