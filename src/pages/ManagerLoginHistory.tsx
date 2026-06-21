import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  LogIn,
  LogOut,
  Search,
  User as UserIcon,
  ChevronDown,
  Activity,
  Eye,
  Plus,
  Trash,
  Pencil,
  RefreshCcw,
  CheckCircle2,
  AtSign,
  IdCard,
  Fingerprint,
  Clock,
} from "lucide-react";
import { useAuth, type LoginEvent } from "@/contexts/AuthContext";
import { useAudit, type AuditEvent } from "@/contexts/AuditContext";
import { useAdmins } from "@/contexts/AdminsContext";
import { humanizeAudit } from "@/lib/auditFormat";

/**
 * ManagerLoginHistory — read-only view of the admin login history,
 * shown only inside the Manager workspace. Strictly scoped to events
 * where the actor role is `admin`. No clear button, no destructive
 * actions, no role/scope toggles (those exist only on the Superuser
 * panel).
 */
export default function ManagerLoginHistory() {
  const { history } = useAuth();
  const { events: auditEvents } = useAudit();
  const { admins } = useAdmins();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "login" | "logout">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleHistory = useMemo(() => {
    return history.filter((e) => {
      if (e.role !== "admin") return false;
      if (filter !== "all" && e.action !== filter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        e.username.toLowerCase().includes(q) ||
        (e.displayName ?? "").toLowerCase().includes(q)
      );
    });
  }, [history, query, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, LoginEvent[]>();
    for (const e of visibleHistory) {
      const day = new Date(e.at).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    }
    return Array.from(map.entries());
  }, [visibleHistory]);

  // Admin-only audit events for the expanded panel
  const adminAuditEvents = useMemo(
    () => auditEvents.filter((a) => a.actor.role === "admin"),
    [auditEvents],
  );

  return (
    <div className="w-full px-4 sm:px-8 py-8 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[hsl(265_85%_55%)] text-xs font-bold tracking-widest uppercase">
            <History className="h-3.5 w-3.5" />
            Activity log
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-foreground">
            Admin login history
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            Read-only view of sign-in / sign-out events and documented actions for administrators only.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <Eye className="h-3 w-3" /> Read-only
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 28))}
            placeholder="Filter by name or username…"
            maxLength={28}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 p-1 text-xs font-bold">
          {(["all", "login", "logout"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 transition ${
                filter === f
                  ? "bg-[hsl(265_85%_55%)] text-white shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {f === "all" ? "All" : f === "login" ? "Logins" : "Logouts"}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 py-14 text-center">
          <History className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No admin activity yet</p>
          <p className="mt-1 text-xs text-slate-500">
            When administrators sign in, their sessions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {grouped.map(([day, events]) => (
            <section key={day}>
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase">{day}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[11px] font-bold text-slate-400">
                  {events.length} event{events.length === 1 ? "" : "s"}
                </span>
              </div>
              <ol className="relative border-l-2 border-slate-200 ml-3 space-y-3">
                {events.map((e) => {
                  const isIn = e.action === "login";
                  const isOpen = expanded === e.id;
                  return (
                    <li key={e.id} className="ml-5 relative">
                      <span
                        className={`absolute -left-[34px] top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow ${
                          isIn ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        {isIn ? (
                          <LogIn className="h-3 w-3 text-white" />
                        ) : (
                          <LogOut className="h-3 w-3 text-white" />
                        )}
                      </span>
                      <button
                        onClick={() => setExpanded(isOpen ? null : e.id)}
                        className="w-full text-left rounded-xl bg-white border border-slate-200 px-4 py-3 shadow-sm hover:shadow-md hover:border-[hsl(265_85%_55%)]/40 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {e.displayName || e.username}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 border-sky-200">
                              <UserIcon className="h-3 w-3" />
                              admin
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {isIn ? "Signed in" : "Signed out"} at{" "}
                            {new Date(e.at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-700 tabular-nums">
                              {new Date(e.at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {new Date(e.at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="details"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <AdminDetails
                              event={e}
                              admins={admins}
                              auditEvents={adminAuditEvents}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

const CATEGORY_META: Record<AuditEvent["category"], { label: string; color: string }> = {
  auth: { label: "Auth", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  booking: { label: "Booking", color: "bg-sky-50 text-sky-700 border-sky-200" },
  admin: { label: "Admin", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  shift: { label: "Shift", color: "bg-amber-50 text-amber-700 border-amber-200" },
  form: { label: "Form", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  system: { label: "System", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function actionIcon(action: string) {
  if (action.endsWith(".created")) return Plus;
  if (action.endsWith(".deleted")) return Trash;
  if (action.endsWith(".updated")) return Pencil;
  if (action.endsWith(".login")) return LogIn;
  if (action.endsWith(".logout")) return LogOut;
  if (action.startsWith("shift")) return RefreshCcw;
  return CheckCircle2;
}

function AdminDetails({
  event,
  admins,
  auditEvents,
}: {
  event: LoginEvent;
  admins: ReturnType<typeof useAdmins>["admins"];
  auditEvents: AuditEvent[];
}) {
  const admin = event.adminId ? admins.find((a) => a.id === event.adminId) : undefined;
  const userActions = useMemo(() => {
    return auditEvents
      .filter((a) => {
        if (event.adminId) return a.actor.adminId === event.adminId;
        return a.actor.username === event.username && a.actor.role === event.role;
      })
      .slice(0, 200);
  }, [auditEvents, event]);

  return (
    <div className="mt-2 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-4 sm:p-5 shadow-inner">
      <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(265_85%_60%)] to-[hsl(280_85%_55%)] text-white shadow-md shadow-purple-500/30">
              <UserIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-900 truncate">
                {event.displayName || event.username}
              </div>
              <div className="text-[11px] font-medium text-slate-500 capitalize">{event.role}</div>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-xs">
            <Detail icon={AtSign} label="Username" value={event.username} />
            {admin?.idNumber && <Detail icon={IdCard} label="ID number" value={admin.idNumber} />}
            {admin?.fingerprintId && (
              <Detail icon={Fingerprint} label="Fingerprint" value={admin.fingerprintId} mono />
            )}
            {admin?.createdAt && (
              <Detail
                icon={Clock}
                label="Registered"
                value={new Date(admin.createdAt).toLocaleString()}
              />
            )}
            <Detail icon={Activity} label="Total actions" value={String(userActions.length)} />
          </dl>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            <Activity className="h-3.5 w-3.5" />
            Documented actions
          </div>
          {userActions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-xs text-slate-500">
              No actions recorded yet for this administrator.
            </div>
          ) : (
            <ol className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {userActions.map((a) => {
                const meta = CATEGORY_META[a.category];
                const Icon = actionIcon(a.action);
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">{a.action}</span>
                      </div>
                      <ul className="mt-0.5 space-y-0.5 text-xs leading-relaxed text-slate-700">
                        {humanizeAudit(a).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 tabular-nums whitespace-nowrap">
                      {new Date(a.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                      <div>
                        {new Date(a.at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
        <dd className={`text-xs text-slate-800 truncate ${mono ? "font-mono" : "font-medium"}`}>
          {value}
        </dd>
      </div>
    </div>
  );
}
