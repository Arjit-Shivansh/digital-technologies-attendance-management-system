/**
 * PATCH /api/password
 * Updates a user's password after verifying their current password.
 */
import { readSheet, findRow, updateCell } from "./_lib/sheets.js";

const MIN_LENGTH = 6;

export function validateNewPassword(currentPassword, newPassword) {
  if (!newPassword || String(newPassword).length < MIN_LENGTH) {
    return `New password must be at least ${MIN_LENGTH} characters`;
  }
  if (String(currentPassword).trim() === String(newPassword).trim()) {
    return "New password must be different from the current password";
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, currentPassword, newPassword } = req.body || {};

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: "Email, current password, and new password are required" });
    }

    const validationError = validateNewPassword(currentPassword, newPassword);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const rows = await readSheet("Users", { fresh: true });
    const normalizedEmail = String(email).trim().toLowerCase();
    const userRow = rows.find((r) => String(r[2]).trim().toLowerCase() === normalizedEmail);

    if (!userRow || String(userRow[3]).trim() !== String(currentPassword).trim()) {
      return res.status(401).json({ error: "Invalid email or current password" });
    }

    const rowNum = await findRow("Users", 2, userRow[2], rows);
    if (rowNum === null) {
      return res.status(404).json({ error: "User not found" });
    }

    await updateCell("Users", `D${rowNum}`, [[String(newPassword).trim()]]);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
