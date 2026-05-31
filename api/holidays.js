/**
 * GET    /api/holidays?fresh=1  → returns all holidays
 * POST   /api/holidays          → adds a new holiday (admin)
 * DELETE /api/holidays          → deletes a holiday by date (admin)
 */
import { readSheet, appendRow, findRow, updateCell } from "./_lib/sheets.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const rows = await readSheet("Holidays", { fresh: isFresh(req.query) });
      const holidays = rows
        .filter((r) => r[0] && r[0].trim())
        .map((r) => ({ date: r[0], holidayName: r[1] }));
      return res.status(200).json(holidays);
    }

    if (req.method === "POST") {
      const { date, holidayName } = req.body || {};
      if (!date || !holidayName) {
        return res.status(400).json({ error: "date and holidayName are required" });
      }

      const rows = await readSheet("Holidays");
      const existing = await findRow("Holidays", 0, date, rows);
      if (existing) {
        return res.status(409).json({ error: "A holiday already exists on that date" });
      }

      await appendRow("Holidays", [date, holidayName]);
      return res.status(201).json({ date, holidayName });
    }

    if (req.method === "DELETE") {
      const { date } = req.body || {};
      if (!date) {
        return res.status(400).json({ error: "date is required" });
      }

      const rows = await readSheet("Holidays");
      const rowNum = await findRow("Holidays", 0, date, rows);
      if (!rowNum) {
        return res.status(404).json({ error: "Holiday not found" });
      }

      await updateCell("Holidays", `A${rowNum}:B${rowNum}`, [["", ""]]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Holidays error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
