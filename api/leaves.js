/**
 * GET  /api/leaves  → returns leaves (optional userId filter)
 * POST /api/leaves  → creates a new leave entry
 *
 * Query params (GET):
 *   userId=U001    filter by employee
 *   fresh=1        bypass sheet cache
 */
import { readSheet, appendRow } from "./_lib/sheets.js";
import { validateLeaveDateRange, countDaysBetween } from "./_lib/leaveDays.js";
import { adjustUserStats } from "./_lib/userSheetStats.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await readSheet("Leaves", { fresh: isFresh(req.query) });
      let leaves = rows.map((r) => ({
        leaveId: r[0],
        userId: r[1],
        fromDate: r[2],
        toDate: r[3],
        status: r[4],
        reason: r[5] || "",
      }));

      const { userId } = req.query;
      if (userId) {
        leaves = leaves.filter((l) => l.userId === userId);
      }

      return res.status(200).json(leaves);
    }

    if (req.method === "POST") {
      const { fromDate, toDate, reason } = req.body || {};
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: "fromDate and toDate are required" });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const users = await readSheet("Users");
      const userRow = users.find((r) => r[0] === userId);
      if (userRow?.[4] === "Admin") {
        return res.status(403).json({ error: "Admin accounts are not enrolled in the leave program" });
      }

      const rangeError = validateLeaveDateRange(fromDate, toDate);
      if (rangeError) {
        return res.status(400).json({ error: rangeError });
      }

      const leaveId = `L${Date.now()}`;
      await appendRow("Leaves", [leaveId, userId, fromDate, toDate, "Pending", reason || ""]);

      const days = countDaysBetween(fromDate, toDate);
      await adjustUserStats(userId, { pendingDelta: days });

      return res.status(201).json({ leaveId, userId, fromDate, toDate, status: "Pending", reason: reason || "" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Leaves error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
