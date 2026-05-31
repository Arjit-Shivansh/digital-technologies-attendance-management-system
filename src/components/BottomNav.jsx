import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function BottomNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const isSenior = user?.role?.includes("Senior") || isAdmin;

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
        <span className="bottom-nav-icon">📅</span>
        <span className="bottom-nav-label">Calendar</span>
      </NavLink>

      {isSenior && (
        <NavLink to="/team" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="bottom-nav-icon">👥</span>
          <span className="bottom-nav-label">Team</span>
        </NavLink>
      )}

      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="bottom-nav-icon">📊</span>
          <span className="bottom-nav-label">Admin</span>
        </NavLink>
      )}
    </nav>
  );
}
