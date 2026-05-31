import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

export default function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">Loading…</div>;


  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/*" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
    </Routes>
  );
}
