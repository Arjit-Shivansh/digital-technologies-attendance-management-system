/**
 * /api/users/profile  GET
 * /api/users/permission  PATCH
 */
import handleUserProfile from "../_lib/handlers/userProfile.js";
import handleUserPermission from "../_lib/handlers/userPermission.js";

const routes = {
  profile: handleUserProfile,
  permission: handleUserPermission,
};

export default async function handler(req, res) {
  const action = req.query.action;
  const route = routes[action];
  if (!route) return res.status(404).json({ error: "Not found" });
  return route(req, res);
}
