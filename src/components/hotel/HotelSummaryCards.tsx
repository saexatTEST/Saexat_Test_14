import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, Hotel, CheckCircle, Clock, BookOpen, Home, LogOut, Wrench } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { type BookingStatus } from '@/types/hotel';

export type SummaryFilter = BookingStatus | 'all' | 'available';

interface SummaryCardsProps {
  total: number; available: number; confirmed: number; pending: number;
  booked: number; inHouse: number; checkedOut: number; maintenance: number;
  activeFilter?: SummaryFilter;
  onSelect?: (filter: SummaryFilter) => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setAnimKey(k => k + 1);
      setDisplay(value);
      prev.current = value;
    }
  }, [value]);
  return <span key={animKey} className="inline-block tabular-nums counter-bounce">{display}</span>;
}

export function HotelSummaryCards({
  total, available, confirmed, pending, booked, inHouse, checkedOut, maintenance,
  activeFilter = 'all', onSelect,
}: SummaryCardsProps) {
  const { t } = useI18n();
  const cards: { label: string; value: number; icon: typeof Hotel; iconBg: string; activeRing: string; filter: SummaryFilter }[] = [
    { label: t('totalRooms'),        value: total,       icon: Hotel,       iconBg: 'bg-slate-100 text-slate-700',     activeRing: 'ring-slate-400',   filter: 'all' },
    { label: t('available'),         value: available,   icon: DoorOpen,    iconBg: 'bg-sky-100 text-sky-700',         activeRing: 'ring-sky-400',     filter: 'available' },
    { label: t('pendingLabel'),      value: pending,     icon: Clock,       iconBg: 'bg-amber-100 text-amber-700',     activeRing: 'ring-amber-400',   filter: 'pending' },
    { label: t('bookedLabel'),       value: booked,      icon: BookOpen,    iconBg: 'bg-violet-100 text-violet-700',   activeRing: 'ring-violet-400',  filter: 'booked' },
    { label: t('inHouse'),           value: inHouse,     icon: Home,        iconBg: 'bg-emerald-100 text-emerald-700', activeRing: 'ring-emerald-400', filter: 'in-house' },
    { label: t('checkedOutLabel'),   value: checkedOut,  icon: LogOut,      iconBg: 'bg-gray-100 text-gray-700',       activeRing: 'ring-gray-400',    filter: 'checked-out' },
    { label: t('maintenanceLabel'),  value: maintenance, icon: Wrench,      iconBg: 'bg-red-100 text-red-700',         activeRing: 'ring-red-400',     filter: 'maintenance' },
  ];

  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-2.5 px-4 py-3.5">
      {cards.map((card, i) => {
        const isActive = activeFilter === card.filter;
        const handleClick = () => {
          if (!onSelect) return;
          // Toggle off when clicking the already-active card (except "all" which is the reset).
          if (isActive && card.filter !== 'all') onSelect('all');
          else onSelect(card.filter);
        };
        return (
          <motion.button
            type="button"
            key={card.label}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: isActive ? 1.04 : 1 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 220, damping: 22 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleClick}
            aria-pressed={isActive}
            className={`glass-card rounded-2xl px-3 py-3 flex flex-col items-center text-center group text-left transition-all duration-300 outline-none
              ${isActive ? `ring-2 ${card.activeRing} shadow-xl` : 'ring-0 hover:ring-1 hover:ring-primary/20'}
              ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} shadow-sm mb-2 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:shadow-md ${isActive ? 'rotate-6 scale-110' : ''}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className={`font-display text-2xl font-black leading-tight transition-colors duration-300 ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
              <AnimatedNumber value={card.value} />
            </p>
            <p className={`text-[10px] font-semibold truncate w-full mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{card.label}</p>
          </motion.button>
        );
      })}
    </div>
  );
}
