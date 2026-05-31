import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const TeamDataContext = createContext(null);

export function TeamDataProvider({ children }) {
  const { user } = useAuth();
  const [subordinates, setSubordinates] = useState([]);
  const [presentToday, setPresentToday] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const fetchSubordinates = useCallback(
    (fresh = false) => {
      if (!user?.userId) return Promise.resolve();
      const freshParam = fresh ? "&fresh=1" : "";
      return fetch(`/api/subordinates?userId=${encodeURIComponent(user.userId)}${freshParam}`)
        .then((r) => r.json())
        .then(setSubordinates)
        .catch(() => setSubordinates([]));
    },
    [user?.userId]
  );

  const fetchTodayAttendance = useCallback((fresh = false) => {
    const today = new Date().toISOString().slice(0, 10);
    const freshParam = fresh ? "&fresh=1" : "";
    return fetch(`/api/attendance?date=${today}${freshParam}`)
      .then((r) => r.json())
      .then((rows) => {
        const ids = new Set(rows.map((a) => a.userId));
        setPresentToday(ids);
      })
      .catch(() => setPresentToday(new Set()));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchSubordinates(), fetchTodayAttendance()]).finally(() => setLoading(false));
  }, [user, fetchSubordinates, fetchTodayAttendance]);

  const value = {
    subordinates,
    presentToday,
    loading,
    refetchSubordinates: fetchSubordinates,
    setPresentToday,
    refetchAttendance: fetchTodayAttendance,
  };

  return <TeamDataContext.Provider value={value}>{children}</TeamDataContext.Provider>;
}

export function useTeamData() {
  const ctx = useContext(TeamDataContext);
  if (!ctx) throw new Error("useTeamData must be used within TeamDataProvider");
  return ctx;
}
