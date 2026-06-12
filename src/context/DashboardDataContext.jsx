import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";

const DashboardDataContext = createContext(null);

export function getMonthRange(year, month) {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function DashboardDataProvider({ children }) {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(
    async (fresh = false) => {
      if (!user?.userId) return;
      setLoading(true);
      const { from, to } = getMonthRange(year, month);
      const freshSuffix = fresh ? "&fresh=1" : "";
      const freshQuery = fresh ? "?fresh=1" : "";
      const isAdmin = user.role === "Admin";

      try {
        const leavePromise = isAdmin
          ? Promise.resolve([])
          : fetch(`/api/leaves?userId=${encodeURIComponent(user.userId)}${freshSuffix}`)
              .then((r) => r.json())
              .catch(() => []);

        const attendanceUrl = isAdmin
          ? `/api/attendance?from=${from}&to=${to}${freshSuffix}`
          : `/api/attendance?userId=${encodeURIComponent(user.userId)}&from=${from}&to=${to}${freshSuffix}`;

        const usersPromise = isAdmin
          ? fetch(`/api/admin/users${freshQuery}`)
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve([]);

        const [h, l, a, u] = await Promise.all([
          fetch(`/api/holidays${freshQuery}`)
            .then((r) => r.json())
            .catch(() => []),
          leavePromise,
          fetch(attendanceUrl)
            .then((r) => r.json())
            .catch(() => []),
          usersPromise,
        ]);

        setHolidays(Array.isArray(h) ? h : []);
        setLeaves(Array.isArray(l) ? l : []);
        setAttendance(Array.isArray(a) ? a : []);
        setEmployees(
          isAdmin && Array.isArray(u)
            ? u.filter((e) => e.role !== "Admin" && e.name)
            : []
        );
      } finally {
        setLoading(false);
      }
    },
    [user?.userId, user?.role, year, month]
  );

  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  const goPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const addAttendanceRecord = useCallback((record) => {
    setAttendance((prev) => {
      if (prev.some((a) => a.userId === record.userId && a.date === record.date)) {
        return prev;
      }
      return [...prev, record];
    });
  }, []);

  const addLeaveRecord = useCallback((record) => {
    setLeaves((prev) => [...prev, record]);
  }, []);

  const value = {
    year,
    month,
    goPrevMonth,
    goNextMonth,
    holidays,
    leaves,
    attendance,
    employees,
    loading,
    refetch: fetchDashboardData,
    addAttendanceRecord,
    addLeaveRecord,
  };

  return (
    <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return ctx;
}
