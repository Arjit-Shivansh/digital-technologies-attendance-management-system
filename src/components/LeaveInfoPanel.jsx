import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

export default function LeaveInfoPanel({ refreshKey = 0 }) {
  const { user, updateUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSummary = useCallback(
    (fresh = false) => {
      if (!user?.userId) return;
      setLoading(true);
      setError(false);
      const q = fresh ? "&fresh=1" : "";
      fetch(`/api/leaves/summary?userId=${encodeURIComponent(user.userId)}${q}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          setSummary(data);
          if (data.leavePool !== user.leavePool) {
            updateUser({ leavePool: data.leavePool });
          }
        })
        .catch(() => {
          setError(true);
          setSummary(null);
        })
        .finally(() => setLoading(false));
    },
    [user?.userId, user?.leavePool, updateUser]
  );

  useEffect(() => {
    fetchSummary(false);
  }, [fetchSummary, refreshKey]);

  useEffect(() => {
    const handler = () => fetchSummary(true);
    window.addEventListener("leave-summary-refresh", handler);
    return () => window.removeEventListener("leave-summary-refresh", handler);
  }, [fetchSummary]);

  const pool = summary?.leavePool ?? user?.leavePool ?? 0;
  const basePool = summary?.baseLeavePool;
  const sundayBonus = summary?.sundayHolidayPresent ?? 0;
  const used = summary?.approvedDaysUsed ?? 0;
  const remaining = summary?.remaining ?? Math.max(0, pool - used);
  const pendingDays = summary?.pendingDays ?? 0;
  const pendingCount = summary?.pendingCount ?? 0;
  const poolSubtitle =
    basePool != null && sundayBonus > 0
      ? `${basePool} base + ${sundayBonus} Sunday/holiday`
      : null;
  const bonusNote =
    summary?.leavePoolBonusNote ||
    "Each Sunday/holiday present adds +1 to your leave pool total.";

  return (
    <div className="leave-info-panel card">
      <div className="leave-info-header">
        <h3>Your Leave Balance</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchSummary(true)}>
          ↻ Refresh
        </button>
      </div>

      {loading && !summary && !error && (
        <p className="leave-info-loading">Loading leave balance…</p>
      )}

      {error && !summary && (
        <p className="leave-info-error">
          Could not load live balance — showing cached pool ({pool} days). Start API with{" "}
          <code>vercel dev</code> for full details.
        </p>
      )}

      <div className="leave-info-stats">
        <div className="leave-info-stat">
          <span className="leave-info-stat-value">{pool}</span>
          <span className="leave-info-stat-label">Leave pool</span>
          {poolSubtitle && (
            <span className="leave-info-stat-sub" style={{ fontSize: "0.7rem", opacity: 0.85 }}>
              {poolSubtitle}
            </span>
          )}
        </div>
        <div className="leave-info-stat">
          <span className="leave-info-stat-value">{used}</span>
          <span className="leave-info-stat-label">Used</span>
        </div>
        <div className="leave-info-stat leave-info-stat-highlight">
          <span className="leave-info-stat-value">{remaining}</span>
          <span className="leave-info-stat-label">Remaining</span>
        </div>
        <div className="leave-info-stat">
          <span className="leave-info-stat-value">{pendingCount}</span>
          <span className="leave-info-stat-label">Pending ({pendingDays}d)</span>
        </div>
      </div>

      <p className="leave-info-note">{bonusNote}</p>

      {summary?.recentLeaves?.length > 0 && (
        <div className="leave-info-recent">
          <h4>Recent requests</h4>
          <ul className="leave-info-list">
            {summary.recentLeaves.map((l) => (
              <li key={l.leaveId}>
                <span className="leave-info-dates">
                  {l.fromDate}
                  {l.toDate && l.toDate !== l.fromDate ? ` → ${l.toDate}` : ""}
                  {" · "}
                  {l.days} day{l.days !== 1 ? "s" : ""}
                </span>
                <span
                  className={`event-chip ${
                    String(l.status).toLowerCase() === "approved"
                      ? "present"
                      : String(l.status).toLowerCase() === "rejected"
                        ? "leave"
                        : "weekend-work"
                  }`}
                >
                  {l.status}
                </span>
                {l.reason && <span className="leave-info-reason">{l.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
