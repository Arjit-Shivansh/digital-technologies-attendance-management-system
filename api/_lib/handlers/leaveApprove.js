import { readSheet, findRow, updateCell } from "../sheets.js";

export default async function handleLeaveApprove(req, res) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { leaveId, status } = req.body || {};
    if (!leaveId || !status) {
      return res.status(400).json({ error: "leaveId and status are required" });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be Approved or Rejected" });
    }

    const rows = await readSheet("Leaves");
    const rowNum = await findRow("Leaves", 0, leaveId, rows);
    if (!rowNum) return res.status(404).json({ error: "Leave not found" });

    await updateCell("Leaves", `E${rowNum}`, [[status]]);
    return res.status(200).json({ leaveId, status });
  } catch (err) {
    console.error("Leave approve error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
