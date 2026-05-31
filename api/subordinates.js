/**
 * GET /api/subordinates?userId=...&fresh=1
 * Returns users whose ManagerID matches the requesting user's UserID.
 */
import { readSheet } from "./_lib/sheets.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId query param required" });

    const rows = await readSheet("Users", { fresh: isFresh(req.query) });
    const allUsers = rows.map((r) => ({
      userId: r[0],
      name: r[1],
      email: r[2],
      role: r[4],
      managerId: r[5] || null,
      leavePool: parseInt(r[6], 10) || 0,
      canMarkAttendance: String(r[7]).toUpperCase() === "TRUE",
    }));

    const currentUser = allUsers.find((u) => u.userId === userId);
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    const isAdmin = currentUser.role === "Admin";
    const isSenior = currentUser.role?.includes("Senior") || isAdmin;

    let subordinates;
    if (isAdmin) {
      subordinates = allUsers.filter((u) => u.userId !== userId && u.role !== "Admin");
    } else if (isSenior) {
      subordinates = allUsers.filter(
        (u) => u.managerId === userId || (u.userId === userId && currentUser.canMarkAttendance)
      );
    } else {
      subordinates = [];
    }

    return res.status(200).json(subordinates);
  } catch (err) {
    console.error("Subordinates error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
