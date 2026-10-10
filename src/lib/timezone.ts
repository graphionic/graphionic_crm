/**
 * Shared Timezone Utilities for ClientForge CRM
 * Roadmap #3: Timezone & Regional Settings Foundation
 * Uses native ECMAScript Intl APIs with zero external dependencies.
 */

export const DEFAULT_FALLBACK_TIMEZONE = "UTC";

/**
 * Validates whether a candidate string is a recognized, valid IANA timezone identifier.
 * Rejects ambiguous abbreviations (e.g. EST, PST) and raw offsets (e.g. UTC+5).
 */
export function isValidTimeZone(candidate: string | null | undefined): boolean {
  if (!candidate || typeof candidate !== "string") return false;
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return false;

  // Must be "UTC" or a standard Area/Location IANA identifier (e.g. Europe/London, Asia/Kolkata)
  if (trimmed !== "UTC" && !trimmed.includes("/")) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a date/timestamp with a specific IANA timezone using Intl.DateTimeFormat.
 * If timeZone is null/invalid, formats cleanly using standard fallback.
 */
export function formatInTimeZone(
  date: Date | string | number | null | undefined,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions & { fallback?: string }
): string {
  if (date == null) return options?.fallback ?? "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return options?.fallback ?? "—";

  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone.trim() : undefined;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const { fallback: _f, ...customOptions } = options ?? {};
  const mergedOptions: Intl.DateTimeFormatOptions = {
    ...defaultOptions,
    ...customOptions,
  };
  if (tz) {
    mergedOptions.timeZone = tz;
  }

  try {
    return new Intl.DateTimeFormat("en-GB", mergedOptions).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Formats date-only in the target timezone (e.g. "10 Oct 2026").
 */
export function formatDateInZone(
  date: Date | string | number | null | undefined,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatInTimeZone(date, timeZone, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: undefined,
    minute: undefined,
    ...options,
  });
}

/**
 * Formats time-only in the target timezone (e.g. "14:30").
 */
export function formatTimeInZone(
  date: Date | string | number | null | undefined,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatInTimeZone(date, timeZone, {
    day: undefined,
    month: undefined,
    year: undefined,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

/**
 * Returns human-readable current local date/time strings for a timezone.
 */
export function getCurrentTimeInZone(timeZone?: string | null): {
  dateStr: string;
  timeStr: string;
  fullStr: string;
  ianaZone: string;
} {
  const now = new Date();
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone.trim() : DEFAULT_FALLBACK_TIMEZONE;

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const fullStr = `${dateStr}, ${timeStr}`;

  return { dateStr, timeStr, fullStr, ianaZone: tz };
}

/**
 * Curated list of prominent IANA timezones for quick selection.
 */
export const POPULAR_TIMEZONES = [
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Dublin",
  "Pacific/Auckland",
  "UTC",
] as const;

/**
 * Gets all supported IANA timezones available in the runtime environment.
 */
export function getAllSupportedTimezones(): string[] {
  const set = new Set<string>();
  try {
    if (typeof Intl !== "undefined" && typeof (Intl as any).supportedValuesOf === "function") {
      const values: string[] = (Intl as any).supportedValuesOf("timeZone");
      for (const tz of values) {
        if (isValidTimeZone(tz)) {
          set.add(tz);
        }
      }
    }
  } catch {
    // Fallback if not supported
  }
  for (const tz of POPULAR_TIMEZONES) {
    if (isValidTimeZone(tz)) {
      set.add(tz);
    }
  }
  return Array.from(set).sort();
}
