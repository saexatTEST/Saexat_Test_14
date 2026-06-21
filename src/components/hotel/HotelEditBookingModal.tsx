import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Booking, type BookingStatus, BOOKING_STATUSES, formatGuestName } from '@/types/hotel';
import {
  Edit, Trash2, UserPlus, Phone, Mail, CalendarDays, Users, StickyNote, Clock,
  ClipboardSignature, Sparkles, MessageCircle, Send, Instagram, User, ArrowRight, X, DollarSign,
} from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { differenceInCalendarDays, parseISO, format, addDays } from 'date-fns';
import { HotelGuestAnketaModal } from './HotelGuestAnketaModal';
import { DeleteBookingModal } from './DeleteBookingModal';
import { HotelDatePicker } from './HotelDatePicker';
import { useHotelGrid } from '@/hooks/HotelGridContext';
import { validateContactBundle, isValidEmail, isValidPhone, isValidHandle } from '@/lib/contactValidation';

const nextDay = (iso: string) => format(addDays(parseISO(iso), 1), 'yyyy-MM-dd');
const prevDay = (iso: string) => format(addDays(parseISO(iso), -1), 'yyyy-MM-dd');
const todayISOStr = () => format(new Date(), 'yyyy-MM-dd');

// Note: we intentionally do NOT split a freeform `guestName` back into
// surname/name/middle-name fields. Names like "baxtiyor ogli" contain spaces
// and would otherwise leak across fields. Structured fields are the source of
// truth; the legacy `guestName` is rebuilt on save for back-compat only.
interface EditBookingModalProps {
  open: boolean; onClose: () => void;
  onSave: (booking: Booking) => boolean | void;
  onUpdate: (id: string, updates: Partial<Booking>) => boolean | void;
  onDelete: (id: string) => void;
  roomNumber: number; booking: Booking | null;
}

export function HotelEditBookingModal({ open, onClose, onSave, onUpdate, onDelete, roomNumber, booking }: EditBookingModalProps) {
  const { t, lang } = useI18n();
  const { rooms, categories, categoryRates } = useHotelGrid();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestWhatsapp, setGuestWhatsapp] = useState('');
  const [guestTelegram, setGuestTelegram] = useState('');
  const [guestInstagram, setGuestInstagram] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [status, setStatus] = useState<BookingStatus>('booked');
  const [price, setPrice] = useState('');
  const [anketaOpen, setAnketaOpen] = useState(false);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const [surnameGlow, setSurnameGlow] = useState(false);
  useEffect(() => {
    if (!open) { setSurnameGlow(false); return; }
    const f = setTimeout(() => { lastNameRef.current?.focus(); setSurnameGlow(true); }, 180);
    const o = setTimeout(() => setSurnameGlow(false), 1600);
    return () => { clearTimeout(f); clearTimeout(o); };
  }, [open]);

  

  useEffect(() => {
    if (booking) {
      const hasStructured =
        booking.guestLastName !== undefined ||
        booking.guestFirstName !== undefined ||
        booking.guestMiddleName !== undefined;
      if (hasStructured) {
        setLastName(booking.guestLastName || '');
        setFirstName(booking.guestFirstName || '');
        setMiddleName(booking.guestMiddleName || '');
      } else {
        // Legacy bookings: drop full string into firstName so we never
        // silently scatter user input across surname/middle-name fields.
        setLastName('');
        setFirstName((booking.guestName || '').trim());
        setMiddleName('');
      }
      setGuestPhone(booking.guestPhone);
      setGuestWhatsapp(booking.guestWhatsapp || ''); setGuestTelegram(booking.guestTelegram || ''); setGuestInstagram(booking.guestInstagram || '');
      setGuestEmail(booking.guestEmail); setGuestCount(booking.guestCount);
      setNotes(booking.notes); setCheckIn(booking.checkIn); setCheckOut(booking.checkOut); setStatus(booking.status);
      setPrice(booking.price !== undefined ? String(booking.price) : '');
    } else {
      setFirstName(''); setLastName(''); setMiddleName(''); setGuestPhone(''); setGuestEmail('');
      setGuestCount(Math.max(1, categories.find((c) => c.id === (rooms.find((r) => r.number === roomNumber)?.category ?? ''))?.maxGuests ?? 1));
      setGuestWhatsapp(''); setGuestTelegram(''); setGuestInstagram('');
      setNotes('');
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      setCheckIn(today); setCheckOut(tomorrow); setStatus('booked');
      setPrice('');
    }
  }, [booking, open]);

  const nights = checkIn && checkOut ? differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)) : 0;

  // Auto-calc price = nights × sum(per-guest prices for the booked guest count).
  // (rooms/categories/categoryRates already destructured at the top of this component)
  const categoryId = useMemo(() => rooms.find((r) => r.number === roomNumber)?.category ?? '', [rooms, roomNumber]);
  const residency = (booking?.residency ?? 'resident') as 'resident' | 'nonResident';
  const perNightRate = useMemo(() => {
    if (!categoryId) return 0;
    const arr = (categoryRates[categoryId]?.[residency] ?? []) as number[];
    if (arr.length === 0) return 0;
    const n = Math.max(1, Number(guestCount) || 1);
    const maxG = arr.length;
    const within = Math.min(n, maxG);
    const base = Number(arr[within - 1]) || 0;
    const extras = Math.max(0, n - maxG);
    const extraRate = Number(arr[0]) || 0;
    return base + extras * extraRate;
  }, [categoryRates, categoryId, residency, guestCount]);
  const autoTotal = nights > 0 && perNightRate > 0 ? Math.round(nights * perNightRate) : 0;
  useEffect(() => {
    if (!open) return;
    if (!price.trim() && autoTotal > 0) setPrice(String(autoTotal));
    if (!booking && autoTotal > 0) setPrice(String(autoTotal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTotal, open, booking]);
  const guestName = useMemo(
    () => [lastName.trim(), firstName.trim(), middleName.trim()].filter(Boolean).join(' '),
    [lastName, firstName, middleName],
  );

  const statusCfg = BOOKING_STATUSES[status];

  const handleSave = () => {
    if (!guestName || !checkIn || !checkOut) return;
    const contactError = validateContactBundle({ phone: guestPhone, whatsapp: guestWhatsapp, email: guestEmail, telegram: guestTelegram, instagram: guestInstagram });
    if (contactError) {
      toast.error(contactError.message);
      return;
    }
    const nameFields = {
      guestLastName: lastName.trim(),
      guestFirstName: firstName.trim(),
      guestMiddleName: middleName.trim(),
    };
    const parsedPrice = Number(price);
    const cleanPrice = price.trim() && Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : undefined;
    if (booking) {
      const ok = onUpdate(booking.id, { guestName, ...nameFields, guestPhone, guestWhatsapp, guestTelegram, guestInstagram, guestEmail, guestCount, checkIn, checkOut, notes, status, price: cleanPrice });
      if (ok === false) return;
    } else {
      const ok = onSave({ id: crypto.randomUUID(), roomNumber, guestName, ...nameFields, guestPhone, guestWhatsapp, guestTelegram, guestInstagram, guestEmail, guestCount, checkIn, checkOut, notes, status, price: cleanPrice, createdAt: new Date().toISOString() });
      if (ok === false) return;
    }
    toast.success(t('bookingSaved'));
    onClose();
  };

  const handleDelete = () => {
    if (!booking) return;
    setDeleteOpen(true);
  };

  const isEditing = !!booking;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[860px] p-0 overflow-hidden border-0 bg-transparent shadow-none [&>button.absolute]:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(2px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl bg-card shadow-[0_40px_90px_-25px_rgba(0,0,0,0.55)] ring-1 ring-foreground/10"
        >
          {/* Decorative top accent */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/12 via-primary/4 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />

          {/* HEADER */}
          <div className="relative px-7 pt-6 pb-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
                  {isEditing ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                </div>
                <div className="text-left">
                  <span className="font-display block text-xl font-black tracking-tight text-foreground">
                    {isEditing ? t('editBooking') : t('newBooking')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.color }} />
                    {t('room')} {roomNumber} · {statusCfg.label[lang]}
                  </span>
                </div>
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isEditing ? t('editBooking') : t('newBooking')} — {t('room')} {roomNumber}
              </DialogDescription>
            </DialogHeader>

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition hover:border-destructive/40 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* BODY */}
          <div className="relative max-h-[72vh] overflow-y-auto px-7 pb-5 space-y-4">
            {/* Stay summary chip */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-gradient-to-r from-accent/60 to-accent/20 px-4 py-2.5 text-[12px] text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="font-medium">{t('checkInOutInfo')}</span>
              {nights > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 font-black text-primary">
                  {nights} {t('nightsShort')}
                </span>
              )}
            </div>




            {/* Row: Surname + Name + Middle name */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FieldShell label={t('lastName')} icon={<User className="h-3 w-3" />}>
                <Input ref={lastNameRef} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('lastNamePlaceholder')} className={`h-10 rounded-lg transition-all duration-500 ${surnameGlow ? 'ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary-hsl)/0.18),0_0_24px_hsl(var(--primary-hsl)/0.45)]' : ''}`} />
              </FieldShell>
              <FieldShell label={t('firstName')} icon={<User className="h-3 w-3" />} required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('firstNamePlaceholder')} className="h-10 rounded-lg" />
              </FieldShell>
              <FieldShell label={t('middleName')} icon={<User className="h-3 w-3" />}>
                <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder={t('middleNamePlaceholder')} className="h-10 rounded-lg" />
              </FieldShell>
            </div>

            {/* Row: Check-in + Check-out */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FieldShell label={t('checkIn')} icon={<CalendarDays className="h-3 w-3 text-emerald-500" />} required>
                <HotelDatePicker
                  label={t('checkIn')}
                  value={checkIn}
                  min={todayISOStr()}
                  onChange={(v) => {
                    setCheckIn(v);
                    if (v && checkOut && parseISO(checkOut) <= parseISO(v)) setCheckOut(nextDay(v));
                  }}
                  required
                  compact
                  showLabel={false}
                />
              </FieldShell>
              <FieldShell label={t('checkOut')} icon={<CalendarDays className="h-3 w-3 text-rose-500" />} required>
                <HotelDatePicker
                  label={t('checkOut')}
                  value={checkOut}
                  min={checkIn ? nextDay(checkIn) : undefined}
                  onChange={(v) => {
                    setCheckOut(v);
                    if (v && checkIn && parseISO(v) <= parseISO(checkIn)) setCheckIn(prevDay(v));
                  }}
                  required
                  compact
                  showLabel={false}
                />
              </FieldShell>
            </div>

            {/* Two columns: contact panel + side fields */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              {/* CONTACT PANEL */}
              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-accent/40 to-transparent p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/75">
                    {t('contactMethods')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldShell label={t('phone')} icon={<Phone className="h-3 w-3 text-primary/70" />}>
                    <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value.slice(0, 20))} maxLength={20} inputMode="tel" placeholder="+998 90 123 45 67" aria-invalid={!isValidPhone(guestPhone)} className={`h-9 rounded-lg ${!isValidPhone(guestPhone) ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}`} />
                  </FieldShell>
                  <FieldShell label={t('whatsapp')} icon={<MessageCircle className="h-3 w-3 text-emerald-500" />}>
                    <Input value={guestWhatsapp} onChange={(e) => setGuestWhatsapp(e.target.value.slice(0, 20))} maxLength={20} inputMode="tel" placeholder="+998 90 123 45 67" aria-invalid={!isValidPhone(guestWhatsapp)} className={`h-9 rounded-lg ${!isValidPhone(guestWhatsapp) ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}`} />
                  </FieldShell>
                  <FieldShell label={t('telegram')} icon={<Send className="h-3 w-3 text-sky-500" />}>
                    <Input value={guestTelegram} onChange={(e) => setGuestTelegram(e.target.value.slice(0, 32))} maxLength={32} placeholder={t('telegramPlaceholder')} aria-invalid={!isValidHandle(guestTelegram)} className={`h-9 rounded-lg ${!isValidHandle(guestTelegram) ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}`} />
                  </FieldShell>
                  <FieldShell label={t('instagram')} icon={<Instagram className="h-3 w-3 text-pink-500" />}>
                    <Input value={guestInstagram} onChange={(e) => setGuestInstagram(e.target.value.slice(0, 32))} maxLength={32} placeholder={t('instagramPlaceholder')} aria-invalid={!isValidHandle(guestInstagram)} className={`h-9 rounded-lg ${!isValidHandle(guestInstagram) ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}`} />
                  </FieldShell>
                  <div className="col-span-2">
                    <FieldShell label={t('email')} icon={<Mail className="h-3 w-3 text-primary/70" />}>
                      <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value.slice(0, 80))} maxLength={80} placeholder="email@example.com" aria-invalid={!isValidEmail(guestEmail)} className={`h-9 rounded-lg ${!isValidEmail(guestEmail) ? 'border-destructive/60 focus-visible:ring-destructive/40' : ''}`} />
                    </FieldShell>
                  </div>
                </div>
              </div>

              {/* SIDE: guests + status + notes */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FieldShell label={t('guests')} icon={<Users className="h-3 w-3 text-primary/70" />}>
                    <Input type="number" min={1} max={10} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="h-10 rounded-lg tabular-nums" />
                  </FieldShell>
                  <FieldShell label={lang === 'ru' ? 'Цена (сум)' : lang === 'uz' ? 'Narx (so\u02bcm)' : 'Price (UZS)'} icon={<span className="text-[10px] font-black text-emerald-500">сум</span>}>
                    <Input type="number" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={autoTotal > 0 ? String(autoTotal) : '0'} className="h-10 rounded-lg tabular-nums" />
                  </FieldShell>
                  <FieldShell label={t('status')}>
                    <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                      <SelectTrigger className="h-10 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(Object.entries(BOOKING_STATUSES) as [BookingStatus, typeof BOOKING_STATUSES[BookingStatus]][])
                          .filter(([key]) => key !== 'confirmed')
                          .map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: cfg.color }} />
                              <span className="font-medium">{cfg.label[lang]}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldShell>
                </div>
                <FieldShell label={t('notes')} icon={<StickyNote className="h-3 w-3 text-primary/70" />}>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('specialRequests')}
                    rows={4}
                    className="resize-none rounded-lg"
                  />
                </FieldShell>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="relative flex items-center justify-between gap-3 border-t border-border/60 bg-background/60 px-7 py-4 backdrop-blur">
            <div className="flex items-center gap-2">
              {isEditing && (
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5 rounded-xl shadow-sm shadow-destructive/30">
                  <Trash2 className="h-3.5 w-3.5" />{t('delete')}
                </Button>
              )}
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnketaOpen(true)}
                  className="gap-1.5 rounded-xl border-primary/35 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <ClipboardSignature className="h-3.5 w-3.5" />
                  {t('openAnketa')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!guestName || !checkIn || !checkOut}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/85 px-5 shadow-md shadow-primary/30 hover:from-primary hover:to-primary"
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>

      <HotelGuestAnketaModal
        open={anketaOpen}
        onClose={() => setAnketaOpen(false)}
        booking={booking}
      />
      <DeleteBookingModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        booking={booking}
        onConfirm={(id) => {
          onDelete?.(id);
          setDeleteOpen(false);
          onClose();
        }}
      />
    </Dialog>
  );
}

/* ---------- Field shell — consistent label+input pairing ---------- */
function FieldShell({
  label,
  icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-muted-foreground">
        {icon}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

