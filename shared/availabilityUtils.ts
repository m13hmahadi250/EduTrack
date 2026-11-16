/**
 * EduTrack Bangladesh — Weekly Availability & Monthly Salary Utilities
 *
 * Provides deterministic Asia/Dhaka (GMT+6) date & weekday parsing,
 * non-destructive availability slot normalization (Sunday–Saturday),
 * and safe Monthly Tuition Salary (BDT) display formatting.
 */

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const SHORT_DAYS: Record<DayOfWeek, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
};

export const SHORT_DAYS_UPPER: Record<DayOfWeek, string> = {
  Sunday: 'SUN',
  Monday: 'MON',
  Tuesday: 'TUE',
  Wednesday: 'WED',
  Thursday: 'THU',
  Friday: 'FRI',
  Saturday: 'SAT',
};

export const DAY_INITIALS: Record<DayOfWeek, string> = {
  Sunday: 'S',
  Monday: 'M',
  Tuesday: 'T',
  Wednesday: 'W',
  Thursday: 'T',
  Friday: 'F',
  Saturday: 'S',
};

export const BANGLA_DAYS: Record<DayOfWeek, string> = {
  Sunday: 'রবি',
  Monday: 'সোম',
  Tuesday: 'মঙ্গল',
  Wednesday: 'বুধ',
  Thursday: 'বৃহঃ',
  Friday: 'শুক্র',
  Saturday: 'শনি',
};

export const AVAILABILITY_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
] as const;

export type AvailabilityHour = (typeof AVAILABILITY_HOURS)[number];

const DAY_ALIAS_MAP: Record<string, DayOfWeek> = {
  sunday: 'Sunday',
  sun: 'Sunday',
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
};

/**
 * Resolves any day key ("Sun", "sunday", "Sunday") to canonical DayOfWeek ("Sunday"–"Saturday")
 * or null if unrecognized.
 */
export function resolveCanonicalDay(dayKey: string): DayOfWeek | null {
  if (!dayKey || typeof dayKey !== 'string') return null;
  const cleaned = dayKey.trim().toLowerCase();
  return DAY_ALIAS_MAP[cleaned] || null;
}

/**
 * Normalizes a time slot string (e.g. "8:00" -> "08:00", "08:00" -> "08:00").
 * Preserves any non-empty custom time string if it doesn't match H:MM.
 */
export function normalizeHourString(slot: unknown): string | null {
  if (typeof slot !== 'string') return null;
  const trimmed = slot.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (match) {
    const h = Number(match[1]);
    const m = match[2];
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  return trimmed;
}

/**
 * Non-destructively normalizes stored availabilitySlots from Firestore or user state.
 * - Maps shorthand day names ("Sun" -> "Sunday") into canonical Sunday–Saturday keys.
 * - Deduplicates and chronologically sorts time slots per day.
 * - Preserves any additional custom keys safely.
 */
export function normalizeAvailabilitySlots(
  rawSlots: Record<string, string[]> | null | undefined
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (!rawSlots || typeof rawSlots !== 'object') {
    return result;
  }

  for (const [key, rawList] of Object.entries(rawSlots)) {
    if (!Array.isArray(rawList)) continue;
    const canonicalDay = resolveCanonicalDay(key) || key;
    const existing = result[canonicalDay] || [];
    const mergedSet = new Set<string>(existing);

    for (const item of rawList) {
      const normalized = normalizeHourString(item);
      if (normalized) {
        mergedSet.add(normalized);
      }
    }

    const sorted = Array.from(mergedSet).sort((a, b) => a.localeCompare(b));
    if (sorted.length > 0) {
      result[canonicalDay] = sorted;
    }
  }

  return result;
}

/**
 * Counts total weekly available slots across all 7 days.
 */
export function countTotalWeeklySlots(
  slots: Record<string, string[]> | null | undefined
): number {
  const normalized = normalizeAvailabilitySlots(slots);
  return DAYS_OF_WEEK.reduce((acc, day) => acc + (normalized[day]?.length || 0), 0);
}

/**
 * Counts how many days of the week have at least one available time slot.
 */
export function countActiveDays(
  slots: Record<string, string[]> | null | undefined
): number {
  const normalized = normalizeAvailabilitySlots(slots);
  return DAYS_OF_WEEK.filter((day) => (normalized[day]?.length || 0) > 0).length;
}

/**
 * Formats a 24-hour slot string ("08:00", "17:00") for clean UI display.
 * - compact = true -> "8 AM", "5 PM"
 * - compact = false -> "8:00 AM", "5:00 PM"
 */
export function formatHourLabel(hour24: string, compact = false): string {
  if (!hour24 || typeof hour24 !== 'string') return '';
  const match = /^(\d{1,2}):(\d{2})$/.exec(hour24.trim());
  if (!match) return hour24;
  const h = Number(match[1]);
  const m = match[2];
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact && m === '00') {
    return `${h12} ${period}`;
  }
  return `${h12}:${m} ${period}`;
}

/**
 * Returns a YYYY-MM-DD date string in Bangladesh Standard Time (Asia/Dhaka, GMT+6),
 * optionally offset by `offsetDays` from `baseDate`.
 */
export function getDhakaDateString(baseDate: Date = new Date(), offsetDays = 0): string {
  // Format baseDate in Asia/Dhaka to get exact Dhaka calendar date components
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(baseDate);
  const year = Number(parts.find((p) => p.type === 'year')?.value || baseDate.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === 'month')?.value || baseDate.getUTCMonth() + 1);
  const day = Number(parts.find((p) => p.type === 'day')?.value || baseDate.getUTCDate());

  const utcNoon = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministically returns the canonical weekday name ("Sunday"–"Saturday")
 * for either a "YYYY-MM-DD" date string or an ISO timestamp in Asia/Dhaka timezone,
 * avoiding the UTC-midnight shift bug of `new Date("YYYY-MM-DD")`.
 */
export function getWeekdayFromDateString(dateStr: string): DayOfWeek {
  if (!dateStr || typeof dateStr !== 'string') {
    return 'Sunday';
  }
  const trimmed = dateStr.trim();
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    // Use UTC noon so day-of-week is invariant across all host machine timezones
    const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return DAYS_OF_WEEK[utcNoon.getUTCDay()];
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'Sunday';
  }

  const dhakaWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
  }).format(parsed);

  return resolveCanonicalDay(dhakaWeekday) || DAYS_OF_WEEK[parsed.getUTCDay()];
}

/**
 * Formats a YYYY-MM-DD string safely for display (e.g., "Sun, Nov 16") without UTC-midnight shift.
 */
export function formatDateStringDisplay(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(utcNoon);
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Dhaka' }).format(parsed);
}

/**
 * Formats a monthly tuition salary or budget in Bangladeshi Taka (BDT ৳) safely.
 * Does NOT blindly multiply or alter historical values.
 */
export function formatMonthlySalary(
  amount: unknown,
  options?: { fallback?: string; includeSuffix?: boolean }
): string {
  const fallback = options?.fallback ?? 'Negotiable';
  const includeSuffix = options?.includeSuffix ?? true;
  const num = typeof amount === 'number' ? amount : Number(amount);

  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }

  const formatted = `৳${Math.round(num).toLocaleString('en-IN')}`;
  return includeSuffix ? `${formatted}/month` : formatted;
}
