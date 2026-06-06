/** Parse Users sheet CanMarkAttendance (TRUE, true, Yes, 1, boolean). */
export function parseCanMarkAttendance(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "TRUE" || normalized === "YES" || normalized === "1";
}

export function mapUserRow(row) {
  return {
    userId: row[0],
    name: row[1],
    email: row[2],
    role: row[4],
    managerId: row[5] || null,
    leavePool: parseInt(row[6], 10) || 0,
    canMarkAttendance: parseCanMarkAttendance(row[7]),
  };
}
