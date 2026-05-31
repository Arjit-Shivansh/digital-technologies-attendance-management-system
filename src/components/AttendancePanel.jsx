import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTeamData } from "../context/TeamDataContext";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePanel() {
  const { user, updateUser } = useAuth();
  const { subordinates, presentToday, loading, refetchSubordinates, setPresentToday, refetchAttendance } =
    useTeamData();
  const [markingIds, setMarkingIds] = useState(new Set());
  const [markTarget, setMarkTarget] = useState(null);
  const [markDate, setMarkDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [bonusMessage, setBonusMessage] = useState("");
  const [markError, setMarkError] = useState("");

  const isAdmin = user?.role === "Admin";
  const today = todayStr();

  const handleMarkPresent = async (targetUserId, date, attendanceReason = "") => {
    setMarkError("");
    try {
      setMarkingIds((prev) => new Set(prev).add(targetUserId));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          date,
          status: "Present",
          markedBy: user.userId,
          reason: attendanceReason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark attendance");
      }
      if (data.leavePoolBonus > 0) {
        const bonusLabel =
          data.leavePoolBonusReason === "holiday" ? "company holiday" : "Sunday work";
        setBonusMessage(
          `${targetUserId === user.userId ? "You earned" : "Employee earned"} +${data.leavePoolBonus} leave day for ${bonusLabel} on ${date}. New pool: ${data.leavePool} days.`
        );
        if (targetUserId === user.userId && data.leavePool != null) {
          updateUser({ leavePool: data.leavePool });
        }
      }
      if (date === today) {
        setPresentToday((prev) => new Set(prev).add(targetUserId));
      }
      refetchSubordinates();
      refetchAttendance();
      return true;
    } catch (err) {
      setMarkError(err.message || "Failed to mark attendance");
      console.error("Mark present error:", err);
      return false;
    } finally {
      setMarkingIds((prev) => {
        const copy = new Set(prev);
        copy.delete(targetUserId);
        return copy;
      });
    }
  };

  const openMarkModal = (targetUserId, name) => {
    setReason("");
    setMarkDate(today);
    setMarkError("");
    setMarkTarget({ targetUserId, name });
  };

  useEffect(() => {
    if (!markTarget) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [markTarget]);

  const closeMarkModal = () => {
    setMarkTarget(null);
    setReason("");
    setMarkDate(today);
  };

  const submitMarkModal = async (e) => {
    e.preventDefault();
    if (!markTarget) return;
    const { targetUserId } = markTarget;
    const date = isAdmin ? markDate : today;
    if (!date) {
      setMarkError("Please select a date");
      return;
    }
    const ok = await handleMarkPresent(targetUserId, date, reason.trim());
    if (ok) closeMarkModal();
  };

  const rowDisabled = (uid) => {
    if (isAdmin) return markingIds.has(uid);
    return presentToday.has(uid) || markingIds.has(uid);
  };

  const rowLabel = (uid) => {
    if (markingIds.has(uid)) return "Marking…";
    if (isAdmin) return "Mark Present";
    return presentToday.has(uid) ? "Marked" : "Mark Present";
  };

  if (loading) return <div className="loading-spinner">Loading team…</div>;

  return (
    <>
      <div className="page-header desktop-only-header">
        <h2>Team Attendance</h2>
        <p>
          {isAdmin
            ? "Mark present for employees on any date — admins excluded (Sunday/holiday earns +1 leave day)"
            : "Mark attendance for your team (today only; Sunday/holiday earns +1 leave day)"}
        </p>
      </div>

      {bonusMessage && (
        <div className="form-success leave-bonus-banner" role="status">
          {bonusMessage}
          <button
            type="button"
            className="leave-bonus-dismiss"
            onClick={() => setBonusMessage("")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {markError && !markTarget && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {markError}
        </div>
      )}

      <div className="card team-attendance-card">
        <div className="attendance-desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subordinates.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <p>No team members assigned yet.</p>
                    </div>
                  </td>
                </tr>
              )}
              {subordinates.map((s) => {
                const uid = s.userId || s.UserID;
                const name = s.name || s.Name;
                const email = s.email || s.Email;
                const role = s.role || s.Role;
                return (
                  <tr key={uid}>
                    <td>{name}</td>
                    <td>{email}</td>
                    <td>{role}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => openMarkModal(uid, name)}
                        disabled={rowDisabled(uid)}
                      >
                        {rowLabel(uid)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="attendance-mobile-cards">
          {subordinates.length === 0 && (
            <div className="empty-state">
              <p>No team members assigned yet.</p>
            </div>
          )}
          {subordinates.map((s) => {
            const uid = s.userId || s.UserID;
            const name = s.name || s.Name;
            const email = s.email || s.Email;
            const role = s.role || s.Role;
            return (
              <div key={uid} className="attendance-employee-card">
                <div className="attendance-employee-name">{name}</div>
                <div className="attendance-employee-meta">
                  {email} · {role}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => openMarkModal(uid, name)}
                  disabled={rowDisabled(uid)}
                >
                  {rowLabel(uid)}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {markTarget && (
        <div className="modal-overlay open" onClick={closeMarkModal} role="presentation">
          <div
            className="modal-dialog modal-dialog-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-mark-modal-title"
          >
            <div className="modal-sheet-handle" aria-hidden="true" />
            <div className="modal-header">
              <h3 id="team-mark-modal-title">Mark Present — {markTarget.name}</h3>
              <button type="button" className="modal-close" onClick={closeMarkModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={submitMarkModal}>
                {markError && <div className="form-error">{markError}</div>}
                {isAdmin && (
                  <div className="form-group">
                    <label htmlFor="team-attendance-date">Date</label>
                    <input
                      id="team-attendance-date"
                      className="form-input"
                      type="date"
                      value={markDate}
                      onChange={(e) => setMarkDate(e.target.value)}
                      required
                    />
                    <p className="form-hint">Admins can mark present for any past or future date.</p>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="team-attendance-reason">Reason (optional)</label>
                  <textarea
                    id="team-attendance-reason"
                    className="form-input"
                    rows={3}
                    placeholder="e.g. On-site with client"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="modal-footer modal-footer-mobile-stack">
                  <button type="button" className="btn btn-secondary" onClick={closeMarkModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Mark Present
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
