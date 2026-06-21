import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { useAdmins } from "./AdminsContext";
import { useAudit } from "./AuditContext";

export type UserRole = "superuser" | "director" | "admin" | "manager";

interface AuthUser {
  username: string;
  role: UserRole;
  canSwitchWorkspaces?: boolean;
  /** Set when an admin signs in via the registry — links every action to the AdminRecord. */
  adminId?: string | null;
  /** Display name (e.g. "Akmal Karimov"). Falls back to username. */
  displayName?: string;
}

export interface LoginEvent {
  id: string;
  username: string;
  role: UserRole;
  action: "login" | "logout";
  at: string;
  adminId?: string | null;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => { ok: true; role: UserRole } | { ok: false; error: string };
  switchRole: (role: UserRole) => void;
  logout: () => void;
  history: LoginEvent[];
  clearHistory: () => void;
}

const STORAGE_KEY = "hotel_auth_user";
const HISTORY_KEY = "hotel_auth_history";
const HISTORY_EVENT = "hotel-auth-history-changed";

/** Built-in master credentials. Admins use their per-record username/password. */
const CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  superuser: { password: "superuser", role: "superuser" },
  director: { password: "director", role: "director" },
  admin: { password: "admin", role: "admin" },
  manager: { password: "manager", role: "manager" },
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadHistory(): LoginEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as LoginEvent[]) : [];
  } catch {
    return [];
  }
}

function pushHistory(ev: Omit<LoginEvent, "id">) {
  if (typeof window === "undefined") return;
  const list = loadHistory();
  list.unshift({ ...ev, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  const capped = list.slice(0, 500);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(capped));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { findByUsername } = useAdmins();
  const { log } = useAudit();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [history, setHistory] = useState<LoginEvent[]>(() => loadHistory());

  useEffect(() => {
    try {
      // Session-only persistence: closing the tab clears the session so the user must re-enter credentials.
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as AuthUser) : null;
      setUser(parsed ? { ...parsed, canSwitchWorkspaces: parsed.canSwitchWorkspaces || parsed.username === "superuser" } : null);
      // Clean up any legacy persisted session from localStorage.
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // Auto-logout when the browser/tab is closed: record a logout history
  // entry for the currently signed-in user and clear their session.
  // `pagehide` fires reliably on tab/window close in all modern browsers.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if (!user) return;
      try {
        pushHistory({
          username: user.username,
          role: user.role,
          action: "logout",
          at: new Date().toISOString(),
          adminId: user.adminId,
          displayName: user.displayName,
        });
      } catch { /* ignore */ }
      try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    };
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setHistory(loadHistory());
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(HISTORY_EVENT, refresh as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(HISTORY_EVENT, refresh as EventListener);
    };
  }, []);

  const login: AuthContextValue["login"] = useCallback(
    (username, password) => {
      const u = username.trim().toLowerCase();

      // 1) Try a registered admin first.
      const admin = findByUsername(u);
      if (admin && admin.password === password) {
        const next: AuthUser = {
          username: admin.username,
          role: "admin",
          adminId: admin.id,
          displayName: `${admin.name} ${admin.surname}`.trim(),
        };
        setUser(next);
        const at = new Date().toISOString();
        pushHistory({ username: next.username, role: "admin", action: "login", at, adminId: admin.id, displayName: next.displayName });
        setHistory(loadHistory());
        log({
          actor: { username: next.username, role: "admin", adminId: admin.id },
          category: "auth",
          action: "auth.login",
          summary: `${next.displayName} signed in`,
        });
        return { ok: true, role: "admin" };
      }

      // 2) Built-in master credentials.
      const entry = CREDENTIALS[u];
      if (!entry || entry.password !== password) {
        return { ok: false, error: "Invalid username or password" };
      }
      const next: AuthUser = { username: u, role: entry.role, displayName: u, canSwitchWorkspaces: entry.role === "superuser" };
      setUser(next);
      const at = new Date().toISOString();
      pushHistory({ username: u, role: entry.role, action: "login", at, displayName: u });
      setHistory(loadHistory());
      log({
        actor: { username: u, role: entry.role },
        category: "auth",
        action: "auth.login",
        summary: `${u} signed in`,
      });
      return { ok: true, role: entry.role };
    },
    [findByUsername, log],
  );

  const logout = useCallback(() => {
    if (user) {
      const at = new Date().toISOString();
      pushHistory({
        username: user.username,
        role: user.role,
        action: "logout",
        at,
        adminId: user.adminId,
        displayName: user.displayName,
      });
      setHistory(loadHistory());
      log({
        actor: { username: user.username, role: user.role, adminId: user.adminId },
        category: "auth",
        action: "auth.logout",
        summary: `${user.displayName ?? user.username} signed out`,
      });
    }
    setUser(null);
  }, [user, log]);

  const switchRole = useCallback((role: UserRole) => {
    if (!user?.canSwitchWorkspaces) return;
    const next: AuthUser = { username: user.username, role, displayName: role, canSwitchWorkspaces: true };
    setUser(next);
    log({
      actor: { username: user.username, role: user.role, adminId: user.adminId },
      category: "auth",
      action: "auth.role_switch",
      summary: `Switched workspace to ${role}`,
    });
  }, [user, log]);

  const clearHistory = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(HISTORY_KEY);
    window.dispatchEvent(new Event(HISTORY_EVENT));
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, switchRole, logout, history, clearHistory }),
    [user, ready, login, switchRole, logout, history, clearHistory],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const ROLE_HOME = {
  superuser: "/superuser",
  director: "/director",
  admin: "/admin",
  manager: "/manager",
} as const satisfies Record<UserRole, string>;
