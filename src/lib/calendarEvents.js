export const CALENDAR_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const CALENDAR_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

export function getFirstDayOfMonth(y, m) {
  return new Date(y, m, 1).getDay();
}

export function buildMonthCells(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, otherMonth: true, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, otherMonth: false, date: dateStr });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, otherMonth: true, date: null });
    }
  }
  return cells;
}

export function expandLeaveDates(leaves) {
  const map = {};
  leaves.forEach((l) => {
    const from = l.fromDate || l.FromDate;
    const to = l.toDate || l.ToDate;
    const status = l.status || l.Status;
    if (!from) return;
    const end = to || from;
    const cur = new Date(`${from}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    while (cur <= endDate) {
      const key = cur.toISOString().slice(0, 10);
      map[key] = status;
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

export function buildHolidayMap(holidays) {
  const map = {};
  (holidays || []).forEach((h) => {
    const date = h.date || h.Date || h[0];
    if (date) map[date] = h.holidayName || h.HolidayName || h[1] || "Holiday";
  });
  return map;
}

export function isSundayDate(dateStr) {
  if (!dateStr) return false;
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
}

/** True when a present mark on this date counts as Sun/holiday present (holiday wins over Sunday). */
export function isSundayOrHolidayPresent(dateStr, holidayMap) {
  if (!dateStr) return false;
  if (holidayMap && holidayMap[dateStr]) return true;
  return isSundayDate(dateStr);
}

export function getSundayHolidayPresentLabel(dateStr, holidayMap) {
  if (holidayMap && holidayMap[dateStr]) {
    return { type: "holiday", label: holidayMap[dateStr] };
  }
  if (isSundayDate(dateStr)) {
    return { type: "sunday", label: "Sunday" };
  }
  return null;
}

export function getMonthRange(year, month) {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** Last N months through current month (newest first). */
export function buildMonthOptions(count = 24) {
  const options = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    options.push({
      value: `${year}-${month}`,
      label: `${CALENDAR_MONTHS[month].trim()} ${year}`,
      year,
      month,
    });
  }
  return options;
}

/** April 1 of the active Apr–Mar attendance year (same rule as api/_lib/attendanceStats). */
export function getAttendanceCycleStartYear(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0 = Jan … 3 = Apr
  return month >= 3 ? year : year - 1;
}

/** Months from April of the active Apr–Mar cycle through March of the next year (chronological). */
export function buildAprMarCycleMonthOptions(referenceDate = new Date()) {
  const cycleYear = getAttendanceCycleStartYear(referenceDate);
  const options = [];
  let y = cycleYear;
  let m = 3; // April

  for (let i = 0; i < 12; i++) {
    options.push({
      value: `${y}-${m}`,
      label: `${CALENDAR_MONTHS[m].trim()} ${y}`,
      year: y,
      month: m,
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return options;
}
