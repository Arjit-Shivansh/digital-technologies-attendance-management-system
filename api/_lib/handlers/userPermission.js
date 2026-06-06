import { readSheet, findRow, updateCell, invalidateSheet } from "../sheets.js";

export default async function handleUserPermission(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { userId, canMarkAttendance } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const flag = canMarkAttendance ? "TRUE" : "FALSE";
    const rows = await readSheet("Users");
    const rowNum = await findRow("Users", 0, userId, rows);
    if (rowNum === null) return res.status(404).json({ error: "User not found" });

    await updateCell("Users", `H${rowNum}`, [[flag]]);
    invalidateSheet("Users");

    return res.status(200).json({ userId, canMarkAttendance: flag === "TRUE" });
  } catch (err) {
    console.error("Permission update error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
