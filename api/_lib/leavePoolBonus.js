/**
 * Leave pool bonus when marking present on Sunday or company holiday.
 * At most +1 per attendance mark — never both when the date is Sunday and a holiday.
 */
import { isSunday } from "./sheets.js";

export function isHolidayDate(date, holidayRows) {
  return (holidayRows || []).some((r) => String(r[0] || "").trim() === date);
}

/** True when marking present on this date earns +1 leave pool (Sunday or company holiday). */
export function isSundayOrHolidayPresentDay(date, holidayRows) {
  return isSunday(date) || isHolidayDate(date, holidayRows);
}

/** Label for Sunday/holiday present rows — holiday wins when both apply. */
export function getSundayHolidayPresentLabel(date, holidayRows) {
  const holidayRow = (holidayRows || []).find((r) => String(r[0] || "").trim() === date);
  if (holidayRow) {
    return {
      type: "holiday",
      label: holidayRow[1] || holidayRow.HolidayName || "Company Holiday",
    };
  }
  if (isSunday(date)) {
    return { type: "sunday", label: "Sunday" };
  }
  return null;
}

/**
 * @returns {{ bonus: 0 | 1, reason: null | "sunday" | "holiday" }}
 */
export function getLeavePoolBonus(date, holidayRows) {
  if (isHolidayDate(date, holidayRows)) {
    return { bonus: 1, reason: "holiday" };
  }
  if (isSunday(date)) {
    return { bonus: 1, reason: "sunday" };
  }
  return { bonus: 0, reason: null };
}
