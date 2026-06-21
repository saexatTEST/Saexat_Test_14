import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Automatically signs the current user out at the shift change times (08:00 and 18:00 local time).
 * Mounted once at the application root.
 */
export function ShiftWatcher() {
  const { user, logout } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;

    const scheduleNext = () => {
      const now = new Date();
      // Day shift: 06:00 → 18:00, Night shift: 18:00 → 06:00 next day.
      // When the timer hits zero (the current shift boundary), the user is logged out automatically.
      const candidates = [6, 18].map((h) => {
        const d = new Date(now);
        d.setHours(h, 0, 0, 0);
        if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
        return d.getTime();
      });
      const nextAt = Math.min(...candidates);
      const delay = Math.max(1000, nextAt - now.getTime());
      timerRef.current = setTimeout(() => {
        logout();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [user, logout]);

  return null;
}
