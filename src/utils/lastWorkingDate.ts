/**
 * Last working date (LWD) helpers.
 *
 * The backend stores `sender_details.last_working_date` as **`d-M-Y`** with an
 * English three-letter month — e.g. `15-Jun-2026`. Every server-side consumer
 * parses it that way:
 *
 *   Carbon::createFromFormat('d-M-Y', $lastWorkingDate)   // API/BillItemController.php:37, :145, :651
 *   explode("-", $date)  ->  [day, Mon, year]             // TercourierController.php:824
 *
 * So it must NOT be handed to `new Date(string)`: that form is
 * implementation-dependent, and it silently mis-parses in some engines while
 * returning `Invalid Date` in others. The explicit month table below is the only
 * safe route — and it deliberately uses a lookup rather than a `switch`, because
 * the PHP original shipped a missing `break` after `case "Jun"` that made every
 * June date normalise to July (GlobalFunctions.php:139-143 and three copies in
 * TercourierController.php). No fall-through is possible here.
 *
 * Response shape: `last_working_date` is null for serving employees, so every
 * helper here accepts nullish input and returns null rather than throwing.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a backend `d-M-Y` last working date. Returns null for empty, null,
 * undefined, or any value that isn't a real calendar date (so a malformed row
 * degrades to "no restriction" instead of crashing the form).
 */
export function parseLastWorkingDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const parts = String(raw).trim().split('-');
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const year = Number(parts[2]);
  const month = MONTHS[parts[1].trim().slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  if (!Number.isInteger(day) || !Number.isInteger(year)) return null;
  if (day < 1 || day > 31) return null;

  const d = new Date(year, month, day);
  // Reject silent rollovers (e.g. 31-Feb becoming 3-Mar).
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

/**
 * Clamp a window's **end** so no date can fall after the exit date.
 *
 * The backend rejects only `to_date > LWD` (API/BillItemController.php:40), so
 * the last working date itself stays inclusive — a leaver may still claim an
 * expense incurred on their final day.
 *
 * Returns the end-of-day of the LWD, which matters because callers derive the
 * comparison string with `toISOString().slice(0, 10)`. A local midnight would
 * shift to the previous UTC day in IST and silently grant an extra day.
 */
export function capAtLastWorkingDay(end: Date, lwd: Date | null): Date {
  if (!lwd) return end;
  const lwdEnd = new Date(lwd);
  lwdEnd.setHours(23, 59, 59, 999);
  return lwdEnd.getTime() < end.getTime() ? lwdEnd : end;
}

/**
 * Local calendar key (`YYYY-MM-DD`) for the exit date, safe for plain string
 * comparison against the date fields (which are already `YYYY-MM-DD`).
 *
 * Needed because `date.toISOString().slice(0,10)` — used by the existing bounds
 * checks — shifts a local midnight back to the previous UTC day in IST.
 */
export function lwdDayKey(lwd: Date | null): string | null {
  if (!lwd) return null;
  const m = String(lwd.getMonth() + 1).padStart(2, '0');
  const d = String(lwd.getDate()).padStart(2, '0');
  return `${lwd.getFullYear()}-${m}-${d}`;
}

/** `15-Jun-2026` for messages. Returns '' when there is no exit date. */
export function formatLastWorkingDate(lwd: Date | null): string {
  if (!lwd) return '';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(lwd.getDate()).padStart(2, '0')}-${MON[lwd.getMonth()]}-${lwd.getFullYear()}`;
}
