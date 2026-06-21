import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronUp,
  Clock3,
  DollarSign,
  Gauge,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Maximize2,
  Minimize2,
  Percent,
  Sparkles,
  TrendingUp,
  UserPlus,
  History,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addDays,
  differenceInDays,
  format,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { HotelNavbar } from "@/components/hotel/HotelNavbar";
import { useBookingsContext } from "@/hooks/BookingsContext";
import { useHotelGrid } from "@/hooks/HotelGridContext";
import {
  BOOKING_STATUSES,
  type Booking,
  type BookingStatus,
} from "@/types/hotel";
import { HotelDashboardBody } from "@/pages/Index";
import SuperuserAdmins from "@/pages/SuperuserAdmins";
import ManagerLoginHistory from "@/pages/ManagerLoginHistory";

const ACTIVE_STATUSES: BookingStatus[] = ["in-house", "booked", "confirmed", "pending"];

const RATE_BY_CATEGORY: Record<string, import("@/hooks/HotelGridContext").CategoryRate> = {
  "standard-double": { resident: [40, 40], nonResident: [40, 40] },
  "standard-twin": { resident: [40, 40], nonResident: [40, 40] },
  "standard-triple": { resident: [37, 37, 36], nonResident: [37, 37, 36] },
  "standard-quadruple": { resident: [35, 35, 35, 35], nonResident: [35, 35, 35, 35] },
  "deluxe-double": { resident: [90, 90], nonResident: [90, 90] },
  "deluxe-twin": { resident: [90, 90], nonResident: [90, 90] },
};

type ManagerView = "workspace" | "analytics" | "admin-registration" | "login-history";
type RangeKey = "7d" | "14d" | "30d";

const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "7 дней",
  "14d": "14 дней",
  "30d": "30 дней",
};

function nightsOf(b: Booking) {
  return Math.max(
    1,
    differenceInDays(parseISO(b.checkOut), parseISO(b.checkIn)) +
      (b.checkInHalfDay ? 0.5 : 0) +
      (b.checkOutHalfDay ? 0.5 : 0),
  );
}

function isActiveOn(b: Booking, day: Date) {
  if (!ACTIVE_STATUSES.includes(b.status)) return false;
  const inD = startOfDay(parseISO(b.checkIn));
  const outD = startOfDay(parseISO(b.checkOut));
  return day >= inD && day <= outD;
}

function bookingRevenue(
  b: Booking,
  categoryId: string | undefined,
  rates: Record<string, import("@/hooks/HotelGridContext").CategoryRate>,
) {
  if (typeof b.price === "number" && Number.isFinite(b.price)) return b.price;
  if (!categoryId) return 0;
  const r = rates[categoryId] ?? RATE_BY_CATEGORY[categoryId];
  const arr = (r?.resident ?? []) as number[];
  if (arr.length === 0) return 0;
  const guests = Math.max(1, Number(b.guestCount) || 1);
  const maxG = arr.length;
  const within = Math.min(guests, maxG);
  const base = Number(arr[within - 1]) || 0;
  const extras = Math.max(0, guests - maxG);
  const extraRate = Number(arr[0]) || 0;
  const perNight = base + extras * extraRate;
  return nightsOf(b) * perNight;
}

function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export default function Manager() {
  const [view, setView] = useState<ManagerView>("workspace");
  const [range, setRange] = useState<RangeKey>("14d");
  const [workspaceViewMode, setWorkspaceViewMode] = useState<"tiles" | "timeline">("timeline");
  const { bookings, addBooking, removeBooking, updateBooking } = useBookingsContext();
  const { categories, rooms, categoryRates } = useHotelGrid();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ to?: string }>).detail;
      if (!detail || detail.to === "/manager") {
        setView("workspace");
        setWorkspaceViewMode("timeline");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };
    window.addEventListener("workspace:reset", handler);
    return () => window.removeEventListener("workspace:reset", handler);
  }, []);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const totalRooms = rooms.length || 1;
    const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;

    const occupiedRoomNumbers = new Set(
      bookings.filter((b) => isActiveOn(b, today)).map((b) => b.roomNumber),
    );
    const occupiedNow = occupiedRoomNumbers.size;
    const occupancyPct = Math.round((occupiedNow / totalRooms) * 100);

    const trend = Array.from({ length: days }).map((_, i) => {
      const day = addDays(subDays(today, days - 1), i);
      const dayBookings = bookings.filter((b) => isActiveOn(b, day));
      const dayRooms = new Set(dayBookings.map((b) => b.roomNumber));
      const dayRevenue = dayBookings.reduce((acc, b) => {
        const room = rooms.find((r) => r.number === b.roomNumber);
        const perNight = bookingRevenue(b, room?.category, categoryRates) / nightsOf(b);
        return acc + perNight;
      }, 0);
      return {
        date: format(day, "dd.MM"),
        occupied: dayRooms.size,
        occupancy: Math.round((dayRooms.size / totalRooms) * 100),
        bookings: dayBookings.length,
        revenue: Math.round(dayRevenue),
      };
    });

    const totalRevenue = bookings.reduce((acc, b) => {
      const room = rooms.find((r) => r.number === b.roomNumber);
      if (b.status === "maintenance") return acc;
      return acc + bookingRevenue(b, room?.category, categoryRates);
    }, 0);

    const dayRevenue = trend[trend.length - 1]?.revenue ?? 0;
    const prevDayRevenue = trend[trend.length - 2]?.revenue ?? 0;
    const weekRevenue = trend.slice(-7).reduce((a, b) => a + b.revenue, 0);
    const prevWeekRevenue = trend.slice(-14, -7).reduce((a, b) => a + b.revenue, 0);
    const monthRevenue = trend.reduce((a, b) => a + b.revenue, 0);

    const revenueGrowth = prevWeekRevenue
      ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
      : 0;
    const dailyGrowth = prevDayRevenue
      ? Math.round(((dayRevenue - prevDayRevenue) / prevDayRevenue) * 100)
      : 0;

    const statusCounts = (Object.keys(BOOKING_STATUSES) as BookingStatus[]).reduce(
      (acc, s) => {
        acc[s] = bookings.filter((b) => b.status === s).length;
        return acc;
      },
      {} as Record<BookingStatus, number>,
    );

    const upcoming = bookings.filter(
      (b) => parseISO(b.checkIn) > today && ["booked", "confirmed", "pending"].includes(b.status),
    ).length;
    const active = bookings.filter((b) => isActiveOn(b, today)).length;

    const statusPie = (Object.keys(BOOKING_STATUSES) as BookingStatus[])
      .map((s) => ({
        name: BOOKING_STATUSES[s].label.ru,
        value: statusCounts[s],
        color: BOOKING_STATUSES[s].color,
      }))
      .filter((d) => d.value > 0);

    const categoryUsage = categories.map((c) => {
      const catRooms = rooms.filter((r) => r.category === c.id);
      const occ = catRooms.filter((r) => occupiedRoomNumbers.has(r.number)).length;
      return {
        name: c.short,
        full: c.label.ru,
        total: catRooms.length,
        occupied: occ,
        free: catRooms.length - occ,
        pct: catRooms.length ? Math.round((occ / catRooms.length) * 100) : 0,
      };
    });

    const totalGuests = bookings
      .filter((b) => b.status === "in-house")
      .reduce((acc, b) => acc + (b.guestCount || 1), 0);

    return {
      totalRooms,
      occupiedNow,
      occupancyPct,
      trend,
      totalRevenue,
      dayRevenue,
      weekRevenue,
      monthRevenue,
      revenueGrowth,
      dailyGrowth,
      statusCounts,
      statusPie,
      categoryUsage,
      upcoming,
      active,
      totalGuests,
      totalBookings: bookings.length,
    };
  }, [bookings, rooms, categories, categoryRates, range]);

  if (view === "workspace") {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-background via-background to-[hsl(265_60%_98%)] dark:to-background">
        <HotelNavbar totalRooms={stats.totalRooms} viewMode={workspaceViewMode} onViewModeChange={setWorkspaceViewMode} />
        <HotelDashboardBody showNavbar={false} showFooter={false} viewMode={workspaceViewMode} onViewModeChange={setWorkspaceViewMode} />
        <FloatingNav view={view} onChange={setView} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-[hsl(265_60%_98%)] dark:to-background">
      <HotelNavbar totalRooms={stats.totalRooms} viewMode="timeline" onViewModeChange={() => {}} />

      <main className="w-full pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "analytics" ? (
              <div className="w-full px-4 pt-8 sm:px-6 lg:px-8 space-y-8">
                <PageHeader view={view} range={range} onRangeChange={setRange} />
                <AnalyticsView stats={stats} />
              </div>
            ) : view === "login-history" ? (
              <ManagerLoginHistory />
            ) : (
              <SuperuserAdmins embedded />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <FloatingNav view={view} onChange={setView} />
    </div>
  );
}

/* ---------------- Header ---------------- */

function PageHeader({
  view,
  range,
  onRangeChange,
}: {
  view: ManagerView;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(265_85%_55%)]/20 bg-[hsl(265_85%_97%)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[hsl(265_85%_55%)] dark:bg-[hsl(265_60%_15%)]">
          <Sparkles className="h-3 w-3" />
          Manager workspace
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {view === "workspace"
            ? "Workplace"
            : "Analytics"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {view === "workspace"
            ? "The same Superuser hotel grid is shown here for synchronized daily operations."
            : "Best hotel statistics, revenue trends, occupancy intelligence, and booking activity in one clean view."}
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
        {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
          <button
            key={r}
            onClick={() => onRangeChange(r)}
            className={`relative rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              range === r ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {range === r && (
              <motion.span
                layoutId="manager-range-pill"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)] shadow-md shadow-purple-500/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{RANGE_LABEL[r]}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- Workspace view ---------------- */

type Stats = ReturnType<typeof useStatsType>;
// helper to infer the stats shape from the Manager component
function useStatsType() {
  return null as unknown as {
    totalRooms: number;
    occupiedNow: number;
    occupancyPct: number;
    trend: { date: string; occupied: number; occupancy: number; bookings: number; revenue: number }[];
    totalRevenue: number;
    dayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    revenueGrowth: number;
    dailyGrowth: number;
    statusCounts: Record<BookingStatus, number>;
    statusPie: { name: string; value: number; color: string }[];
    categoryUsage: { name: string; full: string; total: number; occupied: number; free: number; pct: number }[];
    upcoming: number;
    active: number;
    totalGuests: number;
    totalBookings: number;
  };
}



function WorkspaceControl({ stats }: { stats: Stats }) {
  const tiles = [
    {
      label: "Статус",
      value: "Online",
      hint: "Все системы в норме",
      Icon: Activity,
      accent: "from-emerald-400 to-emerald-600",
      pulse: true,
    },
    {
      label: "Активные брони",
      value: stats.active,
      hint: `${stats.upcoming} предстоящих`,
      Icon: CalendarCheck,
      accent: "from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)]",
    },
    {
      label: "Активные номера",
      value: `${stats.occupiedNow}/${stats.totalRooms}`,
      hint: "Заняты сейчас",
      Icon: BedDouble,
      accent: "from-sky-400 to-blue-600",
    },
    {
      label: "Загрузка",
      value: `${stats.occupancyPct}%`,
      hint: `${stats.totalGuests} гостей`,
      Icon: Gauge,
      accent: "from-amber-400 to-orange-500",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-[0_10px_40px_-15px_hsl(265_85%_55%/0.25)] sm:p-8"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[hsl(265_85%_55%)] to-[hsl(200_85%_55%)] opacity-[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 opacity-[0.06] blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <LayoutDashboard className="h-3 w-3" />
            Workspace Control
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            Операционный обзор
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Состояние рабочего пространства и ключевые показатели прямо сейчас.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
            whileHover={{ y: -3 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-purple-500/10 sm:p-5"
          >
            <div
              className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.accent} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-30`}
            />
            <div
              className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.accent} text-white shadow-md`}
            >
              <t.Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              {t.label}
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight text-foreground tabular-nums">
              {t.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t.hint}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ---------------- Container 1: Revenue ---------------- */

function RevenueContainer({ stats }: { stats: Stats }) {
  const day = useCountUp(stats.dayRevenue);
  const week = useCountUp(stats.weekRevenue);
  const month = useCountUp(stats.monthRevenue);
  const positive = stats.revenueGrowth >= 0;

  return (
    <AnalyticsCard
      Icon={DollarSign}
      title="Доход"
      subtitle="Выручка отеля"
      accent="from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)]"
      delay={0}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Сегодня
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
            ${Math.round(day).toLocaleString()}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            positive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(stats.revenueGrowth)}%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Неделя" value={`$${Math.round(week).toLocaleString()}`} />
        <MiniStat label="Месяц" value={`$${Math.round(month).toLocaleString()}`} />
      </div>

      <div className="mt-4 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.trend} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(265 85% 55%)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(265 85% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip content={<NiceTooltip suffix="$" />} cursor={{ stroke: "hsl(265 85% 55%)", strokeOpacity: 0.2 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(265 85% 55%)"
              strokeWidth={2.5}
              fill="url(#revGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}

/* ---------------- Container 2: Bookings ---------------- */

function BookingContainer({ stats }: { stats: Stats }) {
  const sc = stats.statusCounts;
  const total = useCountUp(stats.totalBookings);

  const cards = [
    { label: "Активные", value: sc["in-house"] + sc.booked, color: "text-emerald-500", Icon: Activity },
    { label: "Ожидают", value: sc.confirmed + sc.pending, color: "text-amber-500", Icon: Clock3 },
    { label: "Завершены", value: sc["checked-out"], color: "text-slate-400", Icon: CheckCircle2 },
    { label: "Отменены", value: sc.maintenance, color: "text-rose-500", Icon: XCircle },
  ];

  return (
    <AnalyticsCard
      Icon={CalendarDays}
      title="Бронирования"
      subtitle="Активность по статусам"
      accent="from-sky-400 to-blue-600"
      delay={0.08}
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Всего
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
            {Math.round(total)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
          <TrendingUp className="h-3 w-3" />
          {stats.upcoming} новых
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <c.Icon className={`h-4 w-4 ${c.color}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.trend} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
            <Tooltip content={<NiceTooltip />} cursor={{ fill: "hsl(265 85% 55% / 0.06)" }} />
            <Bar dataKey="bookings" radius={[6, 6, 0, 0]}>
              {stats.trend.map((_, i) => (
                <Cell key={i} fill="hsl(210 90% 55%)" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}

/* ---------------- Container 3: Occupancy ---------------- */

function OccupancyContainer({ stats }: { stats: Stats }) {
  const pct = useCountUp(stats.occupancyPct);
  return (
    <AnalyticsCard
      Icon={Percent}
      title="Загрузка"
      subtitle="Использование номеров"
      accent="from-emerald-400 to-teal-600"
      delay={0.16}
    >
      <div className="flex items-center gap-4">
        <CircularGauge value={Math.round(pct)} />
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Сейчас занято
          </p>
          <p className="mt-1 text-2xl font-black text-foreground tabular-nums">
            {stats.occupiedNow}
            <span className="text-base font-bold text-muted-foreground">/{stats.totalRooms}</span>
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Свободно {stats.totalRooms - stats.occupiedNow} номеров
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {stats.categoryUsage.slice(0, 4).map((c) => (
          <div key={c.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-foreground">{c.full}</span>
              <span className="font-bold tabular-nums text-muted-foreground">
                {c.occupied}/{c.total} · {c.pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${c.pct}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
              />
            </div>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  );
}

/* ---------------- Analytics view (graphs) ---------------- */

function AnalyticsView({ stats }: { stats: Stats }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SummaryStat
          label="Всего бронирований"
          value={stats.totalBookings}
          Icon={CalendarDays}
          accent="from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)]"
        />
        <SummaryStat
          label="Гостей в отеле"
          value={stats.totalGuests}
          Icon={Users}
          accent="from-sky-400 to-blue-600"
        />
        <SummaryStat
          label="Накопленный доход"
          value={stats.totalRevenue}
          prefix="$"
          Icon={DollarSign}
          accent="from-emerald-400 to-teal-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <RevenueContainer stats={stats} />
        <BookingContainer stats={stats} />
        <OccupancyContainer stats={stats} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer
          Icon={LineChartIcon}
          title="Тренд выручки"
          subtitle="Доход за период"
        >
          <LineChart data={stats.trend}>
            <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<NiceTooltip suffix="$" />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(265 85% 55%)"
              strokeWidth={3}
              dot={{ r: 3, fill: "hsl(265 85% 55%)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>

        <ChartContainer
          Icon={Gauge}
          title="Загрузка отеля"
          subtitle="Процент занятости по дням"
        >
          <AreaChart data={stats.trend}>
            <defs>
              <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 70% 45%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<NiceTooltip suffix="%" />} />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="hsl(160 70% 45%)"
              strokeWidth={2.5}
              fill="url(#occGrad)"
            />
          </AreaChart>
        </ChartContainer>

        <ChartContainer
          Icon={BarChart3}
          title="Активность бронирований"
          subtitle="Количество активных броней по дням"
        >
          <BarChart data={stats.trend}>
            <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<NiceTooltip />} cursor={{ fill: "hsl(210 90% 55% / 0.08)" }} />
            <Bar dataKey="bookings" radius={[8, 8, 0, 0]} fill="hsl(210 90% 55%)" />
          </BarChart>
        </ChartContainer>

        <ChartContainer
          Icon={Activity}
          title="Распределение статусов"
          subtitle="Текущие бронирования"
        >
          <PieChart>
            <Tooltip content={<NiceTooltip />} />
            <Pie
              data={stats.statusPie}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
              stroke="hsl(var(--background))"
              strokeWidth={3}
            >
              {stats.statusPie.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartContainer
          Icon={BedDouble}
          title="Загрузка по категориям"
          subtitle="Занятые vs свободные номера"
        >
          <BarChart data={stats.categoryUsage} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={70} />
            <Tooltip content={<NiceTooltip />} cursor={{ fill: "hsl(265 85% 55% / 0.06)" }} />
            <Bar dataKey="occupied" stackId="a" radius={[0, 0, 0, 0]} fill="hsl(265 85% 55%)" />
            <Bar dataKey="free" stackId="a" radius={[0, 6, 6, 0]} fill="hsl(160 70% 45%)" />
          </BarChart>
        </ChartContainer>

        <ChartContainer
          Icon={TrendingUp}
          title="Номера занятые по дням"
          subtitle="Динамика занятых номеров"
        >
          <AreaChart data={stats.trend}>
            <defs>
              <linearGradient id="occRoomsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210 90% 55%)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(210 90% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border) / 0.4)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<NiceTooltip />} />
            <Area type="monotone" dataKey="occupied" stroke="hsl(210 90% 55%)" strokeWidth={2.5} fill="url(#occRoomsGrad)" />
          </AreaChart>
        </ChartContainer>
      </div>

      <RecentActivity stats={stats} />
    </>
  );
}

/* ---------------- Building blocks ---------------- */

function AnalyticsCard({
  Icon,
  title,
  subtitle,
  accent,
  children,
  delay = 0,
}: {
  Icon: typeof DollarSign;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-500/10"
    >
      <div
        className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25`}
      />
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

function ChartContainer({
  Icon,
  title,
  subtitle,
  children,
}: {
  Icon: typeof LineChartIcon;
  title: string;
  subtitle: string;
  children: React.ReactElement;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function SummaryStat({
  label,
  value,
  prefix = "",
  Icon,
  accent,
}: {
  label: string;
  value: number;
  prefix?: string;
  Icon: typeof DollarSign;
  accent: string;
}) {
  const v = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-foreground tabular-nums">
            {prefix}
            {Math.round(v).toLocaleString()}
          </p>
        </div>
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-md`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function CircularGauge({ value }: { value: number }) {
  const size = 96;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          style={{ strokeDasharray: c }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(160 70% 45%)" />
            <stop offset="100%" stopColor="hsl(180 70% 50%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black tabular-nums text-foreground">{value}%</span>
      </div>
    </div>
  );
}

function NiceTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { value: number; name: string; color?: string; payload?: { color?: string } }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      {label && <p className="mb-1 font-bold text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || p.payload?.color || "hsl(265 85% 55%)" }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground tabular-nums">
            {suffix === "$" && "$"}
            {p.value.toLocaleString()}
            {suffix && suffix !== "$" && suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentActivity({ stats }: { stats: Stats }) {
  const items = [
    { Icon: CalendarCheck, label: "Активные бронирования", value: stats.active, tone: "text-emerald-500" },
    { Icon: Clock3, label: "Предстоящие заезды", value: stats.upcoming, tone: "text-amber-500" },
    { Icon: Users, label: "Гости в отеле", value: stats.totalGuests, tone: "text-sky-500" },
    { Icon: BedDouble, label: "Свободные номера", value: stats.totalRooms - stats.occupiedNow, tone: "text-violet-500" },
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black tracking-tight text-foreground">Быстрая сводка</h3>
          <p className="text-[11px] text-muted-foreground">Операционные показатели в реальном времени</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 transition-all hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md"
          >
            <it.Icon className={`h-5 w-5 ${it.tone}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {it.label}
              </p>
              <p className="text-lg font-black tabular-nums text-foreground">{it.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ---------------- Floating bottom nav ---------------- */

type NavMode = "bar" | "compact" | "hidden";

function FloatingNav({
  view,
  onChange,
}: {
  view: ManagerView;
  onChange: (v: ManagerView) => void;
}) {
  const tabs: { key: ManagerView; label: string; Icon: typeof LayoutDashboard }[] = [
    { key: "workspace", label: "Workspace", Icon: LayoutDashboard },
    { key: "analytics", label: "Analytics", Icon: BarChart3 },
    { key: "admin-registration", label: "Admin Registration", Icon: UserPlus },
    { key: "login-history", label: "Login History", Icon: History },
  ];

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<NavMode>(() => {
    if (typeof window === "undefined") return "bar";
    return (localStorage.getItem("manager:nav-mode") as NavMode) || "bar";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("manager:nav-mode", mode);
    if (mode !== "compact") setMenuOpen(false);
  }, [mode]);

  const activeTab = tabs.find((t) => t.key === view) ?? tabs[0];

  const nav = (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 24,
        zIndex: 2147483600,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.7 }}
        className="pointer-events-auto"
      >
        <AnimatePresence mode="wait" initial={false}>
          {mode === "hidden" && (
            <motion.button
              key="hidden"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={() => setMode("bar")}
              title="Show navigation"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-slate-900/90 text-white shadow-2xl shadow-purple-900/40 backdrop-blur-xl transition hover:scale-105"
            >
              <LayoutDashboard className="h-4 w-4" />
            </motion.button>
          )}

          {mode === "compact" && (
            <motion.div
              key="compact"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/90 p-1.5 shadow-2xl shadow-purple-900/40 backdrop-blur-xl"
            >
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)] px-4 py-2 text-xs font-bold tracking-wide text-white shadow-lg shadow-purple-500/40 transition hover:brightness-110"
              >
                <activeTab.Icon className="h-4 w-4" />
                {activeTab.label}
                <ChevronUp className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "" : "rotate-180"}`} />
              </button>
              <button
                onClick={() => setMode("bar")}
                title="Expand to full bar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode("hidden")}
                title="Hide navigation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 min-w-[220px] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl shadow-purple-900/40 backdrop-blur-xl"
                  >
                    {tabs.map((t) => {
                      const active = view === t.key;
                      return (
                        <button
                          key={t.key}
                          onClick={() => { onChange(t.key); setMenuOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold tracking-wide transition ${
                            active
                              ? "bg-gradient-to-r from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)] text-white shadow-md shadow-purple-500/40"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <t.Icon className="h-4 w-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {mode === "bar" && (
            <motion.div
              key="bar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/90 p-1.5 shadow-2xl shadow-purple-900/40 backdrop-blur-xl"
            >
              {tabs.map((t) => {
                const active = view === t.key;
                return (
                  <div key={t.key} className="relative">
                    <button
                      onClick={() => onChange(t.key)}
                      className={`relative flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide transition-all duration-300 ease-out ${
                        active ? "text-white" : "text-white/60 hover:text-white hover:scale-[1.03]"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="manager-nav-pill"
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(265_85%_55%)] to-[hsl(280_85%_60%)] shadow-lg shadow-purple-500/50"
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <t.Icon className="h-4 w-4" />
                        {t.label}
                      </span>
                    </button>
                  </div>
                );
              })}
              <div className="mx-1 h-6 w-px bg-white/10" />
              <button
                onClick={() => setMode("compact")}
                title="Collapse to dropdown"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMode("hidden")}
                title="Hide navigation"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(nav, document.body);
}
