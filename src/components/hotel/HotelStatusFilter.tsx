import { type BookingStatus, BOOKING_STATUSES } from '@/types/hotel';
import { useI18n } from '@/hooks/useI18n';

type FilterValue = BookingStatus | 'all' | 'available';

interface StatusFilterProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
  counts: Record<string, number>;
}

export function HotelStatusFilter({ activeFilter, onFilterChange, counts }: StatusFilterProps) {
  const { t, lang } = useI18n();

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto py-1.5">
      <button
        onClick={() => onFilterChange('all')}
        className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-300 hover-lift
          ${activeFilter === 'all'
            ? 'bg-primary text-primary-foreground shadow-lg scale-105'
            : 'bg-card text-muted-foreground border border-border hover:bg-muted hover:border-primary/30'}`}
      >
        {t('all')}
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeFilter === 'all' ? 'bg-white/20' : 'bg-muted'}`}>
          {counts.all || 0}
        </span>
      </button>

      {(Object.entries(BOOKING_STATUSES) as [BookingStatus, typeof BOOKING_STATUSES[BookingStatus]][])
        .filter(([key]) => key !== 'confirmed')
        .map(([key, cfg], i) => (
        <button
          key={key}
          onClick={() => onFilterChange(key)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all duration-300 border hover-lift animate-fade-in-up
            ${activeFilter === key
              ? `${cfg.tailwindBg} ${cfg.tailwindText} ${cfg.tailwindBorder} shadow-lg scale-105`
              : 'bg-card text-muted-foreground border-border hover:bg-muted hover:border-primary/30'}`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${activeFilter === key ? 'status-dot-pulse' : ''}`}
            style={{ background: cfg.color, transform: activeFilter === key ? 'scale(1.4)' : 'scale(1)' }}
          />
          <span className="hidden sm:inline">{cfg.label[lang]}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeFilter === key ? 'bg-background/50' : 'bg-muted'}`}>
            {counts[key] || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
