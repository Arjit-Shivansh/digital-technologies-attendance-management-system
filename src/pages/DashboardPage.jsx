import { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DashboardDataProvider, useDashboardData } from "../context/DashboardDataContext";
import CalendarView from "../components/CalendarView";
import AttendancePanel from "../components/AttendancePanel";
import AdminDashboard from "../components/AdminDashboard";
import BottomNav from "../components/BottomNav";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function MobileMenuDrawer({ open, onClose }) {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isSenior = user?.role?.includes("Senior") || isAdmin;

  const initials = (user?.name || "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleNavClick = () => onClose();

  const handleSignOut = () => {
    onClose();
    logout();
  };

  return (
    <>
      <div
        className={`mobile-menu-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`mobile-menu-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="mobile-menu-drawer-header">
          <h2>DT Attendance</h2>
          <span>Leave &amp; Attendance</span>
        </div>

        <nav className="mobile-menu-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
            <span className="nav-icon">📅</span>
            <span>Calendar</span>
          </NavLink>

          {isSenior && (
            <NavLink to="/team" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
              <span className="nav-icon">👥</span>
              <span>Team Attendance</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")} onClick={handleNavClick}>
              <span className="nav-icon">📊</span>
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        <div className="mobile-menu-drawer-footer">
          <div className="mobile-menu-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="mobile-menu-user-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function MobileTopBar({ onMenuToggle, title, showMonthNav }) {
  const { year, month, goPrevMonth, goNextMonth } = useDashboardData();

  return (
    <header className="mobile-top-bar">
      <button type="button" className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Open menu">
        ☰
      </button>
      <div className="mobile-top-bar-center">
        {showMonthNav ? (
          <>
            <button type="button" className="mobile-nav-arrow" onClick={goPrevMonth} aria-label="Previous month">
              &larr;
            </button>
            <span className="mobile-month-label">
              {MONTHS[month]} {year}
            </span>
            <button type="button" className="mobile-nav-arrow" onClick={goNextMonth} aria-label="Next month">
              &rarr;
            </button>
          </>
        ) : (
          <span className="mobile-page-title">{title}</span>
        )}
      </div>
      <div className="mobile-top-bar-spacer" />
    </header>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCalendarRoute = location.pathname === "/" || location.pathname === "";
  const isTeamRoute = location.pathname === "/team";
  const isAdminRoute = location.pathname === "/admin";
  const isAdmin = user?.role === "Admin";
  const isSenior = user?.role?.includes("Senior") || isAdmin;

  const mobileTitle = isTeamRoute
    ? "Team Attendance"
    : isAdminRoute
      ? "Admin Panel"
      : "Calendar";

  const initials = (user?.name || "??")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>DT Attendance</h1>
          <span>Leave & Attendance</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            <span className="nav-icon">📅</span>
            <span>Calendar</span>
          </NavLink>

          {isSenior && (
            <NavLink to="/team" className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="nav-icon">👥</span>
              <span>Team Attendance</span>
            </NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="nav-icon">📊</span>
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-workspace">
        <MobileTopBar
          onMenuToggle={() => setMenuOpen((v) => !v)}
          title={mobileTitle}
          showMonthNav={isCalendarRoute}
        />
        <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

        <Routes>
          <Route path="/" element={<CalendarView />} />
          {isSenior && <Route path="/team" element={<AttendancePanel />} />}
          {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
        </Routes>

        <BottomNav />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardDataProvider>
      <DashboardLayout />
    </DashboardDataProvider>
  );
}
