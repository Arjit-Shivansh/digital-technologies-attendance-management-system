import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../context/DashboardDataContext";
import { buildPresentByDate } from "../lib/employeeAvatar";
import {
  CALENDAR_DAY_NAMES,
  CALENDAR_MONTHS,
  buildMonthCells,
  buildHolidayMap,
  expandLeaveDates,
} from "../lib/calendarEvents";
import LeaveModal from "./LeaveModal";
import LeaveInfoPanel from "./LeaveInfoPanel";
import CalendarPresentAvatars from "./CalendarPresentAvatars";

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
    employees,
    loading,
    refetch,
    addLeaveRecord,
  } = useDashboardData();

  useEffect(() => {
    refetch(true);
  }, []);

  const presentByDate = useMemo(
    () => (isAdmin ? buildPresentByDate(attendance, employees) : null),
    [isAdmin, attendance, employees]
  );

  const today = new Date();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveRefreshKey, setLeaveRefreshKey] = useState(0);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const holidayMap = useMemo(() => buildHolidayMap(holidays), [holidays]);
  const leaveMap = useMemo(() => expandLeaveDates(leaves), [leaves]);
  const attendanceSet = useMemo(
    () =>
      new Set(
        attendance
          .filter((a) => a.userId === user?.userId)
          .map((a) => a.date || a.Date)
      ),
    [attendance, user?.userId]
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
            {CALENDAR_MONTHS[month].trim()} {year}
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
          {CALENDAR_DAY_NAMES.map((d) => (
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
            const dayAvatars = isAdmin && cell.date ? presentByDate.get(cell.date) : null;
            const present = !isAdmin && cell.date && attendanceSet.has(cell.date);
            const hasPresentAvatars = Boolean(dayAvatars?.length);
            const presentClass = present || hasPresentAvatars ? "present-day" : "";
            const hasEvents = holiday || leave || present || hasPresentAvatars;

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
                  {isAdmin ? (
                    <>
                      {hasPresentAvatars && <CalendarPresentAvatars avatars={dayAvatars} />}
                      {holiday && !hasPresentAvatars && (
                        <span className="calendar-dot holiday-dot calendar-dot-mobile" />
                      )}
                    </>
                  ) : (
                    <>
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
                    </>
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
