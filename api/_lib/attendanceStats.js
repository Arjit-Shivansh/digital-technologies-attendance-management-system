/**
 * Admin attendance rate helpers.
 * Attendance cycle: April 1 → March 31 (YTD through today within the active cycle).
 * Rate = weekday present days ÷ working days in range.
 */
import { isHolidayDate } from "./leavePoolBonus.js";

/** April 1 of the active Apr–Mar attendance year for a given date. */
export function getAttendanceCycleStart(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0 = Jan … 3 = Apr
  const cycleYear = month >= 3 ? year : year - 1;
  return `${cycleYear}-04-01`;
}

/** Default to Apr 1 of the active cycle through today when filters are empty. */
export function resolveDateRange(from, to) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cycleStart = getAttendanceCycleStart(now);

  if (from && to) return { from, to, isDefault: false, cycleLabel: null };
  if (from && !to) return { from, to: today, isDefault: false, cycleLabel: null };
  if (!from && to) return { from: cycleStart, to, isDefault: false, cycleLabel: null };
  return {
    from: cycleStart,
    to: today,
    isDefault: true,
    cycleLabel: "Apr–Mar cycle (YTD)",
  };
}

export function isWorkingDay(dateStr, holidayRows) {
  if (!dateStr) return false;
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  if (day === 0 || day === 6) return false;
  return !isHolidayDate(dateStr, holidayRows);
}

export function countWorkingDaysInRange(from, to, holidayRows) {
  if (!from || !to || to < from) return 0;

  let count = 0;
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    if (isWorkingDay(dateStr, holidayRows)) count += 1;
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}

export function countPresentOnWorkingDays(attendanceRows, userId, from, to, holidayRows) {
  return attendanceRows.filter((a) => {
    const d = a[2] || "";
    if (a[1] !== userId) return false;
    if (d < from || d > to) return false;
    if ((a[3] || "Present").toLowerCase() !== "present") return false;
    return isWorkingDay(d, holidayRows);
  }).length;
}

/**
 * @returns {{ rate: number, workingDays: number, presentDays: number }}
 */
export function computeAttendanceRate({ presentDays, workingDays }) {
  if (workingDays <= 0) {
    return { rate: 0, workingDays: 0, presentDays };
  }

  const rate = Math.min(100, Math.round((presentDays / workingDays) * 100));
  return { rate, workingDays, presentDays };
}
