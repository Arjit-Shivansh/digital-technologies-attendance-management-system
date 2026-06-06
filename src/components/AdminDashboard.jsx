import { useState, useEffect, useCallback, useRef } from "react";
import {
  AnalyticsStatsSkeleton,
  AccessTabSkeleton,
  HolidaysTabSkeleton,
  LeavesTabSkeleton,
} from "./admin/AdminSkeletons";

export default function AdminDashboard() {
  const [tab, setTab] = useState("analytics");

  return (
    <>
      <div className="page-header desktop-only-header">
        <h2>Admin Dashboard</h2>
        <p>Analytics, access management, holidays, and leave approvals</p>
      </div>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        {[
          ["analytics", "📊 Analytics"],
          ["users", "👥 Access"],
          ["holidays", "🎉 Holidays"],
          ["leaves", "📋 Leaves"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn ${tab === key ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "analytics" && <AnalyticsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "holidays" && <HolidaysTab />}
      {tab === "leaves" && <LeavesTab />}
    </>
  );
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AnalyticsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const debouncedUserId = useDebounce(filterUserId);
  const debouncedRole = useDebounce(filterRole);
  const debouncedManager = useDebounce(filterManager);
  const debouncedFrom = useDebounce(fromDate);
  const debouncedTo = useDebounce(toDate);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const fetchStats = useCallback((fresh = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedFrom) params.set("from", debouncedFrom);
    if (debouncedTo) params.set("to", debouncedTo);
    if (debouncedUserId) params.set("userId", debouncedUserId);
    if (debouncedRole) params.set("role", debouncedRole);
    if (debouncedManager) params.set("managerId", debouncedManager);
    if (fresh || debouncedUserId) params.set("fresh", "1");
    return fetch(`/api/admin/stats?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [debouncedFrom, debouncedTo, debouncedUserId, debouncedRole, debouncedManager]);

  useEffect(() => {
    fetchStats(false);
  }, [fetchStats]);

  const uniqueRoles = [...new Set(users.map((u) => u.role || u.Role).filter(Boolean))];
  const uniqueManagers = [...new Set(users.map((u) => u.managerId || u.ManagerID || "").filter(Boolean))];
  const employeeView = Boolean(debouncedUserId && stats?.employeeStats);

  return (
    <>
      <div className="filter-bar admin-analytics-filters">
        <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)}>
          <option value="">All Employees</option>
          {users.map((u) => {
            const id = u.userId || u.UserID;
            return (
              <option key={id} value={id}>
                {u.name || u.Name}
              </option>
            );
          })}
        </select>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {uniqueRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
          <option value="">All Managers</option>
          {uniqueManagers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label style={{ fontWeight: 600, fontSize: "0.8125rem" }}>From:</label>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <label style={{ fontWeight: 600, fontSize: "0.8125rem" }}>To:</label>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={() => fetchStats(true)}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <AnalyticsStatsSkeleton cards={employeeView ? 6 : 3} />
      ) : employeeView ? (
        <>
          {stats?.selectedEmployee && (
            <p style={{ marginBottom: 12, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              Showing stats for <strong>{stats.selectedEmployee.name}</strong>
            </p>
          )}
          <div className="stats-grid stats-grid-employee">
            <div className="stat-card">
              <span className="stat-label">Present Days</span>
              <span className="stat-value">{stats.employeeStats.presentDays}</span>
              <span className="stat-sub stat-sub-spacer" aria-hidden="true">
                &nbsp;
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Approved Leave Days</span>
              <span className="stat-value">{stats.employeeStats.approvedLeaveDays}</span>
              <span className="stat-sub stat-sub-spacer" aria-hidden="true">
                &nbsp;
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending Leaves</span>
              <span className="stat-value">{stats.employeeStats.pendingLeaves}</span>
              <span className="stat-sub stat-sub-spacer" aria-hidden="true">
                &nbsp;
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Leave Pool</span>
              <span className="stat-value">{stats.employeeStats.leavePool ?? stats.employeeStats.leavePoolRemaining}</span>
              <span className="stat-sub">
                {stats.employeeStats.leavePoolRemaining} remaining after approved leave
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Sunday & Holiday Present</span>
              <span className="stat-value">{stats.employeeStats.sundayHolidayPresentDays ?? stats.employeeStats.weekendPresentDays ?? 0}</span>
              <span className="stat-sub">each earns +1 leave pool day</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Attendance Rate</span>
              <span className="stat-value">{stats.employeeStats.attendanceRate}%</span>
              <span className="stat-sub">
                {stats.employeeStats.statsPeriod
                  ? `${stats.employeeStats.statsPeriod.from} → ${stats.employeeStats.statsPeriod.to}${
                      stats.employeeStats.statsPeriod.cycleLabel
                        ? ` (${stats.employeeStats.statsPeriod.cycleLabel})`
                        : ""
                    } · present ÷ working days`
                  : "present days ÷ working days (Apr–Mar cycle)"}
              </span>
            </div>
          </div>

          <div className="card analytics-detail-card">
            <div className="card-header">Sunday & Holiday Present Days</div>
            <p className="analytics-detail-note">
              Each row earned +1 leave pool. If a date is both Sunday and a company holiday, it is listed as{" "}
              <strong>Holiday</strong>.
            </p>
            {(stats.employeeStats.sundayHolidayPresentLog || []).length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 16px" }}>
                <p>No Sunday or holiday present days in this period.</p>
              </div>
            ) : (
              <div className="analytics-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Detail</th>
                      <th>Reason</th>
                      <th>Marked By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.employeeStats.sundayHolidayPresentLog.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>
                          <span
                            className={`event-chip ${
                              row.type === "holiday" ? "holiday" : "weekend-work"
                            }`}
                          >
                            {row.type === "holiday" ? "Holiday" : "Sunday"}
                          </span>
                        </td>
                        <td>{row.label}</td>
                        <td style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                          {row.reason || "—"}
                        </td>
                        <td>{row.markedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{stats?.totalUsers || 0}</span>
            <span className="stat-sub stat-sub-spacer" aria-hidden="true">
              &nbsp;
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Attendance (Period)</span>
            <span className="stat-value">{stats?.periodAttendance || stats?.todayAttendance || 0}</span>
            <span className="stat-sub">in selected range</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Leaves</span>
            <span className="stat-value">{stats?.pendingLeaves || 0}</span>
            <span className="stat-sub stat-sub-spacer" aria-hidden="true">
              &nbsp;
            </span>
          </div>
        </div>
      )}
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const loaded = useRef(false);

  const fetchUsers = (fresh = false) => {
    setLoading(true);
    const q = fresh ? "?fresh=1" : "";
    fetch(`/api/admin/users${q}`)
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchUsers(false);
    }
  }, []);

  const toggleAttendancePermission = async (targetUserId, currentValue) => {
    try {
      await fetch("/api/users/permission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId, canMarkAttendance: !currentValue }),
      });
      setUsers((prev) =>
        prev.map((u) => {
          const id = u.userId || u.UserID;
          return id === targetUserId
            ? { ...u, canMarkAttendance: !currentValue }
            : u;
        })
      );
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  if (loading) return <AccessTabSkeleton />;

  const filteredUsers = users.filter((u) => {
    const role = u.role || u.Role || "";
    const mgr = u.managerId || u.ManagerID || "";
    if (filterRole && role !== filterRole) return false;
    if (filterManager && mgr !== filterManager) return false;
    return true;
  });

  const uniqueRoles = [...new Set(users.map((u) => u.role || u.Role).filter(Boolean))];
  const uniqueManagers = [...new Set(users.map((u) => u.managerId || u.ManagerID || "").filter(Boolean))];

  return (
    <>
      <div className="filter-bar">
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {uniqueRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
          <option value="">All Managers</option>
          {uniqueManagers.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchUsers(true)}>
          ↻ Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Leave Pool</th>
              <th>Can Mark Attendance</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state"><p>No users match filters.</p></div>
                </td>
              </tr>
            )}
            {filteredUsers.map((u) => {
              const id = u.userId || u.UserID;
              const canMark = Boolean(u.canMarkAttendance);
              return (
                <tr key={id}>
                  <td style={{ fontWeight: 600 }}>{u.name || u.Name}</td>
                  <td>{u.email || u.Email}</td>
                  <td>
                    <span className={`event-chip ${(u.role || u.Role) === "Admin" ? "leave" : (u.role || u.Role) === "Senior" ? "weekend-work" : "present"}`}>
                      {u.role || u.Role}
                    </span>
                  </td>
                  <td>{u.managerId || u.ManagerID || "—"}</td>
                  <td>{u.leavePool || u.LeavePool || 0}</td>
                  <td>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={canMark}
                        onChange={() => toggleAttendancePermission(id, canMark)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HolidaysTab() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const loaded = useRef(false);

  const fetchHolidays = (fresh = false) => {
    setLoading(true);
    const q = fresh ? "?fresh=1" : "";
    fetch(`/api/holidays${q}`)
      .then((r) => r.json())
      .then(setHolidays)
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchHolidays(false);
    }
  }, []);

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!date || !name) { setError("Both fields required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, holidayName: name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add");
      }
      setDate("");
      setName("");
      fetchHolidays(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (holidayDate) => {
    if (!confirm("Delete this holiday?")) return;
    try {
      await fetch("/api/holidays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: holidayDate }),
      });
      fetchHolidays(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <HolidaysTabSkeleton />;

  return (
    <div className="weekend-work-panel">
      <div className="card weekend-work-form">
        <div className="card-header">Add Global Holiday</div>
        <form onSubmit={addHoliday}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Holiday Name</label>
            <input className="form-input" type="text" placeholder="e.g. New Year's Day" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add Holiday"}
          </button>
        </form>
      </div>

      <div className="card weekend-work-stats">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>All Holidays ({holidays.length})</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchHolidays(true)}>
            ↻ Refresh
          </button>
        </div>
        {holidays.length === 0 && (
          <div className="empty-state"><p>No holidays configured.</p></div>
        )}
        {holidays.map((h, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            <div>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{h.holidayName || h.HolidayName}</span>
              <br />
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{h.date || h.Date}</span>
            </div>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteHoliday(h.date || h.Date)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeavesTab() {
  const [leaves, setLeaves] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Pending");
  const loaded = useRef(false);

  const fetchLeaves = (fresh = false) => {
    setLoading(true);
    const q = fresh ? "?fresh=1" : "";
    Promise.all([
      fetch(`/api/leaves${q}`).then((r) => r.json()),
      fetch(`/api/admin/users${q}`).then((r) => r.json()),
    ])
      .then(([l, u]) => {
        setLeaves(l);
        setUsers(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchLeaves(false);
    }
  }, []);

  const getUserName = (userId) => {
    const u = users.find((x) => (x.userId || x.UserID) === userId);
    return u ? u.name || u.Name : userId;
  };

  const updateStatus = async (leaveId, newStatus) => {
    try {
      await fetch("/api/leaves/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status: newStatus }),
      });
      fetchLeaves(true);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = leaves.filter((l) => {
    const st = (l.status || l.Status || "Pending").toLowerCase();
    if (filterStatus === "All") return true;
    return st === filterStatus.toLowerCase();
  });

  if (loading) return <LeavesTabSkeleton />;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="filter-bar" style={{ padding: "12px 16px", marginBottom: 0 }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
          {filtered.length} leave(s)
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchLeaves(true)}>
          ↻ Refresh
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>From</th>
            <th>To</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6}>
                <div className="empty-state"><p>No leave requests found.</p></div>
              </td>
            </tr>
          )}
          {filtered.map((l, i) => {
              const lid = l.leaveId || l.LeaveID;
              const uid = l.userId || l.UserID;
              const from = l.fromDate || l.FromDate;
              const to = l.toDate || l.ToDate;
              const st = l.status || l.Status || "Pending";
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{getUserName(uid)}</td>
                  <td>{from}</td>
                  <td>{to}</td>
                  <td style={{ maxWidth: 180, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                    {l.reason || l.Reason || "—"}
                  </td>
                  <td>
                    <span
                      className={`event-chip ${
                        st.toLowerCase() === "approved" ? "present" : st.toLowerCase() === "rejected" ? "leave" : "weekend-work"
                      }`}
                    >
                      {st}
                    </span>
                  </td>
                  <td>
                    {st.toLowerCase() === "pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => updateStatus(lid, "Approved")}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => updateStatus(lid, "Rejected")}>
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
