/**
 * GET /api/admin/users?fresh=1
 * Returns all users for admin management.
 */
import { readSheet } from "../_lib/sheets.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const rows = await readSheet("Users", { fresh: isFresh(req.query) });
    const users = rows.map((r) => ({
      userId: r[0],
      name: r[1],
      email: r[2],
      role: r[4],
      managerId: r[5] || null,
      leavePool: parseInt(r[6], 10) || 0,
      canMarkAttendance: String(r[7]).toUpperCase() === "TRUE",
    }));
    return res.status(200).json(users);
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
