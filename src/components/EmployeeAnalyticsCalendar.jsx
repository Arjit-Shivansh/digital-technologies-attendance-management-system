import { useState, useEffect, useMemo } from "react";
import {
  CALENDAR_DAY_NAMES,
  CALENDAR_MONTHS,
  buildMonthCells,
  buildHolidayMap,
  expandLeaveDates,
  isSundayOrHolidayPresent,
  getMonthRange,
} from "../lib/calendarEvents";

export default function EmployeeAnalyticsCalendar({ userId, year, month, refreshKey = 0 }) {
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch("/api/holidays?fresh=1")
        .then((r) => r.json())
        .catch(() => []),
      fetch(`/api/leaves?userId=${encodeURIComponent(userId)}&fresh=1`)
        .then((r) => r.json())
        .catch(() => []),
      fetch(
        `/api/attendance?userId=${encodeURIComponent(userId)}&from=${from}&to=${to}&fresh=1`
      )
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([h, l, a]) => {
        setHolidays(Array.isArray(h) ? h : []);
        setLeaves(Array.isArray(l) ? l : []);
        setAttendance(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  }, [userId, from, to, refreshKey]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const holidayMap = useMemo(() => buildHolidayMap(holidays), [holidays]);
  const leaveMap = useMemo(() => expandLeaveDates(leaves), [leaves]);
  const presentDates = useMemo(
    () =>
      new Set(
        attendance
          .filter((a) => String(a.status || "Present").toLowerCase() === "present")
          .map((a) => a.date || a.Date)
      ),
    [attendance]
  );

  const today = new Date();
  const isToday = (d) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isWeekend = (idx) => idx % 7 === 0 || idx % 7 === 6;

  if (loading) {
    return (
      <div className="card employee-analytics-calendar" style={{ padding: 24 }}>
        <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>Loading calendar…</p>
      </div>
    );
  }

  return (
    <div className="card employee-analytics-calendar">
      <div className="card-header">
        {CALENDAR_MONTHS[month].trim()} {year}
      </div>
      <div className="analytics-calendar-legend">
        <span className="event-chip present">Present</span>
        <span className="event-chip weekend-work">Sun/Hol present</span>
        <span className="event-chip leave">Leave</span>
        <span className="event-chip holiday">Holiday</span>
      </div>
      <div className="calendar-shell analytics-calendar-shell">
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
            const holiday = cell.date ? holidayMap[cell.date] : null;
            const leave = cell.date ? leaveMap[cell.date] : null;
            const isPresent = cell.date && presentDates.has(cell.date);
            const sunHolPresent = isPresent && cell.date && isSundayOrHolidayPresent(cell.date, holidayMap);
            const presentClass = isPresent ? "present-day" : "";
            const sunHolClass = sunHolPresent ? "sun-holiday-present" : "";

            return (
              <div
                key={idx}
                className={`calendar-cell ${weekendClass} ${otherClass} ${todayClass} ${presentClass} ${sunHolClass}`}
              >
                <div className="day-number">{cell.day}</div>
                <div className="calendar-cell-events">
                  {holiday && (
                    <span className="event-chip holiday calendar-chip-desktop">{holiday}</span>
                  )}
                  {leave && (
                    <span className="event-chip leave calendar-chip-desktop">{leave}</span>
                  )}
                  {isPresent && sunHolPresent && (
                    <span className="event-chip weekend-work calendar-chip-desktop">
                      {holiday ? "Hol Present" : "Sun Present"}
                    </span>
                  )}
                  {isPresent && !sunHolPresent && (
                    <span className="event-chip present calendar-chip-desktop">Present</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
