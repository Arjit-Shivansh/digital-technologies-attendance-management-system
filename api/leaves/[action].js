/**
 * /api/leaves/summary  GET
 * /api/leaves/approve  PATCH
 */
import handleLeaveSummary from "../_lib/handlers/leaveSummary.js";
import handleLeaveApprove from "../_lib/handlers/leaveApprove.js";

const routes = {
  summary: handleLeaveSummary,
  approve: handleLeaveApprove,
};

export default async function handler(req, res) {
  const action = req.query.action;
  const route = routes[action];
  if (!route) return res.status(404).json({ error: "Not found" });
  return route(req, res);
}
