import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";

export type ShiftKind = "day" | "night";

export interface ShiftSession {
  name: string;
  kind: ShiftKind;
  startISO: string;
  endISO: string;
  coveringFor?: string | null;
  reason?: string | null;
  verified?: boolean;
}

interface ShiftContextValue {
  session: ShiftSession | null;
  setSession: (s: ShiftSession | null) => void;
  computeWindow: (at?: Date) => { kind: ShiftKind; start: Date; end: Date };
}

const STORAGE_KEY = "hotel_shift_session";
const CHANGE_EVENT = "hotel-shift-changed";

const ShiftContext = createContext<ShiftContextValue | undefined>(undefined);

export function computeShiftWindow(at: Date = new Date()): { kind: ShiftKind; start: Date; end: Date } {
  const h = at.getHours();
  const startOfDay6 = new Date(at);
  startOfDay6.setHours(6, 0, 0, 0);
  const startOfDay18 = new Date(at);
  startOfDay18.setHours(18, 0, 0, 0);

  if (h >= 6 && h < 18) {
    return { kind: "day", start: startOfDay6, end: startOfDay18 };
  }
  if (h >= 18) {
    const end = new Date(startOfDay6);
    end.setDate(end.getDate() + 1);
    return { kind: "night", start: startOfDay18, end };
  }
  const start = new Date(startOfDay18);
  start.setDate(start.getDate() - 1);
  return { kind: "night", start, end: startOfDay6 };
}

function loadSession(): ShiftSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShiftSession;
    if (!parsed.name || !parsed.startISO || !parsed.endISO || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* ---------- Per-second tick subscription (does NOT re-render the whole tree) ---------- */

type Sub = (n: Date) => void;
const subscribers = new Set<Sub>();
let tickStarted = false;
function ensureTicker() {
  if (tickStarted || typeof window === "undefined") return;
  tickStarted = true;
  window.setInterval(() => {
    const n = new Date();
    subscribers.forEach((s) => s(n));
  }, 1000);
}

/** Subscribe to a 1Hz tick — only components that call this re-render every second. */
export function useNow(): Date {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    ensureTicker();
    subscribers.add(setNow);
    return () => {
      subscribers.delete(setNow);
    };
  }, []);
  return now;
}

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<ShiftSession | null>(() => loadSession());

  const setSession = useCallback((s: ShiftSession | null) => {
    setSessionState(s);
    if (typeof window === "undefined") return;
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reload = () => setSessionState(loadSession());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, reload as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, reload as EventListener);
    };
  }, []);

  // Stable identity except when `session` actually changes.
  const value = useMemo<ShiftContextValue>(
    () => ({ session, setSession, computeWindow: computeShiftWindow }),
    [session, setSession],
  );

  // Keep ref to silence "unused import" for useRef tree-shaking quirks.
  const _r = useRef(null);
  void _r;

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>;
}

export function useShift() {
  const ctx = useContext(ShiftContext);
  if (!ctx) throw new Error("useShift must be used within ShiftProvider");
  return ctx;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
