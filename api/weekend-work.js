/**
 * GET  /api/weekend-work  → deprecated; kept for backward compatibility
 * POST /api/weekend-work
 */
import { readSheet, appendRow, parseFresh } from "./_lib/sheets.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await readSheet("WeekendWork", { fresh: parseFresh(req.query) });
      const entries = rows.map((r) => ({
        workId: r[0],
        userId: r[1],
        date: r[2],
        hoursWorked: r[3],
      }));
      return res.status(200).json(entries);
    }

    if (req.method === "POST") {
      const { date, hoursWorked } = req.body || {};
      const userId = req.body.userId;
      if (!userId || !date || hoursWorked == null) {
        return res.status(400).json({ error: "userId, date, and hoursWorked are required" });
      }

      const workId = `W${Date.now()}`;
      await appendRow("WeekendWork", [workId, userId, date, String(hoursWorked)]);
      return res.status(201).json({ workId, userId, date, hoursWorked });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("WeekendWork error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
