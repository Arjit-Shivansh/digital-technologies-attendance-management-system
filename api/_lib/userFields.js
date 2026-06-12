/** Parse Users sheet CanMarkAttendance (TRUE, true, Yes, 1, boolean). */
export function parseCanMarkAttendance(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "YES" || normalized === "1";
}

export function mapUserRow(row) {
  const baseLeavePool = parseInt(row[6], 10) || 0;
  const leaveApprovedDays = parseInt(row[7], 10) || 0;
  const leavePendingDays = parseInt(row[8], 10) || 0;
  const sundayHolidayPresent = parseInt(row[9], 10) || 0;
  return {
    userId: row[0],
    name: row[1],
    email: row[2],
    role: row[4],
    managerId: row[5] || null,
    leavePool: baseLeavePool + sundayHolidayPresent,
    baseLeavePool,
    leaveApprovedDays,
    leavePendingDays,
    sundayHolidayPresent,
    canMarkAttendance: parseCanMarkAttendance(row[10]),
  };
}
