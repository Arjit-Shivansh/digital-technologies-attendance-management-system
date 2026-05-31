import { useState } from "react";
import {
  MAX_LEAVE_DAYS,
  addDays,
  countDaysBetween,
  validateLeaveDateRange,
} from "../lib/leaveDays.js";

export default function LeaveModal({ open, userId, onClose, onSuccess }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const maxToDate = from ? addDays(from, MAX_LEAVE_DAYS - 1) : undefined;
  const selectedDays = from && to ? countDaysBetween(from, to) : 0;

  const handleFromChange = (value) => {
    setFrom(value);
    if (to && value && to < value) setTo(value);
    if (to && value && countDaysBetween(value, to) > MAX_LEAVE_DAYS) {
      setTo(addDays(value, MAX_LEAVE_DAYS - 1));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rangeError = validateLeaveDateRange(from, to);
    if (rangeError) {
      setError(rangeError);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fromDate: from, toDate: to, reason: reason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to apply");
      }
      const record = await res.json();
      onSuccess?.(record);
      setFrom("");
      setTo("");
      setReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${open ? "open" : ""}`}>
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Apply for Leave</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}
            <div className="form-group">
              <label htmlFor="leave-from-date">From Date</label>
              <input
                id="leave-from-date"
                className="form-input"
                type="date"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="leave-to-date">To Date</label>
              <input
                id="leave-to-date"
                className="form-input"
                type="date"
                value={to}
                min={from || undefined}
                max={maxToDate}
                onChange={(e) => setTo(e.target.value)}
                required
                disabled={!from}
              />
              <p className="form-hint">
                Maximum {MAX_LEAVE_DAYS} days per request
                {selectedDays > 0 ? ` · selected: ${selectedDays} day${selectedDays !== 1 ? "s" : ""}` : ""}
              </p>
            </div>
            <div className="form-group">
              <label htmlFor="leave-reason">Reason</label>
              <textarea
                id="leave-reason"
                className="form-input"
                rows={3}
                placeholder="Optional — e.g. family event, medical appointment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="modal-footer" style={{ padding: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !from || !to}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
