/**
 * Increment/decrement Users sheet stat columns (G–J).
 * G LeavePool (static baseline), H LeaveApprovedDays, I LeavePendingDays, J SundayHolidayPresent.
 */
import { readSheet, updateCell, invalidateSheet } from "./sheets.js";

export const COL = {
  LEAVE_POOL: 6,
  LEAVE_APPROVED: 7,
  LEAVE_PENDING: 8,
  SUNDAY_HOLIDAY: 9,
  CAN_MARK: 10,
};

export function getUserRowNum(userId, usersRows) {
  for (let i = 0; i < usersRows.length; i++) {
    if (String(usersRows[i][0]).trim() === String(userId).trim()) {
      return i + 2;
    }
  }
  return null;
}

function parseStatCell(row, colIndex) {
  return parseInt(row[colIndex], 10) || 0;
}

export function readStatsFromRow(row) {
  const leavePool = parseStatCell(row, COL.LEAVE_POOL);
  const leaveApprovedDays = parseStatCell(row, COL.LEAVE_APPROVED);
  const leavePendingDays = parseStatCell(row, COL.LEAVE_PENDING);
  const sundayHolidayPresent = parseStatCell(row, COL.SUNDAY_HOLIDAY);
  return {
    leavePool,
    baseLeavePool: leavePool,
    leaveApprovedDays,
    leavePendingDays,
    sundayHolidayPresent,
    effectiveLeavePool: leavePool + sundayHolidayPresent,
    remaining: Math.max(0, leavePool + sundayHolidayPresent - leaveApprovedDays),
  };
}

/** Alias for admin stats / legacy callers. */
export function parseUserStatCells(row) {
  const stats = readStatsFromRow(row);
  return {
    baseLeavePool: stats.leavePool,
    leaveApprovedDays: stats.leaveApprovedDays,
    leavePendingDays: stats.leavePendingDays,
    sundayHolidayPresent: stats.sundayHolidayPresent,
  };
}

export function computeEffectiveLeavePool(baseLeavePool, sundayHolidayPresent) {
  return (parseInt(baseLeavePool, 10) || 0) + (parseInt(sundayHolidayPresent, 10) || 0);
}

export function computeRemainingLeave(baseLeavePool, sundayHolidayPresent, leaveApprovedDays) {
  return Math.max(
    0,
    computeEffectiveLeavePool(baseLeavePool, sundayHolidayPresent) - (parseInt(leaveApprovedDays, 10) || 0)
  );
}

/** Apply deltas in memory (for tests). */
export function applyStatDeltas(current, { approvedDelta = 0, pendingDelta = 0, sundayDelta = 0, poolSet = null } = {}) {
  const leavePool = poolSet !== null ? poolSet : current.leavePool;
  const leaveApprovedDays = Math.max(0, current.leaveApprovedDays + approvedDelta);
  const leavePendingDays = Math.max(0, current.leavePendingDays + pendingDelta);
  const sundayHolidayPresent = Math.max(0, current.sundayHolidayPresent + sundayDelta);
  return {
    leavePool,
    leaveApprovedDays,
    leavePendingDays,
    sundayHolidayPresent,
    effectiveLeavePool: leavePool + sundayHolidayPresent,
    remaining: Math.max(0, leavePool + sundayHolidayPresent - leaveApprovedDays),
  };
}

export async function readUserStatCells(userId, usersRows = null) {
  const rows = usersRows ?? (await readSheet("Users"));
  const row = rows.find((r) => r[0] === userId);
  if (!row) return null;
  return readStatsFromRow(row);
}

export async function adjustUserStats(
  userId,
  { approvedDelta = 0, pendingDelta = 0, sundayDelta = 0, poolSet = null } = {}
) {
  const rows = await readSheet("Users");
  const rowNum = getUserRowNum(userId, rows);
  if (rowNum === null) throw new Error("User not found");

  const current = readStatsFromRow(rows[rowNum - 2]);
  const next = applyStatDeltas(current, { approvedDelta, pendingDelta, sundayDelta, poolSet });

  const writes = [];
  if (poolSet !== null && next.leavePool !== current.leavePool) {
    writes.push(updateCell("Users", `G${rowNum}`, [[String(next.leavePool)]]));
  }
  if (approvedDelta !== 0) {
    writes.push(updateCell("Users", `H${rowNum}`, [[String(next.leaveApprovedDays)]]));
  }
  if (pendingDelta !== 0) {
    writes.push(updateCell("Users", `I${rowNum}`, [[String(next.leavePendingDays)]]));
  }
  if (sundayDelta !== 0) {
    writes.push(updateCell("Users", `J${rowNum}`, [[String(next.sundayHolidayPresent)]]));
  }

  if (writes.length > 0) {
    await Promise.all(writes);
    invalidateSheet("Users");
  }

  return {
    ...next,
    baseLeavePool: next.leavePool,
  };
}

/** Apr–Mar cycle reset: G=pool, H/I/J=0 for all non-admin users. */
export async function resetCycleForAllUsers({ pool = 22 } = {}) {
  const rows = await readSheet("Users");
  const userIds = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row[4] === "Admin") continue;
    const rowNum = i + 2;
    await updateCell("Users", `G${rowNum}`, [[String(pool)]]);
    await updateCell("Users", `H${rowNum}`, [["0"]]);
    await updateCell("Users", `I${rowNum}`, [["0"]]);
    await updateCell("Users", `J${rowNum}`, [["0"]]);
    userIds.push(row[0]);
  }

  invalidateSheet("Users");
  return { resetCount: userIds.length, userIds, pool };
}
