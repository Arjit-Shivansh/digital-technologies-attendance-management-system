import { readSheetsBatch, parseFresh } from "../sheets.js";
import { countDaysBetween } from "../leaveDays.js";
import { readStatsFromRow } from "../userSheetStats.js";

export default async function handleLeaveSummary(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const fresh = parseFresh(req.query);
    const { Users: users, Leaves: leaveRows } = await readSheetsBatch(["Users", "Leaves"], { fresh });

    const userRow = users.find((r) => r[0] === userId);
    if (!userRow) return res.status(404).json({ error: "User not found" });

    if (userRow[4] === "Admin") {
      return res.status(403).json({ error: "Leave balance does not apply to admin accounts" });
    }

    const stats = readStatsFromRow(userRow);
    const baseLeavePool = stats.leavePool;
    const sundayHolidayPresent = stats.sundayHolidayPresent;
    const leavePool = stats.effectiveLeavePool;
    const approvedDaysUsed = stats.leaveApprovedDays;
    const pendingDays = stats.leavePendingDays;
    const remaining = stats.remaining;

    const userLeaves = leaveRows
      .filter((r) => r[1] === userId)
      .map((r) => ({
        leaveId: r[0],
        fromDate: r[2],
        toDate: r[3],
        status: r[4] || "Pending",
        reason: r[5] || "",
        days: countDaysBetween(r[2], r[3]),
      }));

    let pendingCount = 0;
    userLeaves.forEach((l) => {
      if (String(l.status).toLowerCase() === "pending") pendingCount += 1;
    });

    const recentLeaves = [...userLeaves]
      .sort((a, b) => (b.fromDate || "").localeCompare(a.fromDate || ""))
      .slice(0, 5);

    return res.status(200).json({
      baseLeavePool,
      sundayHolidayPresent,
      leavePool,
      approvedDaysUsed,
      pendingDays,
      pendingCount,
      remaining,
      recentLeaves,
      leavePoolBonusNote:
        "Each Sunday/holiday present adds +1 to your leave pool total (SundayHolidayPresent counter).",
    });
  } catch (err) {
    console.error("Leave summary error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
