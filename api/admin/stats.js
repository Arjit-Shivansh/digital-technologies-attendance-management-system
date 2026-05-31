/**

 * GET /api/admin/stats?from=&to=&userId=&role=&managerId=&fresh=1

 * Returns aggregate or per-employee statistics for the admin dashboard.

 */

import { readSheetsBatch } from "../_lib/sheets.js";

import { isSundayOrHolidayPresentDay, getSundayHolidayPresentLabel } from "../_lib/leavePoolBonus.js";



function isFresh(query) {

  return query.fresh === "1" || query.fresh === "true";

}



function countWeekdays(from, to) {

  if (!from || !to) return 0;

  let count = 0;

  const cur = new Date(`${from}T12:00:00`);

  const end = new Date(`${to}T12:00:00`);

  while (cur <= end) {

    const day = cur.getDay();

    if (day !== 0 && day !== 6) count += 1;

    cur.setDate(cur.getDate() + 1);

  }

  return count;

}



function countLeaveDaysInRange(fromDate, toDate, rangeFrom, rangeTo) {

  const start = fromDate > rangeFrom ? fromDate : rangeFrom;

  const end = toDate < rangeTo ? toDate : rangeTo;

  if (start > end) return 0;



  let days = 0;

  const cur = new Date(`${start}T12:00:00`);

  const endDate = new Date(`${end}T12:00:00`);

  while (cur <= endDate) {

    days += 1;

    cur.setDate(cur.getDate() + 1);

  }

  return days;

}



function mapUsers(rows) {

  return rows.map((r) => ({

    userId: r[0],

    name: r[1],

    role: r[4],

    managerId: r[5] || null,

    leavePool: parseInt(r[6], 10) || 0,

  }));

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

  const rangeFrom = from || "1970-01-01";

  const rangeTo = to || "2099-12-31";



  const userAttendance = attendance.filter((a) => {

    const d = a[2] || "";

    if (a[1] !== uid) return false;

    if (from && d < from) return false;

    if (to && d > to) return false;

    return true;

  });



  const presentDays = userAttendance.length;

  const sundayHolidayPresentDays = userAttendance.filter((a) =>

    isSundayOrHolidayPresentDay(a[2] || "", holidayRows)

  ).length;

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



  let approvedLeaveDays = 0;

  userLeaves.forEach((l) => {

    if ((l[4] || "").toLowerCase() !== "approved") return;

    approvedLeaveDays += countLeaveDaysInRange(l[2] || "", l[3] || "", rangeFrom, rangeTo);

  });



  let totalApprovedDays = 0;

  userLeaves.forEach((l) => {

    if ((l[4] || "").toLowerCase() !== "approved") return;

    totalApprovedDays += countLeaveDaysInRange(l[2] || "", l[3] || "", "1970-01-01", "2099-12-31");

  });



  const weekdays = from && to ? countWeekdays(from, to) : 0;

  const attendanceRate =

    weekdays > 0 ? Math.min(100, Math.round((presentDays / weekdays) * 100)) : presentDays > 0 ? 100 : 0;



  return {

    presentDays,

    approvedLeaveDays,

    pendingLeaves,

    leavePool: user.leavePool,

    leavePoolRemaining: Math.max(0, user.leavePool - totalApprovedDays),

    sundayHolidayPresentDays,
    sundayHolidayPresentLog,
    attendanceRate,

  };

}



export default async function handler(req, res) {

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {

    const { from, to, userId, role, managerId } = req.query;

    const today = new Date().toISOString().slice(0, 10);

    const fresh = isFresh(req.query) || Boolean(userId);



    const batch = await readSheetsBatch(["Users", "Attendance", "Leaves", "Holidays"], {

      fresh,

    });



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

      totalUsers: scopedUsers.length,

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


