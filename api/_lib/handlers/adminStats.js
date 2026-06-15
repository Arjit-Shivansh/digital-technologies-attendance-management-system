import { readSheetsBatch } from "../sheets.js";
import { isSundayOrHolidayPresentDay, getSundayHolidayPresentLabel } from "../leavePoolBonus.js";
import {
  parseUserStatCells,
  computeEffectiveLeavePool,
  computeRemainingLeave,
} from "../userSheetStats.js";
import {
  resolveDateRange,
  countWorkingDaysInRange,
  countPresentOnWorkingDays,
  computeAttendanceRate,
} from "../attendanceStats.js";
import { countDaysBetween } from "../leaveDays.js";

function isPresentStatus(status) {
  return (status || "Present").toLowerCase() === "present";
}

function countApprovedLeaveDaysInRange(leaves, userId, from, to) {
  let total = 0;
  for (const l of leaves) {
    if (l[1] !== userId) continue;
    if ((l[4] || "").toLowerCase() !== "approved") continue;
    const leaveFrom = l[2] || l.FromDate || l.fromDate || l[2];
    const leaveTo = l[3] || l.ToDate || l.toDate || leaveFrom;
    if (!leaveFrom) continue;
    const overlapStart = leaveFrom > from ? leaveFrom : from;
    const overlapEnd = leaveTo < to ? leaveTo : to;
    if (overlapStart > overlapEnd) continue;
    total += countDaysBetween(overlapStart, overlapEnd);
  }
  return total;
}

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

function mapUsers(rows) {
  return rows.map((r) => {
    const stats = parseUserStatCells(r);
    return {
      userId: r[0],
      name: r[1],
      role: r[4],
      managerId: r[5] || null,
      baseLeavePool: stats.baseLeavePool,
      leaveApprovedDays: stats.leaveApprovedDays,
      leavePendingDays: stats.leavePendingDays,
      sundayHolidayPresent: stats.sundayHolidayPresent,
      leavePool: computeEffectiveLeavePool(stats.baseLeavePool, stats.sundayHolidayPresent),
    };
  });
}

function filterUsers(users, { userId, role, managerId }) {
  let filtered = users;
  if (userId) {
    filtered = filtered.filter((u) => u.userId === userId);
  } else {
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (managerId) filtered = filtered.filter((u) => u.managerId === managerId);
  }
  return filtered;
}

function computeEmployeeStats(user, attendance, leaves, holidayRows, from, to) {
  const uid = user.userId;
  const { from: effFrom, to: effTo, isDefault, cycleLabel } = resolveDateRange(from, to);

  const userAttendance = attendance.filter((a) => {
    const d = a[2] || "";
    if (a[1] !== uid) return false;
    if (d < effFrom || d > effTo) return false;
    return isPresentStatus(a[3]);
  });

  const presentDays = userAttendance.length;

  const sundayHolidayPresentLog = userAttendance
    .filter((a) => isSundayOrHolidayPresentDay(a[2] || "", holidayRows))
    .map((a) => {
      const date = a[2] || "";
      const info = getSundayHolidayPresentLabel(date, holidayRows);
      return {
        date,
        type: info?.type || "sunday",
        label: info?.label || "Sunday",
        reason: a[5] || "",
        markedBy: a[4] || "",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const userLeaves = leaves.filter((l) => l[1] === uid);
  const pendingLeaves = userLeaves.filter((l) => (l[4] || "").toLowerCase() === "pending").length;

  const effectivePool = user.leavePool;
  const leavePoolRemaining = computeRemainingLeave(
    user.baseLeavePool,
    user.sundayHolidayPresent,
    user.leaveApprovedDays
  );

  const workingDays = countWorkingDaysInRange(effFrom, effTo, holidayRows);
  const weekdayPresentDays = countPresentOnWorkingDays(attendance, uid, effFrom, effTo, holidayRows);
  const { rate: attendanceRate } = computeAttendanceRate({
    presentDays: weekdayPresentDays,
    workingDays,
  });

  const approvedLeaveDays =
    from && to
      ? countApprovedLeaveDaysInRange(leaves, uid, effFrom, effTo)
      : user.leaveApprovedDays;

  const sundayHolidayPresentDaysInPeriod = userAttendance.filter((a) =>
    isSundayOrHolidayPresentDay(a[2] || "", holidayRows)
  ).length;

  return {
    presentDays,
    approvedLeaveDays,
    pendingLeaves,
    leavePendingDays: user.leavePendingDays,
    leavePool: effectivePool,
    baseLeavePool: user.baseLeavePool,
    leavePoolRemaining,
    sundayHolidayPresentDays: from && to ? sundayHolidayPresentDaysInPeriod : user.sundayHolidayPresent,
    sundayHolidayPresentLog,
    attendanceRate,
    statsPeriod: { from: effFrom, to: effTo, isDefault, cycleLabel },
    attendanceRateMeta: {
      workingDays,
      presentDays: weekdayPresentDays,
    },
  };
}

export default async function handleAdminStats(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { from, to, userId, role, managerId } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const fresh = isFresh(req.query) || Boolean(userId);

    const batch = await readSheetsBatch(["Users", "Attendance", "Leaves", "Holidays"], { fresh });

    const allUsers = mapUsers(batch.Users || []);
    const attendance = batch.Attendance || [];
    const leaves = batch.Leaves || [];
    const holidayRows = batch.Holidays || [];

    const scopedUsers = filterUsers(allUsers, { userId, role, managerId });
    const scopedUserIds = new Set(scopedUsers.map((u) => u.userId));

    const filteredAttendance = attendance.filter((a) => {
      if (!scopedUserIds.has(a[1])) return false;
      const d = a[2] || "";
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const periodAttendance =
      from || to
        ? filteredAttendance.length
        : attendance.filter((a) => scopedUserIds.has(a[1]) && (a[2] || "").startsWith(today)).length;

    const pendingLeaves = leaves.filter((l) => {
      if (!scopedUserIds.has(l[1])) return false;
      return (l[4] || "").toLowerCase() === "pending";
    }).length;

    const response = {
      totalUsers: scopedUsers.filter((u) => u.role !== "Admin").length,
      totalHolidays: (holidayRows || []).length,
      todayAttendance: periodAttendance,
      periodAttendance,
      pendingLeaves,
    };

    if (userId && scopedUsers.length === 1) {
      const selected = scopedUsers[0];
      response.selectedEmployee = { userId: selected.userId, name: selected.name };
      response.employeeStats = computeEmployeeStats(
        selected,
        attendance,
        leaves,
        holidayRows,
        from,
        to
      );
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Admin stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
