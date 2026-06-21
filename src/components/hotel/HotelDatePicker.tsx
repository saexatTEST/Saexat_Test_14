import { useEffect, useRef, useState } from 'react';
import { format, isBefore, isValid, parse, parseISO, startOfDay } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';


import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type HotelDatePickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
};

function parseISOSafe(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Try to parse a free-form keyboard-typed date. Accepts the canonical
 * `dd.MM.yyyy` plus the common `dd/MM/yyyy`, `dd-MM-yyyy` variants. Returns
 * undefined if the string is incomplete or invalid — callers keep the user's
 * raw input visible until it parses cleanly.
 */
/**
 * Mask the user's keystrokes into a strict `dd.mm.yyyy` shape. Only digits
 * are accepted; dots are inserted automatically after positions 2 and 4.
 * Anything else (letters, punctuation, free-form text) is silently dropped,
 * so the user cannot type "whatever they want" — only a real date.
 */
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8); // ddmmyyyy
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join('.');
}

/**
 * Try to parse a free-form keyboard-typed date. Accepts the canonical
 * `dd.MM.yyyy` plus the common `dd/MM/yyyy`, `dd-MM-yyyy` variants. Returns
 * undefined if the string is incomplete or invalid — callers keep the user's
 * raw input visible until it parses cleanly.
 */
function parseTyped(value: string): Date | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const formats = ['dd.MM.yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'];
  for (const f of formats) {
    const d = parse(v, f, new Date());
    if (isValid(d)) return d;
  }
  return undefined;
}

export function HotelDatePicker({ label, value, onChange, min, required, compact, showLabel = true, className }: HotelDatePickerProps) {
  const selected = parseISOSafe(value);
  const minDate = parseISOSafe(min);
  const humanDate = selected ? format(selected, 'EEE, d MMM') : '';

  // Keep a local string for the manual-typing input so the user can hold
  // a half-typed value like "12.04" without it being normalized away.
  const [typed, setTyped] = useState<string>(selected ? format(selected, 'dd.MM.yyyy') : '');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    setTyped(selected ? format(selected, 'dd.MM.yyyy') : '');
  }, [value]);

  const commitTyped = (raw: string) => {
    const d = parseTyped(raw);
    if (d) {
      if (minDate && isBefore(startOfDay(d), startOfDay(minDate))) {
        toast.error(`Дата не может быть раньше ${format(minDate, 'dd.MM.yyyy')}`);
        setTyped(selected ? format(selected, 'dd.MM.yyyy') : '');
        return;
      }
      onChange(format(d, 'yyyy-MM-dd'));
    } else if (!raw.trim()) {
      // empty -> leave value alone
    } else {
      // invalid -> revert visible text to last good value
      setTyped(selected ? format(selected, 'dd.MM.yyyy') : '');
    }
  };


  // Wide year range so users can scroll deep into the past (date of birth,
  // passport issue dates) or far into the future (long-term reservations).
  const today = new Date();
  const fromYear = 1925;
  const toYear = today.getFullYear() + 25;

  return (
    <div className={cn('relative w-full', className)}>
      <div
        className={cn(
          'group/date relative flex w-full items-center rounded-xl border-2 border-primary/25 bg-background text-left shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30',
          compact ? 'px-3 py-2' : 'p-2.5',
        )}
      >
        <div className="flex w-full flex-col">
          {showLabel && (
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/12 text-primary ring-1 ring-primary/15">
                <CalendarDays className="h-3 w-3" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                {label}{required && <span className="ml-1 text-destructive">*</span>}
              </span>
              {humanDate && (
                <span className="ml-auto text-[10px] font-bold tabular-nums text-primary/80">
                  {humanDate}
                </span>
              )}
            </div>
          )}
          <div className={cn('flex items-center justify-between gap-2', showLabel && 'mt-1', compact && showLabel && 'mt-0.5')}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={typed}
              placeholder="дд.мм.гггг"
              onChange={(e) => setTyped(maskDateInput(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text');
                setTyped(maskDateInput(text));
              }}
              onBlur={(e) => commitTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTyped((e.target as HTMLInputElement).value);
                  inputRef.current?.blur();
                }
              }}
              className={cn(
                'min-w-0 flex-1 border-0 bg-transparent p-0 font-black tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0',
                compact ? 'text-sm' : 'text-[15px]',
              )}
            />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Open calendar"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={8}
                collisionPadding={12}
                avoidCollisions
                className="z-[90] w-auto max-h-[min(580px,85vh)] overflow-y-auto rounded-2xl border border-border/60 bg-popover p-0 shadow-2xl shadow-primary/15"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground truncate">
                      {selected ? format(selected, 'dd MMMM yyyy') : '—'}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                </div>
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  startMonth={new Date(fromYear, 0)}
                  endMonth={new Date(toYear, 11)}
                  defaultMonth={selected ?? today}
                  selected={selected}
                  disabled={minDate ? (d: Date) => isBefore(startOfDay(d), startOfDay(minDate)) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) {
                      toast.error(`Дата не может быть раньше ${format(minDate, 'dd.MM.yyyy')}`);
                      return;
                    }
                    onChange(format(date, 'yyyy-MM-dd'));
                    setOpen(false);
                  }}
                  initialFocus
                />
                <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/25 px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg px-3 text-xs font-semibold text-primary hover:bg-primary/10"
                    onClick={() => {
                      const t = format(new Date(), 'yyyy-MM-dd');
                      if (minDate && isBefore(startOfDay(new Date()), startOfDay(minDate))) {
                        toast.error(`Дата не может быть раньше ${format(minDate, 'dd.MM.yyyy')}`);
                        return;
                      }
                      onChange(t);
                      setOpen(false);
                    }}
                  >
                    Today
                  </Button>

                  {minDate && (
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                      min {format(minDate, 'dd.MM.yyyy')}
                    </span>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
