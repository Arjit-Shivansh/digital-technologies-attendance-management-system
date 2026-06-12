import { resetCycleForAllUsers } from "../userSheetStats.js";

export default async function handleAdminResetCycle(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const pool = parseInt(req.body?.pool, 10) || 22;
    const result = await resetCycleForAllUsers({ pool });
    return res.status(200).json(result);
  } catch (err) {
    console.error("Admin reset cycle error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
