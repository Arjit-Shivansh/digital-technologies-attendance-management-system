import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DayDetailSheet({
  open,
  date,
  holidayName,
  leaveStatus,
  isPresent,
  attendanceReason,
  onClose,
  onMarkPresent,
}) {
  const { user } = useAuth();
  const [marking, setMarking] = useState(false);
  const [reason, setReason] = useState('');
  const canMark = user?.canMarkAttendance;
  const formatted = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !onMarkPresent) return;
    setMarking(true);
    try {
      await onMarkPresent(date, reason.trim());
      setReason('');
    } finally {
      setMarking(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`day-sheet-overlay ${open ? 'open' : ''}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="day-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="day-sheet-handle" />
        <div className="day-sheet-header">
          <h3>{formatted}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="day-sheet-body">
          {holidayName && (
            <div className="day-sheet-row">
              <span className="event-chip holiday">{holidayName}</span>
            </div>
          )}
          {leaveStatus && (
            <div className="day-sheet-row">
              <span className="event-chip leave">Leave: {leaveStatus}</span>
            </div>
          )}
          {isPresent ? (
            <>
              <div className="day-sheet-row">
                <span className="event-chip present">Present</span>
              </div>
              {attendanceReason && (
                <div className="day-sheet-row day-sheet-reason">
                  <span className="day-sheet-reason-label">Reason</span>
                  <p>{attendanceReason}</p>
                </div>
              )}
            </>
          ) : (
            <p className="day-sheet-empty">Not marked present</p>
          )}
          {canMark && !isPresent && date && (
            <form className="day-sheet-actions" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="attendance-reason">Reason (optional)</label>
                <textarea
                  id="attendance-reason"
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Working from client site"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={marking}
              >
                {marking ? 'Marking…' : 'Mark Present'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
