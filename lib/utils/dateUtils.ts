/**
 * Standardized date and time utilities for Neuroclash.gg
 * Aligned with Asia/Jakarta (WIB) timezone.
 */

export const TIMEZONE = "Asia/Jakarta";

/**
 * Formats a date string or object to WIB time string (HH:mm)
 */
export function formatToWIBTime(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: TIMEZONE,
    });
}

/**
 * Formats a date string or object to WIB date string (DD/MM/YYYY)
 */
export function formatToWIBDate(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: TIMEZONE,
    });
}

/**
 * Correctly parses a date string from DB into a UTC-aware object,
 * then converts to local system time (which is then used for relative diffs).
 */
export function parseDBDate(dateStr: string | null | undefined): number {
    if (!dateStr) return Date.now();

    // Force ISO format
    const iso = dateStr.replace(" ", "T");

    // If no timezone offset is provided, assume WIB (+07:00)
    const suffixed =
        iso.includes("+") || iso.includes("Z") ? iso : `${iso}+07:00`;
    return new Date(suffixed).getTime();
}

/**
 * Calculates survival time string (MM:SS) from two timestamps
 */
export function calculateDuration(startMs: number, endMs: number): string {
    const diffMs = Math.max(0, endMs - startMs);
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
}

/**
 * Returns current timestamp in WIB (Asia/Jakarta) ISO format with offset
 */
export function getWIBNow(): string {
    const now = new Date();

    // Format: YYYY-MM-DD HH:mm:ss (WIB)
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const dateMap: { [key: string]: string } = {};
    parts.forEach((p) => (dateMap[p.type] = p.value));

    // Result: YYYY-MM-DD HH:mm:ss+07:00
    return `${dateMap.year}-${dateMap.month}-${dateMap.day} ${dateMap.hour}:${dateMap.minute}:${dateMap.second}+07:00`;
}
