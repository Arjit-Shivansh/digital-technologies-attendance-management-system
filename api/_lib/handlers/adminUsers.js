import { readSheet } from "../sheets.js";
import { mapUserRow } from "../userFields.js";

function isFresh(query) {
  return query.fresh === "1" || query.fresh === "true";
}

export default async function handleAdminUsers(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const rows = await readSheet("Users", { fresh: isFresh(req.query) });
    return res.status(200).json(rows.map(mapUserRow));
  } catch (err) {
    console.error("Admin users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
