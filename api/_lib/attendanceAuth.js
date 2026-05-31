/**
 * Checks whether markedByUserId may mark attendance for targetUserId.
 */
import { readSheet } from "./sheets.js";

function mapUsers(rows) {
  return rows.map((r) => ({
    userId: r[0],
    role: r[4],
    managerId: r[5] || null,
    canMarkAttendance: String(r[7]).toUpperCase() === "TRUE",
  }));
}

export async function canMarkAttendanceFor(markedByUserId, targetUserId) {
  if (!markedByUserId || !targetUserId) return false;

  const rows = await readSheet("Users");
  const users = mapUsers(rows);
  const marker = users.find((u) => u.userId === markedByUserId);
  const target = users.find((u) => u.userId === targetUserId);

  if (!marker || !target) return false;

  if (marker.role === "Admin") {
    return target.role !== "Admin";
  }

  const isSenior = marker.role?.includes("Senior");
  if (!isSenior) return false;

  if (target.userId === marker.userId) {
    return marker.canMarkAttendance;
  }

  return target.managerId === marker.userId;
}

export function isValidDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}
