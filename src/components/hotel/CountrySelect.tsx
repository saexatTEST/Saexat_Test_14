import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { COUNTRIES, countryLabel, type Country } from '@/lib/countries';
import { useI18n } from '@/hooks/useI18n';

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
};

/**
 * Searchable country picker. Users can either click an option from the
 * dropdown or freely type a custom value (the typed text is preserved as
 * the `value` if no country matches). Designed to slot into the anketa
 * and guest details forms without breaking the existing string-based API.
 */
export function CountrySelect({ value, onChange, placeholder, className, compact }: CountrySelectProps) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep the visible search box in sync with the saved value when the
  // popover is closed so users see the canonical country name.
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const matched = useMemo<Country | undefined>(() => {
    const v = value.trim().toLowerCase();
    if (!v) return undefined;
    return COUNTRIES.find((c) =>
      c.code.toLowerCase() === v ||
      c.ru.toLowerCase() === v ||
      c.en.toLowerCase() === v ||
      c.uz.toLowerCase() === v,
    );
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.ru.toLowerCase().includes(q) ||
      c.en.toLowerCase().includes(q) ||
      c.uz.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex w-full items-center gap-2 rounded-xl border-2 border-primary/25 bg-background px-3 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30',
            compact ? 'py-2 text-sm' : 'py-2.5 text-[15px]',
            className,
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-base">
            {matched ? matched.flag : <Globe className="h-3.5 w-3.5" />}
          </span>
          <span className={cn('flex-1 truncate font-semibold tabular-nums', !value && 'text-muted-foreground/60 font-normal')}>
            {matched ? countryLabel(matched, lang) : value || placeholder || 'Выберите страну'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="z-[95] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/60 bg-popover p-0 shadow-2xl shadow-primary/15"
        onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
      >
        <div className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/5 px-3 py-2">
          <Search className="h-4 w-4 text-primary/70" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              // Free-type fallback: the typed text becomes the value so users
              // can enter a country we didn't pre-list.
              onChange(v);
            }}
            placeholder="Поиск страны…"
            maxLength={48}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs font-semibold text-muted-foreground">
              Ничего не найдено · Enter сохранит ваш текст
            </div>
          ) : (
            filtered.map((c) => {
              const isActive = matched?.code === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(countryLabel(c, lang));
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition hover:bg-primary/10',
                    isActive && 'bg-primary/10 text-primary',
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="flex-1 truncate">{countryLabel(c, lang)}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{c.code}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
