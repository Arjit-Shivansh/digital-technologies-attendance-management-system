/**
 * POST /api/login
 * Authenticates user by matching email + password against the "Users" sheet.
 */
import { readSheet } from "./_lib/sheets.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const rows = await readSheet("Users", { fresh: true });
    const userRow = rows.find((r) => String(r[2]).trim().toLowerCase() === email.trim().toLowerCase());

    if (!userRow || String(userRow[3]).trim() !== password.trim()) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = {
      userId: userRow[0],
      name: userRow[1],
      email: userRow[2],
      role: userRow[4],
      managerId: userRow[5] || null,
      leavePool: parseInt(userRow[6], 10) || 0,
      canMarkAttendance: String(userRow[7]).toUpperCase() === "TRUE",
    };

    return res.status(200).json(user);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
