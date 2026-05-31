import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../context/DashboardDataContext";
import LeaveModal from "./LeaveModal";
import LeaveInfoPanel from "./LeaveInfoPanel";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function getFirstDayOfMonth(y, m) {
  return new Date(y, m, 1).getDay();
}

function expandLeaveDates(leaves) {
  const map = {};
  leaves.forEach((l) => {
    const from = l.fromDate || l.FromDate;
    const to = l.toDate || l.ToDate;
    const status = l.status || l.Status;
    if (!from) return;
    const end = to || from;
    const cur = new Date(`${from}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    while (cur <= endDate) {
      const key = cur.toISOString().slice(0, 10);
      map[key] = status;
      cur.setDate(cur.getDate() + 1);
    }
  });
  return map;
}

export default function CalendarView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const {
    year,
    month,
    goPrevMonth,
    goNextMonth,
    holidays,
    leaves,
    attendance,
    loading,
    refetch,
    addLeaveRecord,
  } = useDashboardData();

  const today = new Date();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveRefreshKey, setLeaveRefreshKey] = useState(0);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, otherMonth: true, date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, otherMonth: false, date: dateStr });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, otherMonth: true, date: null });
    }
  }

  const holidayMap = {};
  holidays.forEach((h) => {
    holidayMap[h.date || h.Date] = h.holidayName || h.HolidayName;
  });

  const leaveMap = expandLeaveDates(leaves);
  const attendanceSet = new Set(
    attendance
      .filter((a) => a.userId === user?.userId)
      .map((a) => a.date || a.Date)
  );

  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isWeekend = (idx) => idx % 7 === 0 || idx % 7 === 6;

  return (
    <div className="calendar-view">
      <header className="calendar-view-header desktop-only-header">
        <div className="calendar-view-header-text">
          <h2>Calendar</h2>
          <p>
            {isAdmin
              ? "View company holidays and attendance records"
              : "View holidays, leaves, and attendance records"}
          </p>
        </div>
        {!loading && !isAdmin && (
          <button
            type="button"
            className="btn btn-primary calendar-apply-btn"
            onClick={() => setShowLeaveModal(true)}
          >
            + Apply for Leave
          </button>
        )}
      </header>

      {!isAdmin && <LeaveInfoPanel refreshKey={leaveRefreshKey} />}

      <div className="calendar-shell">
        <div className="calendar-header-bar">
          <span className="month-label">
            {MONTHS[month]} {year}
          </span>
          <div className="calendar-header-actions">
            <div className="nav-arrows">
              <button type="button" onClick={goPrevMonth} aria-label="Previous month">
                &larr;
              </button>
              <button type="button" onClick={goNextMonth} aria-label="Next month">
                &rarr;
              </button>
            </div>
            {!loading && !isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-sm calendar-apply-mobile-header"
                onClick={() => setShowLeaveModal(true)}
              >
                + Apply for Leave
              </button>
            )}
          </div>
        </div>

        <div className="calendar-day-names">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell, idx) => {
            const weekend = isWeekend(idx);
            const todayClass = !cell.otherMonth && isToday(cell.day) ? "today" : "";
            const otherClass = cell.otherMonth ? "other-month" : "";
            const weekendClass = weekend ? "weekend-cell" : "";
            const holiday = holidayMap[cell.date];
            const leave = leaveMap[cell.date];
            const present = cell.date && attendanceSet.has(cell.date);
            const presentClass = present ? "present-day" : "";
            const hasEvents = holiday || leave || present;

            return (
              <div
                key={idx}
                className={`calendar-cell ${weekendClass} ${otherClass} ${todayClass} ${presentClass}`}
              >
                <div className="day-number">{cell.day}</div>
                <div className="calendar-cell-events">
                  {holiday && (
                    <span className="event-chip holiday calendar-chip-desktop">{holiday}</span>
                  )}
                  {leave && (
                    <span className="event-chip leave calendar-chip-desktop">{leave}</span>
                  )}
                  {present && (
                    <>
                      <span className="event-chip present calendar-chip-desktop">Present</span>
                      <span className="calendar-dot present-dot calendar-dot-mobile" />
                    </>
                  )}
                  {!present && hasEvents && (
                    <span
                      className={`calendar-dot ${holiday ? "holiday-dot" : "leave-dot"} calendar-dot-mobile`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!loading && !isAdmin && (
        <div className="calendar-apply-mobile">
          <button type="button" className="btn btn-primary btn-block" onClick={() => setShowLeaveModal(true)}>
            + Apply for Leave
          </button>
        </div>
      )}

      {!isAdmin && showLeaveModal && (
        <LeaveModal
          open={showLeaveModal}
          userId={user.userId}
          onClose={() => setShowLeaveModal(false)}
          onSuccess={(record) => {
            setShowLeaveModal(false);
            if (record) addLeaveRecord(record);
            setLeaveRefreshKey((k) => k + 1);
            refetch(true);
          }}
        />
      )}
    </div>
  );
}
