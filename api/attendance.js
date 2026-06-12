/**
 * GET  /api/attendance  → returns attendance records (optional filters)
 * POST /api/attendance  → marks attendance for a user
 *
 * Query params (GET):
 *   date=YYYY-MM-DD       today-only slice
 *   userId=U001           filter by employee
 *   from / to             date range (inclusive)
 *   fresh=1               bypass sheet cache
 */
import { readSheet, readSheetsBatch, appendRow } from "./_lib/sheets.js";
import { canMarkAttendanceFor, isValidDateString } from "./_lib/attendanceAuth.js";
import { getLeavePoolBonus } from "./_lib/leavePoolBonus.js";
import {
  adjustUserStats,
  computeEffectiveLeavePool,
  computeRemainingLeave,
} from "./_lib/userSheetStats.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

function mapAttendanceRows(rows) {
  return rows.map((r) => ({
    attendanceId: r[0],
    userId: r[1],
    date: r[2],
    status: r[3],
    markedBy: r[4],
    reason: r[5] || "",
  }));
}

function filterAttendance(attendance, query) {
  const { date, userId, from, to } = query;
  return attendance.filter((a) => {
    if (userId && a.userId !== userId) return false;
    if (date && a.date !== date) return false;
    if (from && a.date < from) return false;
    if (to && a.date > to) return false;
    return true;
  });
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await readSheet("Attendance", { fresh: isFresh(req.query) });
      const attendance = mapAttendanceRows(rows);
      return res.status(200).json(filterAttendance(attendance, req.query));
    }

    if (req.method === "POST") {
      const { targetUserId, date, status, reason } = req.body || {};
      const markedBy = req.body.markedBy || targetUserId;

      if (!targetUserId || !date) {
        return res.status(400).json({ error: "targetUserId and date are required" });
      }
      if (!isValidDateString(date)) {
        return res.status(400).json({ error: "date must be YYYY-MM-DD" });
      }
      if (!markedBy) {
        return res.status(400).json({ error: "markedBy is required" });
      }

      const allowed = await canMarkAttendanceFor(markedBy, targetUserId);
      if (!allowed) {
        return res.status(403).json({ error: "Not allowed to mark attendance for this user" });
      }

      const markerRows = await readSheet("Users");
      const markerRow = markerRows.find((r) => r[0] === markedBy);
      const isAdmin = markerRow && markerRow[4] === "Admin";
      const today = new Date().toISOString().slice(0, 10);
      if (!isAdmin && date !== today) {
        return res.status(403).json({ error: "Only admins can mark attendance for dates other than today" });
      }

      const { Attendance: existingRows, Holidays: holidayRows } = await readSheetsBatch([
        "Attendance",
        "Holidays",
      ]);
      const alreadyMarked = existingRows.some(
        (r) => r[1] === targetUserId && r[2] === date
      );
      if (alreadyMarked) {
        return res.status(409).json({ error: "Attendance already marked for this date" });
      }

      const attendanceId = `A${Date.now()}`;
      const resolvedStatus = status || "Present";
      const resolvedReason = reason || "";
      await appendRow("Attendance", [
        attendanceId,
        targetUserId,
        date,
        resolvedStatus,
        markedBy,
        resolvedReason,
      ]);

      let leavePoolBonus = 0;
      let leavePoolBonusReason = null;
      let sundayHolidayPresent = null;
      let leavePool = null;
      let leaveRemaining = null;

      const { bonus, reason: poolBonusReason } = getLeavePoolBonus(date, holidayRows);
      if (bonus > 0 && resolvedStatus === "Present") {
        leavePoolBonus = bonus;
        leavePoolBonusReason = poolBonusReason;
        const stats = await adjustUserStats(targetUserId, { sundayDelta: bonus });
        sundayHolidayPresent = stats.sundayHolidayPresent;
        leavePool = computeEffectiveLeavePool(stats.baseLeavePool, stats.sundayHolidayPresent);
        leaveRemaining = computeRemainingLeave(
          stats.baseLeavePool,
          stats.sundayHolidayPresent,
          stats.leaveApprovedDays
        );
      }

      return res.status(201).json({
        attendanceId,
        userId: targetUserId,
        date,
        status: resolvedStatus,
        markedBy,
        reason: resolvedReason,
        leavePoolBonus,
        leavePoolBonusReason,
        ...(sundayHolidayPresent !== null ? { sundayHolidayPresent } : {}),
        ...(leavePool !== null ? { leavePool } : {}),
        ...(leaveRemaining !== null ? { leaveRemaining } : {}),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Attendance error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
