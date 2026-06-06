import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const AuthContext = createContext(null);

async function fetchUserProfile(userId) {
  const res = await fetch(
    `/api/users/profile?userId=${encodeURIComponent(userId)}&fresh=1`
  );
  if (!res.ok) return null;
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const applyUser = useCallback((userData) => {
    if (!userData) return;
    localStorage.setItem("dt_attendance_user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const refreshSession = useCallback(async () => {
    const current = userRef.current;
    if (!current?.userId) return current;

    const fresh = await fetchUserProfile(current.userId);
    if (!fresh) return current;

    const next = { ...current, ...fresh };
    applyUser(next);
    return next;
  }, [applyUser]);

  /* Restore session, then refresh CanMarkAttendance (and role) from sheet */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = localStorage.getItem("dt_attendance_user");
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (cancelled) return;
        setUser(parsed);
        userRef.current = parsed;

        const fresh = await fetchUserProfile(parsed.userId);
        if (cancelled || !fresh) return;

        const next = { ...parsed, ...fresh };
        applyUser(next);
      } catch {
        localStorage.removeItem("dt_attendance_user");
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  /* Re-sync when tab becomes visible (e.g. after sheet edit) */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshSession]);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(err.error || "Login failed");
      }
      const userData = await res.json();
      applyUser(userData);
      return userData;
    },
    [applyUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("dt_attendance_user");
    setUser(null);
    userRef.current = null;
  }, []);

  const updateUser = useCallback(
    (updates) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...updates };
        localStorage.setItem("dt_attendance_user", JSON.stringify(next));
        userRef.current = next;
        return next;
      });
    },
    []
  );

  const value = { user, login, logout, updateUser, refreshSession, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
