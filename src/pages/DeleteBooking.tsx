import { useState, useMemo } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Trash2, CalendarDays, Users, Phone, Mail, BedDouble, Check, ShieldAlert, FileWarning } from 'lucide-react';
import { useBookingsContext } from '@/hooks/BookingsContext';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BOOKING_STATUSES } from '@/types/hotel';
import { toast } from 'sonner';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export default function DeleteBookingPage({ bookingId }: { bookingId?: string }) {
  const navigate = useNavigate();
  const { bookings, removeBooking } = useBookingsContext();
  const { t, lang } = useI18n();

  const booking = useMemo(() => bookings.find(b => b.id === bookingId), [bookings, bookingId]);

  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-black">{lang === 'ru' ? 'Бронирование не найдено' : lang === 'uz' ? 'Bron topilmadi' : 'Booking not found'}</h1>
          <Button asChild className="rounded-xl">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1.5 inline" />{t('back')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cfg = BOOKING_STATUSES[booking.status];
  const nights = differenceInCalendarDays(parseISO(booking.checkOut), parseISO(booking.checkIn));

  const presetReasons: { key: string; label: string }[] = [
    { key: 'guestCancelled', label: t('reasonGuestCancelled') },
    { key: 'noShow', label: t('reasonNoShow') },
    { key: 'duplicate', label: t('reasonDuplicate') },
    { key: 'createdInError', label: t('reasonError') },
    { key: 'other', label: t('reasonOther') },
  ];

  const trimmedReason = reason.trim();
  const reasonValid = trimmedReason.length >= 10;
  const canDelete = reasonValid && acknowledged && !submitting;

  const handleConfirm = () => {
    if (!canDelete) {
      if (!reasonValid) toast.error(t('reasonRequired'));
      return;
    }
    setSubmitting(true);
    removeBooking(booking.id);
    toast.success(t('bookingDeleted'));
    setTimeout(() => navigate({ to: '/' }), 200);
  };

  return (
    <div className="delete-bg min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <button
          onClick={() => navigate({ to: '/' })}
          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {t('back')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="danger-glow relative overflow-hidden rounded-[32px] border border-destructive/35 bg-card shadow-2xl shadow-destructive/10"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40" />
          <div className="guest-holo-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-destructive/15 blur-3xl" />

          <div className="px-7 pt-7 pb-5">
            <div className="flex items-start gap-4">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
              >
                <AlertTriangle className="h-6 w-6" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" /> irreversible action
                </div>
                <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
                  {t('deleteBookingTitle')}
                </h1>
                <p className="mt-1 max-w-xl text-sm font-semibold leading-relaxed text-muted-foreground">
                  {t('deleteBookingSubtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="px-7 pb-5">
            <div className="rounded-[24px] border border-border/70 bg-background/75 p-4 shadow-inner space-y-3">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-sm">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-black text-foreground leading-tight">
                    {booking.guestName || (lang === 'ru' ? 'Гость' : 'Guest')}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    {t('room')} {booking.roomNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
                <SummaryChip icon={<CalendarDays className="h-3.5 w-3.5 text-primary" />} label={t('checkIn')} value={format(parseISO(booking.checkIn), 'd MMM yyyy')} />
                <SummaryChip icon={<CalendarDays className="h-3.5 w-3.5 text-destructive" />} label={t('checkOut')} value={format(parseISO(booking.checkOut), 'd MMM yyyy')} />
                <SummaryChip icon={<Users className="h-3.5 w-3.5 text-primary/70" />} label={t('guests')} value={`${booking.guestCount}`} />
                <SummaryChip icon={<span className="text-primary/70 font-black text-[11px]">N</span>} label={t('nightsShort')} value={`${nights}`} />
              </div>

              {(booking.guestPhone || booking.guestEmail) && (
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted-foreground border-t border-border/50">
                  {booking.guestPhone && (
                    <span className="inline-flex items-center gap-1 pt-2">
                      <Phone className="h-3 w-3 text-primary/70" /> {booking.guestPhone}
                    </span>
                  )}
                  {booking.guestEmail && (
                    <span className="inline-flex items-center gap-1 pt-2 truncate">
                      <Mail className="h-3 w-3 text-primary/70" /> {booking.guestEmail}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-7 pb-7 space-y-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70">
                <FileWarning className="h-3.5 w-3.5 text-destructive" />
                {t('reasonPreset')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetReasons.map((p) => {
                  const active = reason.trim() === p.label;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setReason(p.label)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                        active
                          ? 'bg-destructive text-destructive-foreground shadow-md shadow-destructive/30 scale-[1.03]'
                          : 'bg-background border border-border/70 text-muted-foreground hover:border-destructive/30 hover:text-foreground hover:scale-[1.02]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                {t('reasonLabel')} <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                rows={4}
                className="input-focus-glow rounded-2xl resize-none border-2 bg-background/80 focus-visible:border-destructive/50"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className={reasonValid ? 'text-emerald-600 font-bold' : ''}>
                  {trimmedReason.length}/10+ {lang === 'ru' ? 'символов' : lang === 'uz' ? 'belgi' : 'chars'}
                </span>
                {reasonValid && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-3 cursor-pointer hover:bg-destructive/10 transition-colors">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/60 bg-background/70 px-7 py-4 backdrop-blur">
            <Button variant="outline" onClick={() => navigate({ to: '/' })} className="rounded-2xl">
              <ArrowLeft className="h-4 w-4 mr-1.5" />{t('cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canDelete}
              className="rounded-2xl bg-destructive px-6 text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {t('confirmDelete')}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SummaryChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-[12px] font-black tabular-nums text-foreground truncate">{value}</div>
    </div>
  );
}
