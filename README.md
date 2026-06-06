# Digital Technologies — Leave & Attendance Dashboard

A modern Leave and Attendance Management Dashboard built with **React (Vite)** + **Vercel Serverless Functions** + **Google Sheets** as the database.

---

## Quick Start (Local Development)

```bash
git clone <repo-url> digital-technologies-attendance
cd digital-technologies-attendance
npm install
cp .env.example .env
# Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SPREADSHEET_ID
npm run dev
```

Opens at `http://localhost:3000` (Vite + `/api` via Vercel dev on port 4000).

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build (used by Vercel deploy) |

### Sheet tabs (header row required)

| Tab | Columns |
|-----|---------|
| Users | UserID, Name, Email, Password, Role, ManagerID, LeavePool, CanMarkAttendance |
| Holidays | Date, HolidayName |
| Leaves | LeaveID, UserID, FromDate, ToDate, Status, Reason |
| Attendance | AttendanceID, UserID, Date, Status, MarkedBy, Reason |
| WeekendWork | *(deprecated — optional legacy tab; weekend presence uses Attendance)* |

---

## Data flow (after optimization)

```mermaid
flowchart TB
  DDC[DashboardDataContext]
  TC[TeamDataContext]
  AD[Admin Analytics]
  BATCH[readSheetsBatch + 15s TTL cache]
  ATT["/api/attendance?userId&from&to"]
  STATS["/api/admin/stats?userId&role&managerId"]
  DDC --> ATT
  TC -->|"date=today only"| ATT
  AD --> STATS
  STATS --> BATCH
  ATT --> BATCH
```

1. **Dashboard load** — `DashboardDataContext` fetches holidays, user-scoped leaves, and month-scoped attendance in three calls (not full-tab dumps twice).
2. **Team panel** — `TeamDataContext` uses `GET /api/attendance?date=YYYY-MM-DD` for today only.
3. **Admin stats** — one `batchGet` for Users + Attendance + Leaves; filters applied in Node.
4. **Writes** — `appendRow` / `updateCell` invalidate the tab cache immediately; optional `?fresh=1` on GET forces a live read.

---

## API reference

### Cache & freshness

All GET handlers accept `?fresh=1` (or `fresh=true`) to bypass the 15-second in-memory tab cache. Use after admin **Refresh** or when verifying manual sheet edits.

| Endpoint | Query params |
|----------|----------------|
| `GET /api/attendance` | `date`, `userId`, `from`, `to`, `fresh` |
| `GET /api/leaves` | `userId`, `fresh` |
| `GET /api/leaves/summary` | `userId`, `fresh` — employee leave balance & recent requests |
| `GET /api/holidays` | `fresh` |
| `GET /api/admin/users` | `fresh` |
| `GET /api/admin/stats` | `userId`, `role`, `managerId`, `from`, `to`, `fresh` |
| `GET /api/subordinates` | `userId`, `fresh` |
| `GET /api/users/profile` | `userId`, `fresh` — refresh session fields from Users sheet |
| `PATCH /api/password` | Body: `email`, `currentPassword`, `newPassword` — updates Users sheet column **Password** |

### Login & password

- **Sign in** — `POST /api/login` with email + password (Users sheet).
- **Update password** — on the login page, **Update password** opens a form; `PATCH /api/password` verifies the current password, then writes the new value to column **D** (min 6 characters, must differ from current).

### Admin stats (`GET /api/admin/stats`)

- **Org view** (no `userId`): `totalUsers`, `periodAttendance`, `pendingLeaves`
- **Employee view** (`userId` set): adds `selectedEmployee` and `employeeStats`:
  - `presentDays`, `approvedLeaveDays`, `pendingLeaves`, `leavePool`, `leavePoolRemaining`, `sundayHolidayPresentDays`, `sundayHolidayPresentLog`, `attendanceRate`, `statsPeriod`, `attendanceRateMeta`
  - `attendanceRate` — `weekday present days ÷ working days` from **April 1** of the active Apr–Mar cycle through today (weekends & company holidays excluded from the denominator; Sunday/holiday present tracked separately)
  - `statsPeriod` — `{ from, to, isDefault, cycleLabel }`; defaults to **Apr 1 → today** within the current Apr–Mar cycle when `from`/`to` are omitted
  - `sundayHolidayPresentLog`: table rows `{ date, type, label, reason, markedBy }` — **Holiday** type when Sunday and holiday overlap
  - Per-employee queries bypass sheet cache so **Leave Pool** reflects Sunday/holiday +1 bonuses immediately

Filters: `role`, `managerId`, `from`, `to` narrow the user set and date range.

---

## UI behavior

### Team attendance marking

| Role | Who they can mark | Which dates |
|------|-------------------|-------------|
| **Admin** | Any **non-admin** employee (not self, not other admins) | **Any date** via date picker in Mark Present modal |
| **Senior** | Direct reports (+ self if `CanMarkAttendance`) | **Today only** |
| **Employee** | No access to Team Attendance | — |

**Team Attendance** is hidden in the sidebar, mobile menu, and bottom nav when **CanMarkAttendance** is `FALSE` (Senior/Admin only; plain Employees never see this section). Calendar self-marking on a day also requires `CanMarkAttendance`. The app refreshes `CanMarkAttendance` from the Users sheet on load and when the browser tab becomes visible (`GET /api/users/profile?fresh=1`).

`POST /api/attendance` enforces permissions server-side (`403` if not allowed). Sunday/holiday **+1 leave pool** applies for any date marked present, including admin backdates.

### Weekend attendance

There is **no** weekend work hours panel. Saturday/Sunday presence is recorded with **Mark Present** (Team Attendance or calendar day sheet), same as weekdays.

### Sunday & holiday leave bonus

When attendance is marked **Present on a Sunday** or on a **company holiday** (dates in the Holidays sheet), the employee’s **LeavePool** is automatically **incremented by +1**. If a holiday falls on a **Sunday**, only **one** +1 is applied (not two). Duplicate marks for the same user and date are rejected (`409`).

### Employee leave balance

The calendar page shows a **Your Leave Balance** panel with pool, used, remaining, and pending requests. Data comes from `GET /api/leaves/summary?userId=...`.

**Admin accounts** are not on the employee leave program: no balance panel, no **Apply for Leave** on the calendar, and `POST /api/leaves` / leave summary return `403` for admin user IDs.

Each leave request is limited to **5 days** inclusive (`fromDate` → `toDate`). The apply-leave form caps the **To** picker and the API returns `400` if the range exceeds 5 days.

### Attendance reason

When marking present (calendar day sheet or team panel), an optional **Reason** field can be entered before submit. The value is stored in the Attendance sheet column **Reason** (column F) and returned by `GET /api/attendance`. If a day is already marked present, the day sheet shows the saved reason when available.

### Calendar present-day styling

- Cells use class `present-day` → green background (`--color-success-light`) with inset border.
- `weekend-cell.present-day` overrides gray weekend background with green.

### Mobile layout (≤768px)

- Viewport meta: `width=device-width`, `viewport-fit=cover`, `interactive-widget=resizes-content` (keyboard/toolbars resize content instead of overlapping).
- Full-height layouts use **`100dvh`** (with `100vh` fallback) so the address bar does not jump the UI.
- Sidebar hidden; **bottom nav** (Calendar / Team / Admin).
- Sticky **mobile top bar** with month navigation on the calendar route.
- Compact month grid with **dots** under day numbers; tap opens **day detail bottom sheet** (Mark Present when allowed).
- Team table becomes **stacked employee cards**; **Mark Present** opens a **bottom sheet** with full-width actions and date picker (admin).

### Desktop (≥769px)

- 256px sidebar + full month grid with event chips.
- Day tap opens centered day sheet.

---

## Project structure

```
api/
  _lib/sheets.js       # batchGet, TTL cache, findRow(rows?)
  admin/stats.js       # Per-employee analytics
  attendance.js        # Scoped GET filters
  leaves.js
src/
  context/
    DashboardDataContext.jsx
    TeamDataContext.jsx
  components/
    CalendarView.jsx
    DayDetailSheet.jsx
    BottomNav.jsx
    AdminDashboard.jsx
    admin/AdminSkeletons.jsx   # Tab-specific skeleton loaders
    AttendancePanel.jsx
  pages/DashboardPage.jsx
scripts/smoke-sheets.mjs
```

---

## Smoke tests

```bash
node scripts/smoke-sheets.mjs
```

Tests cache invalidation and `findRow(rows)` without credentials. With `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SPREADSHEET_ID` set, also verifies `readSheetsBatch` row counts and cache/fresh behavior.

---

## Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Analytics (per-employee filters), holidays, leave approvals, user permissions — **no personal leave balance or apply-leave** on calendar |
| **Senior** | Mark team attendance (including weekends), apply for leave |
| **Employee** | Calendar, apply for leave |

`CanMarkAttendance` controls self **Mark Present** on the calendar day sheet.

---

## Deploy

Push to GitHub → import on Vercel → set `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_SPREADSHEET_ID`.

**Vercel Hobby limit:** max **12** Serverless Functions per deployment. Related routes are grouped into dynamic handlers (`api/users/[action].js`, `api/admin/[action].js`, `api/leaves/[action].js`) so the project deploys **9** functions total. API URLs are unchanged (`/api/admin/stats`, `/api/users/profile`, etc.).
