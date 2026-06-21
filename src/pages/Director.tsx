import { memo, useEffect, useMemo, useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import {
  BedDouble,
  CalendarCheck,
  DollarSign,
  Percent,
  TrendingUp,
  Users,
  ChevronRight,
  WalletCards,
} from "lucide-react";
import { addDays, differenceInDays, format, parseISO, startOfDay, subDays } from "date-fns";
import { HotelNavbar } from "@/components/hotel/HotelNavbar";
import { DirectorShiftPanel } from "@/components/hotel/DirectorShiftPanel";
import { useBookingsContext } from "@/hooks/BookingsContext";
import { useHotelGrid } from "@/hooks/HotelGridContext";
import {
  BOOKING_STATUSES,
  ROOM_CATEGORIES,
  type Booking,
  type BookingStatus,
  type Room,
} from "@/types/hotel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_ORDER: BookingStatus[] = [
  "confirmed",
  "pending",
  "booked",
  "in-house",
  "checked-out",
  "maintenance",
];

const ACTIVE_STATUSES: BookingStatus[] = ["in-house", "booked", "confirmed", "pending"];
const WITHDRAWALS_KEY = "sayohat-revenue-withdrawals";

interface WithdrawalRecord {
  id: string;
  at: string;
  amount: number;
}

const CATEGORY_COLORS = [
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 65% 60%)",
];

const RATE_BY_CATEGORY: Record<string, import("@/hooks/HotelGridContext").CategoryRate> = {
  "standard-double": { resident: [40, 40], nonResident: [40, 40] },
  "standard-twin": { resident: [40, 40], nonResident: [40, 40] },
  "standard-triple": { resident: [37, 37, 36], nonResident: [37, 37, 36] },
  "standard-quadruple": { resident: [35, 35, 35, 35], nonResident: [35, 35, 35, 35] },
  "deluxe-double": { resident: [90, 90], nonResident: [90, 90] },
  "deluxe-twin": { resident: [90, 90], nonResident: [90, 90] },
};

type DetailPayload =
  | { kind: "bookings"; title: string; subtitle?: string; items: Booking[] }
  | { kind: "rooms"; title: string; subtitle?: string; items: Room[] };

function getCategoryLabel(id: string) {
  return ROOM_CATEGORIES.find((c) => c.id === id)?.label.ru ?? id;
}

function nightsOf(b: Booking) {
  return Math.max(1, differenceInDays(parseISO(b.checkOut), parseISO(b.checkIn)) + (b.checkInHalfDay ? 0.5 : 0) + (b.checkOutHalfDay ? 0.5 : 0));
}

const bookingRevenue = (booking: Booking, _categoryId: string | undefined, _categoryRates: Record<string, import("@/hooks/HotelGridContext").CategoryRate>) => {
  // Director panel reflects ONLY money actually collected — sum of recorded payments.
  if (Array.isArray(booking.payments) && booking.payments.length > 0) {
    return booking.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }
  return 0;
};

function isActiveOn(b: Booking, day: Date) {
  if (!ACTIVE_STATUSES.includes(b.status)) return false;
  const inD = startOfDay(parseISO(b.checkIn));
  const outD = startOfDay(parseISO(b.checkOut));
  return day >= inD && day <= outD;
}

/* ---------------- KPI ---------------- */

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  Icon: typeof BedDouble;
  tone: string;
  onClick?: () => void;
}

const KpiCard = memo(function KpiCard({ label, value, hint, Icon, tone, onClick }: KpiCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl bg-card border border-border shadow-sm p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300 w-full"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-110"
        style={{ background: `${tone}15`, color: tone }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-foreground tabular-nums leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </button>
  );
});

/* ---------------- Chart card ---------------- */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const ChartCard = memo(function ChartCard({ title, subtitle, children, className, onClick }: ChartCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-2xl bg-card border border-border shadow-sm p-5 transition-all duration-300 ${
        onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30" : ""
      } ${className ?? ""}`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-0.5" />}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
});

/* ---------------- Detail dialog ---------------- */

function DetailDialog({
  payload,
  onClose,
  rooms,
  categoryRates,
}: {
  payload: DetailPayload | null;
  onClose: () => void;
  rooms: Room[];
  categoryRates: Record<string, import("@/hooks/HotelGridContext").CategoryRate>;
}) {
  const open = payload !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{payload?.title}</DialogTitle>
          {payload?.subtitle && <DialogDescription>{payload.subtitle}</DialogDescription>}
        </DialogHeader>

        {payload?.kind === "bookings" && (
          <ScrollArea className="max-h-[60vh] pr-3">
            {payload.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Нет данных для отображения.</p>
            ) : (
              <ul className="space-y-2">
                {payload.items.map((b) => {
                  const cfg = BOOKING_STATUSES[b.status];
                  const room = rooms.find((r) => r.number === b.roomNumber);
                  const revenue = bookingRevenue(b, room?.category, categoryRates);
                  return (
                    <li
                      key={b.id}
                      className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-3"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
                        style={{ background: cfg.color }}
                      >
                        {b.roomNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {b.guestName || "Без имени"}
                          <span className="text-muted-foreground font-normal ml-2">
                            · {b.guestCount} гост{b.guestCount === 1 ? "ь" : "я"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(b.checkIn), "dd.MM.yyyy")} →{" "}
                          {format(parseISO(b.checkOut), "dd.MM.yyyy")}
                          {room && <> · {getCategoryLabel(room.category)}</>}
                          {revenue > 0 && <> · ${revenue.toLocaleString()}</>}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        style={{ background: `${cfg.color}20`, color: cfg.color, borderColor: `${cfg.color}40` }}
                        className="border shrink-0"
                      >
                        {cfg.label.ru}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        )}

        {payload?.kind === "rooms" && (
          <ScrollArea className="max-h-[60vh] pr-3">
            {payload.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Нет номеров.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {payload.items.map((r) => (
                  <div
                    key={r.number}
                    className="rounded-xl border border-border bg-muted/30 p-3 text-center"
                  >
                    <p className="text-lg font-black text-foreground">{r.number}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {getCategoryLabel(r.category)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Main ---------------- */

function DirectorDashboard() {
  const { bookings } = useBookingsContext();
  const { categories, rooms, categoryRates } = useHotelGrid();
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setWithdrawals(JSON.parse(window.localStorage.getItem(WITHDRAWALS_KEY) || "[]"));
    } catch {
      setWithdrawals([]);
    }
  }, []);

  const recordWithdrawal = useCallback((amount: number) => {
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), amount }, ...withdrawals];
    setWithdrawals(next);
    if (typeof window !== "undefined") window.localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(next));
  }, [withdrawals]);

  const openBookings = useCallback(
    (title: string, items: Booking[], subtitle?: string) =>
      setDetail({ kind: "bookings", title, subtitle, items }),
    [],
  );
  const openRooms = useCallback(
    (title: string, items: Room[], subtitle?: string) =>
      setDetail({ kind: "rooms", title, subtitle, items }),
    [],
  );

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const totalRooms = rooms.length || 1;

    const statusCounts = STATUS_ORDER.reduce<Record<BookingStatus, number>>((acc, s) => {
      acc[s] = 0;
      return acc;
    }, {} as Record<BookingStatus, number>);
    bookings.forEach((b) => {
      statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
    });

    const statusPie = STATUS_ORDER.map((s) => ({
      key: s,
      name: BOOKING_STATUSES[s].label.ru,
      value: statusCounts[s],
      color: BOOKING_STATUSES[s].color,
    })).filter((d) => d.value > 0);

    const occupiedRoomNumbers = new Set(
      bookings.filter((b) => isActiveOn(b, today)).map((b) => b.roomNumber),
    );
    const occupiedNow = occupiedRoomNumbers.size;
    const occupancyPct = Math.round((occupiedNow / totalRooms) * 100);

    const categoryData = categories.map((cat, idx) => {
      const catRooms = rooms.filter((r) => r.category === cat.id);
      const occupiedRooms = catRooms.filter((r) => occupiedRoomNumbers.has(r.number));
      return {
        id: cat.id,
        name: cat.label.ru,
        short: cat.short,
        total: catRooms.length,
        occupied: occupiedRooms.length,
        free: catRooms.length - occupiedRooms.length,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        rooms: catRooms,
        occupiedRooms,
        freeRooms: catRooms.filter((r) => !occupiedRoomNumbers.has(r.number)),
      };
    });

    const trend = Array.from({ length: 14 }).map((_, i) => {
      const day = addDays(subDays(today, 6), i);
      const dayBookings = bookings.filter((b) => isActiveOn(b, day));
      const dayRooms = new Set(dayBookings.map((b) => b.roomNumber));
      return {
        date: format(day, "dd.MM"),
        day,
        occupied: dayRooms.size,
        occupancy: Math.round((dayRooms.size / totalRooms) * 100),
        bookings: dayBookings,
      };
    });

    const revenueByCategory = categories.map((cat, idx) => {
      const lastWithdrawalAt = withdrawals[0]?.at ? new Date(withdrawals[0].at).getTime() : 0;
      const catBookings = bookings.filter((b) => {
        const room = rooms.find((r) => r.number === b.roomNumber);
        const createdAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return room?.category === cat.id && b.status !== "maintenance" && (!lastWithdrawalAt || createdAt > lastWithdrawalAt);
      });
      return {
        id: cat.id,
        name: cat.short,
        fullName: cat.label.ru,
        revenue: catBookings.reduce((acc, b) => acc + bookingRevenue(b, cat.id, categoryRates), 0),
        bookings: catBookings,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      };
    });

    const totalRevenue = revenueByCategory.reduce((a, b) => a + b.revenue, 0);
    const totalGuests = bookings
      .filter((b) => b.status === "in-house")
      .reduce((acc, b) => acc + (b.guestCount || 1), 0);

    const guestDist = [1, 2, 3, 4].map((n, i) => ({
      key: n,
      name: `${n} ${n === 1 ? "гость" : n < 5 ? "гостя" : "гостей"}`,
      value: bookings.filter((b) => b.guestCount === n).length,
      bookings: bookings.filter((b) => b.guestCount === n),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    const radar = categoryData.map((c) => ({
      id: c.id,
      category: c.name,
      occupancy: c.total > 0 ? Math.round((c.occupied / c.total) * 100) : 0,
    }));

    return {
      statusPie,
      statusCounts,
      categoryData,
      trend,
      revenueByCategory,
      totalRevenue,
      occupiedNow,
      occupancyPct,
      totalGuests,
      guestDist,
      radar,
      totalBookings: bookings.length,
      totalRooms,
      occupiedRoomNumbers,
    };
  }, [bookings, categories, rooms, categoryRates, withdrawals]);

  return (
    <div className="min-h-screen bg-background">
      <HotelNavbar totalRooms={stats.totalRooms} viewMode="timeline" onViewModeChange={() => {}} />

      <main className="px-5 py-6 max-w-[1600px] mx-auto space-y-6">
        <div className="animate-fade-in-up">
          <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
            Панель Директора
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Аналитика, KPI и операционные показатели отеля в реальном времени. Нажмите на карточку для подробностей.
          </p>
        </div>

        <DirectorShiftPanel />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Накопленный доход</p>
                <p className="text-3xl font-black text-foreground tabular-nums">${stats.totalRevenue.toLocaleString()}</p>
                {withdrawals[0] && (
                  <p className="text-xs text-muted-foreground">Последнее снятие: {new Date(withdrawals[0].at).toLocaleString()} · ${withdrawals[0].amount.toLocaleString()}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={stats.totalRevenue <= 0}
              onClick={() => recordWithdrawal(stats.totalRevenue)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Деньги сняты
            </button>
          </div>
        </section>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            label="Всего номеров"
            value={String(stats.totalRooms)}
            Icon={BedDouble}
            tone="hsl(262 83% 58%)"
            onClick={() => openRooms("Все номера", rooms, `Всего: ${stats.totalRooms}`)}
          />
          <KpiCard
            label="Занято сейчас"
            value={String(stats.occupiedNow)}
            hint={`из ${stats.totalRooms}`}
            Icon={CalendarCheck}
            tone="hsl(142 71% 45%)"
            onClick={() =>
              openRooms(
                "Занятые номера сегодня",
                rooms.filter((r) => stats.occupiedRoomNumbers.has(r.number)),
                format(new Date(), "dd.MM.yyyy"),
              )
            }
          />
          <KpiCard
            label="Заполняемость"
            value={`${stats.occupancyPct}%`}
            Icon={Percent}
            tone="hsl(38 92% 50%)"
            onClick={() =>
              openRooms(
                "Свободные номера сегодня",
                rooms.filter((r) => !stats.occupiedRoomNumbers.has(r.number)),
                `Свободно: ${stats.totalRooms - stats.occupiedNow} из ${stats.totalRooms}`,
              )
            }
          />
          <KpiCard
            label="Гости в отеле"
            value={String(stats.totalGuests)}
            Icon={Users}
            tone="hsl(199 89% 48%)"
            onClick={() =>
              openBookings(
                "Гости, проживающие сейчас",
                bookings.filter((b) => b.status === "in-house"),
                `Всего гостей: ${stats.totalGuests}`,
              )
            }
          />
          <KpiCard
            label="Бронирований"
            value={String(stats.totalBookings)}
            Icon={TrendingUp}
            tone="hsl(280 65% 60%)"
            onClick={() => openBookings("Все бронирования", bookings)}
          />
          <KpiCard
            label="Доход (оценка)"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            Icon={DollarSign}
            tone="hsl(0 84% 60%)"
            onClick={() =>
              openBookings(
                "Бронирования, формирующие доход",
                bookings.filter((b) => b.status !== "maintenance"),
                `Итого: $${stats.totalRevenue.toLocaleString()}`,
              )
            }
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          <ChartCard
            title="Статусы бронирований"
            subtitle="Распределение по текущему статусу"
            onClick={() => openBookings("Все бронирования по статусам", bookings)}
          >
            <PieChart>
              <Pie
                data={stats.statusPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={45}
                paddingAngle={2}
                onClick={(data: { key?: BookingStatus; name?: string }) => {
                  if (!data?.key) return;
                  openBookings(
                    `Статус: ${data.name}`,
                    bookings.filter((b) => b.status === data.key),
                  );
                }}
                cursor="pointer"
              >
                {stats.statusPie.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Заполненность по категориям"
            subtitle="Занятые vs свободные номера"
            onClick={() => openRooms("Все номера по категориям", rooms)}
          >
            <BarChart data={stats.categoryData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="short" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="occupied" stackId="a" fill="hsl(262 83% 58%)" name="Занято" cursor="pointer" />
              <Bar dataKey="free" stackId="a" fill="hsl(210 40% 90%)" name="Свободно" radius={[6, 6, 0, 0]} cursor="pointer" />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Заполняемость (14 дней)"
            subtitle="Динамика занятых номеров"
            onClick={() => {
              const allBookings = stats.trend.flatMap((d) => d.bookings);
              const unique = Array.from(new Map(allBookings.map((b) => [b.id, b])).values());
              openBookings("Бронирования за 14 дней", unique);
            }}
          >
            <AreaChart data={stats.trend}>
              <defs>
                <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="occupied" stroke="hsl(262 83% 58%)" fill="url(#occGrad)" strokeWidth={2} />
            </AreaChart>
          </ChartCard>

          <ChartCard
            title="Доход по категориям"
            subtitle="Оценочный доход в USD"
            onClick={() =>
              openBookings(
                "Все доходные бронирования",
                bookings.filter((b) => b.status !== "maintenance"),
                `Итого: $${stats.totalRevenue.toLocaleString()}`,
              )
            }
          >
            <BarChart data={stats.revenueByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} cursor="pointer">
                {stats.revenueByCategory.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Гостей в бронировании"
            subtitle="Распределение по числу гостей"
            onClick={() => openBookings("Все бронирования", bookings)}
          >
            <PieChart>
              <Pie
                data={stats.guestDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                onClick={(d: { key?: number; name?: string }) => {
                  if (typeof d?.key !== "number") return;
                  openBookings(
                    `Бронирования: ${d.name}`,
                    bookings.filter((b) => b.guestCount === d.key),
                  );
                }}
                cursor="pointer"
              >
                {stats.guestDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartCard>

          <ChartCard
            title="Эффективность категорий"
            subtitle="Заполняемость, % по категории"
            onClick={() => openRooms("Все номера по категориям", rooms)}
          >
            <RadarChart data={stats.radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
              <Radar
                name="Заполняемость"
                dataKey="occupancy"
                stroke="hsl(262 83% 58%)"
                fill="hsl(262 83% 58%)"
                fillOpacity={0.45}
              />
              <Tooltip formatter={(v: number) => `${v}%`} />
            </RadarChart>
          </ChartCard>

          <ChartCard
            title="Тренд заполняемости (%)"
            subtitle="Процент занятых номеров за 14 дней"
            className="lg:col-span-2 xl:col-span-3"
          >
            <LineChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="occupancy"
                stroke="hsl(262 83% 58%)"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(262 83% 58%)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartCard>
        </div>
      </main>

      <DetailDialog payload={detail} onClose={() => setDetail(null)} rooms={rooms} categoryRates={categoryRates} />
    </div>
  );
}

export default memo(DirectorDashboard);
