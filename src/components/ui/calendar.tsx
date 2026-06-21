import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  startOfMonth,
} from "date-fns";

import { cn } from "@/lib/utils";

/**
 * Modern Calendar
 * ----------------
 * Custom-built (no react-day-picker) so we own the UI and interaction model:
 *   • Big, smooth month dropdown + year dropdown at the top
 *   • Prev / Next month buttons on each side
 *   • Weekday header + 6-row date grid below
 *   • Sunday-first week, today highlight, selected highlight, hover scale
 *   • Range mode (start..end) with middle highlight
 *
 * Used by every date picker in the app (booking, edit, anketa, guest details,
 * birth date, passport issue date, etc.) via HotelDatePicker — keeping the
 * existing prop surface so callers don't change.
 */

type SingleProps = {
  mode?: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

type RangeValue = { from?: Date; to?: Date };
type RangeProps = {
  mode: "range";
  selected?: RangeValue;
  onSelect?: (range: RangeValue | undefined) => void;
};

export type CalendarProps = (SingleProps | RangeProps) & {
  defaultMonth?: Date;
  startMonth?: Date;
  endMonth?: Date;
  disabled?: (date: Date) => boolean;
  className?: string;
  initialFocus?: boolean;
  showOutsideDays?: boolean;
  /** Backwards-compat noop — kept so existing call sites stay valid. */
  captionLayout?: string;
  classNames?: Record<string, string>;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay()); // back up to Sunday
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/* -------------------------------------------------------------------------- */
/*                            Smooth dropdown                                 */
/* -------------------------------------------------------------------------- */

function SmoothDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  align = "center",
  minWidth = "8rem",
}: {
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
  ariaLabel: string;
  align?: "start" | "center" | "end";
  minWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<"down" | "up">("down");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const desired = 280;
    setDrop(spaceBelow < desired && spaceAbove > spaceBelow ? "up" : "down");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[data-selected="true"]')
        ?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-border/70 bg-background px-3.5 text-sm font-semibold text-foreground shadow-sm",
          "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out",
          "hover:border-primary/60 hover:bg-accent/40 hover:shadow-md hover:shadow-primary/10",
          "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "border-primary/60 ring-2 ring-primary/30 bg-accent/40",
        )}
        style={{ minWidth }}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          onWheel={(e) => e.stopPropagation()}
          style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
          className={cn(
            "absolute z-[140] max-h-72 overflow-y-auto overscroll-contain",
            "rounded-2xl border border-border/80 bg-popover p-1.5 shadow-2xl shadow-primary/15 ring-1 ring-primary/10",
            "origin-top animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
            drop === "down" ? "top-full mt-2" : "bottom-full mb-2 origin-bottom slide-in-from-bottom-1",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
          )}
          // Match trigger width minimum so list isn't narrower than button.
          // For year dropdown we want a slightly wider list.
          // eslint-disable-next-line react/forbid-dom-props
        >
          <div style={{ minWidth }}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-foreground",
                    "transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
                    isSelected &&
                      "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary hover:text-primary-foreground",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Calendar                                    */
/* -------------------------------------------------------------------------- */

function Calendar(props: CalendarProps) {
  const {
    defaultMonth,
    startMonth,
    endMonth,
    disabled,
    className,
    showOutsideDays = true,
  } = props;

  const now = new Date();
  const fromYear = (startMonth ?? new Date(1925, 0)).getFullYear();
  const toYear = (endMonth ?? new Date(now.getFullYear() + 25, 11)).getFullYear();

  const initialMonth = useMemo(() => {
    if (defaultMonth) return startOfMonth(defaultMonth);
    if (props.mode === "range" && props.selected?.from)
      return startOfMonth(props.selected.from);
    if (props.mode !== "range" && (props as SingleProps).selected)
      return startOfMonth((props as SingleProps).selected as Date);
    return startOfMonth(now);
  }, [defaultMonth, props]);

  const [viewMonth, setViewMonth] = useState<Date>(initialMonth);
  const [animDir, setAnimDir] = useState<1 | -1>(1);

  const days = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const goto = (next: Date) => {
    setAnimDir(next > viewMonth ? 1 : -1);
    setViewMonth(startOfMonth(next));
  };

  const yearOptions = useMemo(
    () =>
      Array.from({ length: toYear - fromYear + 1 }, (_, i) => {
        const y = fromYear + i;
        return { value: y, label: String(y) };
      }),
    [fromYear, toYear],
  );

  const monthOptions = MONTHS.map((label, value) => ({ value, label }));

  const selectedFrom =
    props.mode === "range" ? props.selected?.from : (props as SingleProps).selected;
  const selectedTo = props.mode === "range" ? props.selected?.to : undefined;

  const isSelected = (d: Date) => {
    if (props.mode === "range") {
      if (selectedFrom && isSameDay(d, selectedFrom)) return true;
      if (selectedTo && isSameDay(d, selectedTo)) return true;
      return false;
    }
    return selectedFrom ? isSameDay(d, selectedFrom) : false;
  };

  const isInRange = (d: Date) => {
    if (props.mode !== "range" || !selectedFrom || !selectedTo) return false;
    return d > selectedFrom && d < selectedTo;
  };

  const handlePick = (d: Date) => {
    if (disabled?.(d)) return;
    if (props.mode === "range") {
      const cur: RangeValue = props.selected ?? {};
      if (!cur.from || (cur.from && cur.to)) {
        props.onSelect?.({ from: d, to: undefined });
      } else if (d < cur.from) {
        props.onSelect?.({ from: d, to: cur.from });
      } else {
        props.onSelect?.({ from: cur.from, to: d });
      }
    } else {
      (props as SingleProps).onSelect?.(d);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto select-none bg-popover text-popover-foreground rounded-2xl p-4 w-[360px] max-w-[calc(100vw-2rem)]",
        className,
      )}
    >
      {/* Header: prev | Month dropdown | Year dropdown | next */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => goto(addMonths(viewMonth, -1))}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border/60 text-muted-foreground shadow-sm",
            "transition-[background-color,color,box-shadow,transform] duration-200 ease-out",
            "hover:text-primary-foreground hover:bg-primary hover:ring-primary/60 hover:shadow-md hover:shadow-primary/30",
            "active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-2">
          <SmoothDropdown
            ariaLabel="Month"
            value={viewMonth.getMonth()}
            options={monthOptions}
            onChange={(m) => goto(setMonth(viewMonth, m))}
            align="center"
            minWidth="8.5rem"
          />
          <SmoothDropdown
            ariaLabel="Year"
            value={viewMonth.getFullYear()}
            options={yearOptions}
            onChange={(y) => goto(setYear(viewMonth, y))}
            align="center"
            minWidth="5.5rem"
          />
        </div>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => goto(addMonths(viewMonth, 1))}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border/60 text-muted-foreground shadow-sm",
            "transition-[background-color,color,box-shadow,transform] duration-200 ease-out",
            "hover:text-primary-foreground hover:bg-primary hover:ring-primary/60 hover:shadow-md hover:shadow-primary/30",
            "active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="flex h-8 items-center justify-center text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div
        key={`${viewMonth.getFullYear()}-${viewMonth.getMonth()}`}
        className="mt-1 grid grid-cols-7 gap-1 animate-in fade-in-0 duration-200"
        data-anim-dir={animDir}
      >
        {days.map((d) => {
          const outside = !isSameMonth(d, viewMonth);
          if (outside && !showOutsideDays) {
            return <div key={d.toISOString()} className="h-10 w-full" />;
          }
          const today = isSameDay(d, now);
          const sel = isSelected(d);
          const inRange = isInRange(d);
          const isDisabled = disabled?.(d) ?? false;
          const isRangeStart =
            props.mode === "range" && selectedFrom && isSameDay(d, selectedFrom);
          const isRangeEnd =
            props.mode === "range" && selectedTo && isSameDay(d, selectedTo);

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => handlePick(d)}
              className={cn(
                "relative flex h-10 w-full items-center justify-center text-sm font-medium",
                "transition-[background-color,color,transform,box-shadow] duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                "rounded-full",
                outside && "text-muted-foreground/40 font-normal",
                !outside && !sel && !inRange && "text-foreground/85 hover:bg-accent hover:text-accent-foreground hover:scale-105",
                today && !sel && "ring-2 ring-primary/50 text-primary font-bold",
                inRange && "bg-accent/60 text-accent-foreground rounded-none",
                sel && "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/30 ring-2 ring-primary/30 hover:bg-primary",
                isRangeStart && inRange && "rounded-l-full rounded-r-none",
                isRangeEnd && inRange && "rounded-r-full rounded-l-none",
                isDisabled && "text-muted-foreground/30 cursor-not-allowed hover:bg-transparent hover:scale-100",
              )}
              aria-pressed={sel || undefined}
              aria-label={format(d, "PPP")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
