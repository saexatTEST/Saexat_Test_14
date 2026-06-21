import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import {
  AlertTriangle, Trash2, CalendarDays, Users, BedDouble, Check, ShieldAlert, FileWarning, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { type Booking, BOOKING_STATUSES } from '@/types/hotel';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onConfirm: (id: string) => void;
}

export function DeleteBookingModal({ open, onClose, booking, onConfirm }: Props) {
  const { t, lang } = useI18n();
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setAcknowledged(false);
      setSubmitting(false);
    }
  }, [open, booking?.id]);

  const cfg = booking ? BOOKING_STATUSES[booking.status] : null;
  const nights = useMemo(() => {
    if (!booking) return 0;
    try { return differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn)); }
    catch { return 0; }
  }, [booking]);

  if (!booking || !cfg) return null;

  const presetReasons = [
    { key: 'guestCancelled', label: t('reasonGuestCancelled') },
    { key: 'noShow', label: t('reasonNoShow') },
    { key: 'duplicate', label: t('reasonDuplicate') },
    { key: 'createdInError', label: t('reasonError') },
    { key: 'other', label: t('reasonOther') },
  ];

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= 10;
  const canDelete = reasonValid && acknowledged && !submitting;

  const handleConfirm = () => {
    if (!canDelete) {
      if (!reasonValid) toast.error(t('reasonRequired'));
      return;
    }
    setSubmitting(true);
    onConfirm(booking.id);
    toast.success(t('bookingDeleted'));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-[680px] w-[calc(100vw-2rem)] max-h-[92vh] overflow-hidden p-0 border-0 bg-transparent shadow-none [&>button.absolute]:hidden"
      >
        <VisuallyHidden>
          <DialogTitle>{t('deleteBookingTitle')}</DialogTitle>
          <DialogDescription>{t('deleteBookingSubtitle')}</DialogDescription>
        </VisuallyHidden>

        <AnimatePresence>
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="danger-glow relative flex max-h-[92vh] flex-col overflow-hidden rounded-[28px] border border-destructive/40 bg-card shadow-2xl shadow-destructive/20"
          >
            {/* top accent */}
            <motion.div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-destructive/15 blur-3xl" />

            {/* header */}
            <div className="relative px-6 pt-6 pb-4">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition hover:border-destructive/40 hover:text-destructive hover:rotate-90"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: [0, -6, 6, -4, 4, 0], scale: 1 }}
                  transition={{ duration: 0.9 }}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-destructive to-destructive/70 text-destructive-foreground shadow-lg shadow-destructive/30"
                >
                  <AlertTriangle className="h-6 w-6" />
                </motion.div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-destructive">
                    <ShieldAlert className="h-3 w-3" /> irreversible
                  </div>
                  <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
                    {t('deleteBookingTitle')}
                  </h1>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">
                    {t('deleteBookingSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* scroll body */}
            <div className="relative flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {/* booking summary */}
              <div className="rounded-2xl border border-border/70 bg-background/70 p-3.5 shadow-inner space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {t('bookingSummary')}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1"
                    style={{ background: `${cfg.color}1a`, color: cfg.color, borderColor: `${cfg.color}40` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
                    {cfg.label[lang]}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
                    <BedDouble className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-black text-foreground leading-tight truncate">
                      {booking.guestName || (lang === 'ru' ? 'Гость' : 'Guest')}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {t('room')} {booking.roomNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                  <Chip icon={<CalendarDays className="h-3.5 w-3.5 text-primary" />} label={t('checkIn')} value={format(parseISO(booking.checkIn), 'd MMM yyyy')} />
                  <Chip icon={<CalendarDays className="h-3.5 w-3.5 text-destructive" />} label={t('checkOut')} value={format(parseISO(booking.checkOut), 'd MMM yyyy')} />
                  <Chip icon={<Users className="h-3.5 w-3.5 text-primary/70" />} label={t('guests')} value={`${booking.guestCount}`} />
                  <Chip icon={<span className="text-primary/70 font-black text-[11px]">N</span>} label={t('nightsShort')} value={`${nights}`} />
                </div>
              </div>

              {/* preset reasons */}
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70">
                  <FileWarning className="h-3 w-3 text-destructive" />
                  {t('reasonPreset')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetReasons.map((p) => {
                    const active = reason.trim() === p.label;
                    return (
                      <motion.button
                        key={p.key}
                        type="button"
                        onClick={() => setReason(p.label)}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                          active
                            ? 'bg-destructive text-destructive-foreground shadow-md shadow-destructive/30'
                            : 'bg-background border border-border/70 text-muted-foreground hover:border-destructive/30 hover:text-foreground'
                        }`}
                      >
                        {p.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* free text reason */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                  {t('reasonLabel')} <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('reasonPlaceholder')}
                  rows={3}
                  className="rounded-xl resize-none border-2 bg-background/80 focus-visible:border-destructive/50"
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className={reasonValid ? 'text-emerald-600 font-bold' : ''}>
                    {trimmed.length}/10+ {lang === 'ru' ? 'символов' : lang === 'uz' ? 'belgi' : 'chars'}
                  </span>
                  {reasonValid && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
              </div>

              {/* acknowledge */}
              <label className="flex items-start gap-2.5 rounded-xl border-2 border-destructive/20 bg-destructive/5 p-3 cursor-pointer hover:bg-destructive/10 transition-colors">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(!!v)}
                  className="mt-0.5 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                />
                <span className="text-[12px] font-semibold text-foreground leading-snug">
                  {t('iUnderstand')}
                </span>
              </label>
            </div>

            {/* footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-border/60 bg-background/70 px-6 py-3.5 backdrop-blur">
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                {t('cancel')}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canDelete}
                className="rounded-xl bg-destructive px-6 text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t('confirmDelete')}
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-[12px] font-black tabular-nums text-foreground truncate">{value}</div>
    </div>
  );
}
