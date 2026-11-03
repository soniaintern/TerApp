/**
 * Company-wise claim period helpers (mirror of backend App\Support\ClaimPeriod).
 * claim_start_day: 1 = calendar month · 21 = 21st → 20th next month.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const claimStartDay = (user?: any): number => {
  const d = Number(user?.claim_start_day ?? 1);
  return d >= 2 ? d : 1;
};

export interface PeriodBounds {
  from: Date;
  to: Date;
  endMonth: number; // 1-12 (END month of the period)
  endYear: number;
}

/** Period containing `date`. */
export function periodOf(startDay: number, date: Date): PeriodBounds {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  if (startDay <= 1) {
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0), endMonth: m + 1, endYear: y };
  }
  if (date.getDate() >= startDay) {
    const from = new Date(y, m, startDay);
    const to = new Date(y, m + 1, startDay - 1);
    return { from, to, endMonth: to.getMonth() + 1, endYear: to.getFullYear() };
  }
  const from = new Date(y, m - 1, startDay);
  const to = new Date(y, m, startDay - 1);
  return { from, to, endMonth: m + 1, endYear: y };
}

/** The period right after the one containing `date` (for "next month" plans). */
export function nextPeriodOf(startDay: number, date: Date): PeriodBounds {
  const p = periodOf(startDay, date);
  const after = new Date(p.to.getFullYear(), p.to.getMonth(), p.to.getDate() + 1);
  return periodOf(startDay, after);
}

/** Period bounds rebuilt from its END month/year (for editing a saved plan). */
export function boundsFromEndMonth(startDay: number, endMonth: number, endYear: number): { from: Date; to: Date } {
  if (startDay <= 1) {
    return { from: new Date(endYear, endMonth - 1, 1), to: new Date(endYear, endMonth, 0) };
  }
  const to = new Date(endYear, endMonth - 1, startDay - 1);
  const from = new Date(endYear, endMonth - 2, startDay);
  return { from, to };
}

/** "21 Aug – 20 Sep 2026" for periods · "Aug 2026" for calendar months. */
export function periodLabel(startDay: number, endMonth: number, endYear: number): string {
  if (startDay <= 1) {
    return `${MONTHS[endMonth - 1]} ${endYear}`;
  }
  const to = new Date(endYear, endMonth - 1, startDay - 1);
  const from = new Date(endYear, endMonth - 2, startDay);
  return `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${endYear}`;
}

/** Compact chip label: "AUG–SEP" for periods · "AUG" for calendar. */
export function periodShort(startDay: number, endMonth: number, endYear: number): string {
  if (startDay <= 1) {
    return MONTHS[endMonth - 1].toUpperCase();
  }
  const prevMonth = endMonth === 1 ? 12 : endMonth - 1;
  const prevYear = endMonth === 1 ? endYear - 1 : endYear;
  return `${MONTHS[prevMonth - 1].toUpperCase()}–${MONTHS[endMonth - 1].toUpperCase()}`;
}

/**
 * The claim window: the period containing `now`, plus the three before it.
 * Returned as END month/year, because that is how a period is addressed
 * everywhere else in the app.
 *
 * Built from periods rather than calendar months on purpose — for a company whose
 * period straddles two months (e.g. claim_start_day 16, so 16 Sep – 15 Oct), the
 * in-progress period's end month is one ahead of the calendar month, and a
 * calendar-month window silently excludes it.
 */
export function claimWindow(startDay: number, now: Date = new Date()): { month: number; year: number }[] {
  const cur = periodOf(startDay, now);
  return [0, 1, 2, 3].map((back) => {
    const d = new Date(cur.endYear, cur.endMonth - 1 - back, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
}

/** Joining date ('17-Sep-2026' or ISO) → Date, or null when absent/unparseable. */
export function parseJoiningDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = String(value).trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(trimmed);
  if (dmy) {
    const mi = MONTHS.findIndex((m) => m.toLowerCase() === dmy[2].toLowerCase());
    if (mi >= 0) return new Date(Number(dmy[3]), mi, Number(dmy[1]));
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * True when a period ended before the employee joined, so it isn't theirs to
 * claim. Without this a new joiner can open the period before their first one,
 * where every monthly limit pro-rates to zero — leaving a near-empty category
 * list that looks like a bug.
 */
export function periodEndsBeforeJoining(
  startDay: number,
  endMonth: number,
  endYear: number,
  joined?: string | null,
): boolean {
  const doj = parseJoiningDate(joined);
  if (!doj) return false;
  const { to } = boundsFromEndMonth(startDay, endMonth, endYear);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
  return doj.getTime() > end.getTime();
}

/**
 * Raise a minimum selectable date to the employee's date of joining.
 *
 * Mirror image of capAtLastWorkingDay() at the other end of the range: a bill
 * can't be dated before the employee was on the rolls, so when a claim period
 * starts before they joined (16 Sep – 15 Oct for someone who joined on the 17th)
 * the picker should open on the joining date rather than the period start.
 */
export function floorAtJoiningDate(start: Date, joined?: string | null): Date {
  const doj = parseJoiningDate(joined);
  if (!doj) return start;
  const floor = new Date(doj.getFullYear(), doj.getMonth(), doj.getDate());
  return floor.getTime() > start.getTime() ? floor : start;
}

export const dateKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
