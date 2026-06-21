import { motion } from "framer-motion";
import { Sun, Moon, Timer, UserCheck, UserX, UserCog } from "lucide-react";
import { useMemo } from "react";
import { useShift, useNow, formatRemaining, computeShiftWindow } from "@/contexts/ShiftContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmins } from "@/contexts/AdminsContext";

/**
 * Visual shift status card shown on the Director dashboard alongside the
 * other diagrams.
 *
 * Source of truth for "who is on shift right now":
 *   1. The auth login history — find the most recent admin login event
 *      that has no logout event after it. Display name is resolved from the
 *      AdminsContext registry (managers panel registration) so the admin's
 *      registered display name appears whenever they are signed in.
 *   2. Fallback: the ShiftContext session (manually opened shift).
 */
export function DirectorShiftPanel() {
  const { session } = useShift();
  const { history } = useAuth();
  const { admins } = useAdmins();
  const now = useNow();

  // Derive "currently signed-in admin" from the auth history.
  const liveAdmin = useMemo(() => {
    // History is stored newest-first.
    const seen = new Set<string>();
    for (const ev of history) {
      const key = ev.username.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (ev.action === "login" && ev.role === "admin") {
        const record = admins.find((a) => a.username.toLowerCase() === key);
        const displayName = record
          ? `${record.name} ${record.surname}`.trim() || record.username
          : ev.displayName || ev.username;
        return { displayName, at: ev.at };
      }
    }
    return null;
  }, [history, admins]);

  // Build an effective session — prefer the real signed-in admin, then fall back to manual session.
  const effective = useMemo(() => {
    if (liveAdmin) {
      const win = computeShiftWindow(now);
      return {
        name: liveAdmin.displayName,
        kind: win.kind,
        startISO: win.start.toISOString(),
        endISO: win.end.toISOString(),
        coveringFor: null as string | null,
        reason: null as string | null,
      };
    }
    return session;
  }, [liveAdmin, session, now]);

  const remaining = useMemo(() => {
    if (!effective) return 0;
    return new Date(effective.endISO).getTime() - now.getTime();
  }, [effective, now]);

  const elapsedPct = useMemo(() => {
    if (!effective) return 0;
    const start = new Date(effective.startISO).getTime();
    const end = new Date(effective.endISO).getTime();
    const total = end - start;
    if (total <= 0) return 0;
    const elapsed = Math.min(total, Math.max(0, now.getTime() - start));
    return Math.round((elapsed / total) * 100);
  }, [effective, now]);

  const isDay = effective?.kind === "day";
  const ShiftIcon = isDay ? Sun : Moon;
  const isSubstitute = !!effective?.coveringFor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div
        className={`px-5 py-4 flex items-center justify-between border-b border-border ${
          effective
            ? isDay
              ? "bg-gradient-to-r from-amber-50 to-amber-100/60"
              : "bg-gradient-to-r from-indigo-50 to-indigo-100/60"
            : "bg-muted/40"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              effective
                ? isDay
                  ? "bg-amber-200/70 text-amber-700"
                  : "bg-indigo-200/70 text-indigo-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {effective ? <ShiftIcon className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Текущая смена
            </p>
            <h3 className="font-display text-lg font-black tracking-tight text-foreground">
              {effective ? (isDay ? "Дневная смена" : "Ночная смена") : "Никого нет на смене"}
            </h3>
          </div>
        </div>
        {effective && (
          <div className="text-right">
            <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Окно</p>
            <p className="text-sm font-bold tabular-nums">
              {isDay ? "06:00 → 18:00" : "18:00 → 06:00"}
            </p>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {effective ? (
          <>
            {isSubstitute && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <UserCog className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-800">
                    Substitute — covering for{" "}
                    <span className="font-black">{effective.coveringFor}</span>
                  </p>
                  {effective.reason && (
                    <p className="mt-0.5 text-[11px] text-amber-700 italic break-words">
                      Reason: {effective.reason}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label={isSubstitute ? "Substitute" : "На смене"}
                value={effective.name}
                Icon={UserCheck}
                tone="hsl(142 71% 45%)"
              />
              <Stat
                label="Осталось"
                value={formatRemaining(remaining)}
                Icon={Timer}
                tone={isDay ? "hsl(38 92% 50%)" : "hsl(245 70% 55%)"}
                mono
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Прогресс смены
                </span>
                <span className="text-xs font-bold tabular-nums">{elapsedPct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${elapsedPct}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${
                    isDay
                      ? "bg-gradient-to-r from-amber-400 to-orange-400"
                      : "bg-gradient-to-r from-indigo-400 to-violet-500"
                  }`}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Администратор ещё не открыл смену. Когда администратор войдёт в систему и начнёт смену, имя сменщика и таймер появятся здесь автоматически.
          </p>
        )}
      </div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  Icon,
  tone,
  mono,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <p className={`text-base font-black text-foreground truncate ${mono ? "tabular-nums" : ""}`}>
        {value}
      </p>
    </div>
  );
}
