/**
 * POST /api/login
 * Authenticates user by matching email + password against the "Users" sheet.
 */
import { readSheet } from "./_lib/sheets.js";
import { mapUserRow } from "./_lib/userFields.js";

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

    return res.status(200).json(mapUserRow(userRow));
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
