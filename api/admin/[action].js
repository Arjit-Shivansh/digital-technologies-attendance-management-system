/**
 * /api/admin/users  GET
 * /api/admin/stats  GET
 */
import handleAdminUsers from "../_lib/handlers/adminUsers.js";
import handleAdminStats from "../_lib/handlers/adminStats.js";

const routes = {
  users: handleAdminUsers,
  stats: handleAdminStats,
};

export default async function handler(req, res) {
  const action = req.query.action;
  const route = routes[action];
  if (!route) return res.status(404).json({ error: "Not found" });
  return route(req, res);
}
