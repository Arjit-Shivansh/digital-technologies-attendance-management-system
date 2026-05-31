/**
 * GET /api/leaves/summary?userId=U001&fresh=1
 * Returns leave balance and usage for an employee.
 */
import { readSheetsBatch, parseFresh } from "../_lib/sheets.js";
import { countDaysBetween } from "../_lib/leaveDays.js";

export default async function handler(req, res) {
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

    const leavePool = parseInt(userRow[6], 10) || 0;
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

    let approvedDaysUsed = 0;
    let pendingDays = 0;
    let pendingCount = 0;

    userLeaves.forEach((l) => {
      const st = String(l.status).toLowerCase();
      if (st === "approved") approvedDaysUsed += l.days;
      else if (st === "pending") {
        pendingDays += l.days;
        pendingCount += 1;
      }
    });

    const remaining = Math.max(0, leavePool - approvedDaysUsed);

    const recentLeaves = [...userLeaves]
      .sort((a, b) => (b.fromDate || "").localeCompare(a.fromDate || ""))
      .slice(0, 5);

    return res.status(200).json({
      leavePool,
      approvedDaysUsed,
      pendingDays,
      pendingCount,
      remaining,
      recentLeaves,
      leavePoolBonusNote:
        "Marking present on Sunday or a company holiday adds +1 day to your leave pool (once per date, even when both apply).",
    });
  } catch (err) {
    console.error("Leave summary error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
