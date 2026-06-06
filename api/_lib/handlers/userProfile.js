import { readSheet } from "../sheets.js";
import { mapUserRow } from "../userFields.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handleUserProfile(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId query param required" });

    const rows = await readSheet("Users", { fresh: isFresh(req.query) });
    const row = rows.find((r) => r[0] === userId);
    if (!row) return res.status(404).json({ error: "User not found" });

    return res.status(200).json(mapUserRow(row));
  } catch (err) {
    console.error("User profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
