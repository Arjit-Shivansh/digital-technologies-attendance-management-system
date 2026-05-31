/** Shared leave day counting helpers (frontend + API). */

export const MAX_LEAVE_DAYS = 5;

export function countDaysBetween(fromDate, toDate) {
  if (!fromDate) return 0;
  const end = toDate || fromDate;
  let days = 0;
  const cur = new Date(`${fromDate}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  while (cur <= endDate) {
    days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function addDays(dateStr, amount) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function validateLeaveDateRange(fromDate, toDate, maxDays = MAX_LEAVE_DAYS) {
  if (!fromDate || !toDate) return "From and to dates are required";
  if (toDate < fromDate) return "To date cannot be before from date";
  const days = countDaysBetween(fromDate, toDate);
  if (days > maxDays) {
    return `Leave requests are limited to ${maxDays} days (selected: ${days})`;
  }
  return null;
}
