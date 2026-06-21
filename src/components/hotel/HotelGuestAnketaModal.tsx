import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Booking } from '@/types/hotel';
import { useI18n } from '@/hooks/useI18n';
import { toast } from 'sonner';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  Download,
  Eraser,
  Hotel,
  PenLine,
  Printer,
  X,
  User,
  FileText,
  BedDouble,
  Phone,
  ScrollText,
  Usb,
  Radio,
} from 'lucide-react';
import { useSignaturePadHID, type HIDSample } from '@/hooks/useSignaturePadHID';
import { UnsavedCloseWarning } from './UnsavedCloseWarning';
import { HotelDatePicker } from './HotelDatePicker';
import { CountrySelect } from './CountrySelect';
import { isValidEmail, isValidPhone } from '@/lib/contactValidation';
import { useHotelGrid } from '@/hooks/HotelGridContext';
import { useServerFn } from '@tanstack/react-start';
import { getHotelState, setHotelState } from '@/lib/hotel-state.functions';
import { useBookingsContext } from '@/hooks/BookingsContext';
import { supabase } from '@/integrations/supabase/client';

interface AnketaModalProps {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
}

type AnketaForm = {
  fullName: string;
  birthDate: string;
  birthPlace: string;
  passportNumber: string;
  passportIssueDate: string;
  passportValidUntil: string;
  arrivedFrom: string;
  citizenship: string;
  phone: string;
  email: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  signature: string;
  signatureImage: string;
  acknowledgedName: string;
  acknowledged: boolean;
};

const ANKETA_STATE_KEY = 'anketa-records';
const PASSPORT_STATE_KEY = 'passport-records';

type StoredPassport = Partial<{
  lastName: string; firstName: string; middleName: string;
  passportSeries: string; passportNumber: string; pinfl: string;
  birthDate: string; issueDate: string; expiryDate: string;
  issuedBy: string; citizenship: string; nationality: string;
  gender: string; address: string;
}>;

function bookingFullName(b: Booking | null): string {
  if (!b) return '';
  const last = (b.guestLastName || '').trim();
  const first = (b.guestFirstName || '').trim();
  const middle = (b.guestMiddleName || '').trim();
  if (last || first || middle) return [last, first, middle].filter(Boolean).join(' ');
  return (b.guestName || '').trim();
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] ?? '',
    firstName: parts[1] ?? '',
    middleName: parts.slice(2).join(' '),
  };
}

const emptyForm = (booking: Booking | null): AnketaForm => {
  const name = bookingFullName(booking);
  return {
    fullName: name,
    birthDate: '',
    birthPlace: '',
    passportNumber: '',
    passportIssueDate: '',
    passportValidUntil: '',
    arrivedFrom: '',
    citizenship: '',
    phone: booking?.guestPhone ?? '',
    email: booking?.guestEmail ?? '',
    roomNumber: booking ? String(booking.roomNumber) : '',
    roomType: '',
    checkIn: booking?.checkIn ?? '',
    checkOut: booking?.checkOut ?? '',
    signature: '',
    signatureImage: '',
    acknowledgedName: name,
    acknowledged: false,
  };
};

function mergePassportIntoForm(form: AnketaForm, passport: StoredPassport): AnketaForm {
  const combined = [passport.lastName, passport.firstName, passport.middleName]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ');
  return {
    ...form,
    fullName: combined || form.fullName,
    acknowledgedName: combined || form.acknowledgedName || form.fullName,
    birthDate: passport.birthDate || form.birthDate,
    passportIssueDate: passport.issueDate || form.passportIssueDate,
    passportValidUntil: passport.expiryDate || form.passportValidUntil,
    birthPlace: passport.address || form.birthPlace,
    citizenship: passport.citizenship || form.citizenship,
  };
}

export function HotelGuestAnketaModal({ open, onClose, booking }: AnketaModalProps) {
  const { t, lang } = useI18n();
  const { categories, rooms } = useHotelGrid();
  const [form, setForm] = useState<AnketaForm>(() => emptyForm(booking));

  const { updateBooking } = useBookingsContext();
  const getSharedState = useServerFn(getHotelState);
  const setSharedState = useServerFn(setHotelState);
  const anketaVersionRef = useRef<number | null>(null);
  const passportVersionRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const detectedCategoryId = useMemo(() => {
    if (!booking) return '';
    const room = rooms.find((r) => r.number === booking.roomNumber);
    return room?.category ?? '';
  }, [booking, rooms]);
  const [dirty, setDirty] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);

  const loadSharedForm = useCallback(async () => {
    if (!booking) return;
    let base = emptyForm(booking);

    const anketaRow = await getSharedState({ data: { key: ANKETA_STATE_KEY } });
    if (anketaRow?.stateData) {
      anketaVersionRef.current = anketaRow.version;
      const records =
        typeof anketaRow.stateData === 'object' && !Array.isArray(anketaRow.stateData)
          ? (anketaRow.stateData as Record<string, Partial<AnketaForm>>)
          : {};
      base = { ...base, ...(records[booking.id] ?? {}) };
    }

    const passportRow = await getSharedState({ data: { key: PASSPORT_STATE_KEY } });
    if (passportRow?.stateData) {
      passportVersionRef.current = passportRow.version;
      const records =
        typeof passportRow.stateData === 'object' && !Array.isArray(passportRow.stateData)
          ? (passportRow.stateData as Record<string, StoredPassport>)
          : {};
      const passport = records[`booking:${booking.id}`];
      if (passport) base = mergePassportIntoForm(base, passport);
    }

    if (detectedCategoryId) base.roomType = detectedCategoryId;
    setForm(base);
  }, [booking, detectedCategoryId, getSharedState]);

  useEffect(() => {
    if (!open) return;
    if (!booking) { setForm(emptyForm(null)); return; }
    void loadSharedForm().catch(() => setForm(emptyForm(booking)));
    const id = window.setInterval(() => {
      void loadSharedForm().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [open, booking, loadSharedForm]);

  useEffect(() => {
    if (!open || !booking) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`anketa_live_${booking.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hotel_app_state' },
          (payload) => {
            const row = payload.new as { state_key?: string; state_data?: unknown; version?: number };
            if (!row?.state_key || !row.state_data) return;

            if (row.state_key === ANKETA_STATE_KEY) {
              const version = Number(row.version ?? 0);
              if (anketaVersionRef.current !== null && version <= anketaVersionRef.current) return;
              anketaVersionRef.current = version;
              const records =
                typeof row.state_data === 'object' && !Array.isArray(row.state_data)
                  ? (row.state_data as Record<string, Partial<AnketaForm>>)
                  : {};
              const remote = records[booking.id];
              if (remote) {
                setForm((prev) => ({
                  ...prev,
                  ...remote,
                  roomType: detectedCategoryId || remote.roomType || prev.roomType,
                }));
              }
            }

            if (row.state_key === PASSPORT_STATE_KEY) {
              const version = Number(row.version ?? 0);
              if (passportVersionRef.current !== null && version <= passportVersionRef.current) return;
              passportVersionRef.current = version;
              const records =
                typeof row.state_data === 'object' && !Array.isArray(row.state_data)
                  ? (row.state_data as Record<string, StoredPassport>)
                  : {};
              const passport = records[`booking:${booking.id}`];
              if (passport) setForm((prev) => mergePassportIntoForm(prev, passport));
            }
          },
        )
        .subscribe();
    } catch {
      // polling is fallback
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [open, booking, detectedCategoryId]);

  const saveSharedAnketa = useCallback(
    (nextForm: AnketaForm) => {
      if (!booking) return;

      updateBooking(booking.id, {
        guestName: nextForm.fullName,
        guestPhone: nextForm.phone,
        guestEmail: nextForm.email,
        checkIn: nextForm.checkIn,
        checkOut: nextForm.checkOut,
        roomNumber: Number(nextForm.roomNumber) || booking.roomNumber,
        guestBirthDate: nextForm.birthDate,
        guestCitizenship: nextForm.citizenship,
        anketa: {
          fullName: nextForm.fullName,
          birthDate: nextForm.birthDate,
          citizenship: nextForm.citizenship,
          phone: nextForm.phone,
          email: nextForm.email,
          roomNumber: nextForm.roomNumber,
          checkIn: nextForm.checkIn,
          checkOut: nextForm.checkOut,
          signatureImage: nextForm.signatureImage,
          acknowledgedName: nextForm.acknowledgedName,
          acknowledged: nextForm.acknowledged,
        },
      } as any);

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        try {
          const anketaRow = await getSharedState({ data: { key: ANKETA_STATE_KEY } });
          const anketaRecords =
            anketaRow?.stateData &&
            typeof anketaRow.stateData === 'object' &&
            !Array.isArray(anketaRow.stateData)
              ? (anketaRow.stateData as Record<string, AnketaForm>)
              : {};

          const savedAnketa = await setSharedState({
            data: {
              key: ANKETA_STATE_KEY,
              stateData: { ...anketaRecords, [booking.id]: nextForm },
              expectedVersion: anketaRow?.version ?? anketaVersionRef.current,
            },
          });
          anketaVersionRef.current = savedAnketa.version;

          const name = splitFullName(nextForm.fullName);
          const passportRow = await getSharedState({ data: { key: PASSPORT_STATE_KEY } });
          const passportRecords =
            passportRow?.stateData &&
            typeof passportRow.stateData === 'object' &&
            !Array.isArray(passportRow.stateData)
              ? (passportRow.stateData as Record<string, StoredPassport>)
              : {};
          const passportKey = `booking:${booking.id}`;
          const previousPassport = passportRecords[passportKey] ?? {};

          const savedPassport = await setSharedState({
            data: {
              key: PASSPORT_STATE_KEY,
              stateData: {
                ...passportRecords,
                [passportKey]: {
                  ...previousPassport,
                  lastName: name.lastName || previousPassport.lastName || '',
                  firstName: name.firstName || previousPassport.firstName || '',
                  middleName: name.middleName || previousPassport.middleName || '',
                  birthDate: nextForm.birthDate,
                  citizenship: nextForm.citizenship,
                },
              },
              expectedVersion: passportRow?.version ?? passportVersionRef.current,
            },
          });
          passportVersionRef.current = savedPassport.version;
        } catch {
          // cloud temporarily unavailable
        }
      }, 120);
    },
    [booking, updateBooking, getSharedState, setSharedState],
  );

  const update = <K extends keyof AnketaForm>(key: K, value: AnketaForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'fullName' && !prev.acknowledgedName) {
        next.acknowledgedName = String(value);
      }
      saveSharedAnketa(next);
      return next;
    });
    setDirty(true);
  };

  useEffect(() => {
    if (open) setDirty(false);
  }, [open]);

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    try {
      return Math.max(0, differenceInCalendarDays(parseISO(form.checkOut), parseISO(form.checkIn)));
    } catch {
      return 0;
    }
  }, [form.checkIn, form.checkOut]);

  const completion = useMemo(() => {
    const required: (keyof AnketaForm)[] = [
      'fullName', 'birthDate',
      'citizenship', 'phone',
      'roomNumber', 'checkIn', 'checkOut',
    ];
    const filled = required.filter((k) => String(form[k] ?? '').trim().length > 0).length;
    const sigOk = !!form.signatureImage ? 1 : 0;
    return Math.round(((filled + sigOk) / (required.length + 1)) * 100);
  }, [form]);

  const hasSignature = !!form.signatureImage;

  const handleSave = () => {
    if (!booking) return;
    if (!form.fullName.trim() || !hasSignature || !form.acknowledged) {
      toast.error(t('anketaIncomplete'));
      return;
    }
    if (!isValidPhone(form.phone)) {
      toast.error('Телефон должен быть в формате +998 90 123 45 67');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('Эл. почта должна содержать «@» — например email@example.com');
      return;
    }
    saveSharedAnketa(form);
    toast.success(t('anketaSaved'));
    setDirty(false);
    onClose();
  };

  const requestClose = useCallback(() => {
    if (dirty) {
      setWarnOpen(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  if (!booking) return null;

  const L = (ru: string, uz: string) => (lang === 'ru' ? ru : uz);

  const fmtDate = (iso: string) => {
    if (!iso) return '';
    try { return format(parseISO(iso), 'dd.MM.yyyy'); } catch { return iso; }
  };

  const renderPaperForm = (copyIndex: number) => (
    <div className="paper-sheet" key={copyIndex}>
      <div className="paper-title">{L('Анкета', 'Anketa')}</div>
      <div className="paper-subtitle">
        ({L('заселяющегося гостя в гостиницу Sayoxat', "Sayoxat mehmonxonasiga joylashayotgan mehmon")})
      </div>

      <div className="paper-row">
        <span className="paper-label">{L('Ф.И.О', 'F.I.Sh')}</span>
        <span className="paper-line">{form.fullName}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">{L('Дата рождения', "Tug'ilgan sana")}</span>
        <span className="paper-line">{fmtDate(form.birthDate)}</span>
      </div>


      <div className="paper-row paper-row-split">
        <span className="paper-label">{L('Дата въезда в гостиницу', 'Mehmonxonaga kirish sanasi')}</span>
        <span className="paper-line">{fmtDate(form.checkIn)}</span>
        <span className="paper-label">{L('дата выезда из гостиницы', 'mehmonxonadan chiqish sanasi')}</span>
        <span className="paper-line">{fmtDate(form.checkOut)}</span>
      </div>

      <div className="paper-row paper-row-split">
        <span className="paper-label">{L('гражданство', 'fuqaroligi')}</span>
        <span className="paper-line">{form.citizenship}</span>
      </div>

      <div className="paper-row paper-row-split">
        <span className="paper-label">{L('телефон', 'telefon')}</span>
        <span className="paper-line">{form.phone}</span>
        <span className="paper-label">{L('эл. адрес', 'el. pochta')}</span>
        <span className="paper-line">{form.email}</span>
      </div>

      <div className="paper-row">
        <span className="paper-label">{L('№ комнаты', 'Xona №')}</span>
        <span className="paper-line">{form.roomNumber}</span>
      </div>

      <div className="paper-rules">
        <span className="paper-rules-title">
          {L('Правила размещения в гостиницу Saёхat:', "«Sayohat» mehmonxonasida joylashish qoidalari:")}
        </span>{' '}
        {L(
          'Расчётный час в 12:00. Ранний заезд с 7:00 до 12:00 — взымается 50% от стоимости номера. Поздний выезд с 14:00 до 18:00 — взымается 50% от стоимости номера. При выезде после 18:00 — взымается 100% стоимости номера. Оплата перед заселением.',
          "Hisob-kitob vaqti — 12:00. Erta kirish (07:00–12:00) — narxning 50%. Kech chiqish (14:00–18:00) — 50%. 18:00 dan keyin — 100%. Joylashishdan oldin to'lov."
        )}
      </div>

      <div className="paper-sign-row">
        <span className="paper-label">{L('Ознакомлен Ф.И.О', "Tanishib chiqdim F.I.Sh")}</span>
        <span className="paper-sign-name">{form.acknowledgedName || form.fullName}</span>
        <span className="paper-label">{L('подпись', 'imzo')}</span>
        <span className="paper-sign-box">
          {form.signatureImage ? <img src={form.signatureImage} alt="signature" /> : null}
        </span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent
        className="sm:max-w-[1040px] p-0 overflow-hidden border-0 shadow-none bg-transparent rounded-2xl print:max-w-none [&>button.absolute]:hidden"
      >
        <DialogTitle className="sr-only">{t('anketaTitle')}</DialogTitle>

        {/* PRINT-ONLY: paper-style anketa, portaled to body so it escapes dialog transforms */}
        {typeof document !== 'undefined' && createPortal(
          <div className="anketa-print-sheet" aria-hidden>
            {Array.from({ length: 1 }, (_, index) => renderPaperForm(index))}
          </div>,
          document.body
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="relative anketa-shell rounded-2xl overflow-hidden shadow-[0_40px_90px_-25px_rgba(0,0,0,0.55)] ring-1 ring-foreground/10 grid grid-cols-1 md:grid-cols-[264px_1fr] print:block print:rounded-none print:ring-0 print:shadow-none"
        >
          {/* SIDEBAR — branded, deep navy, summary + progress */}
          <aside className="anketa-sidebar relative px-6 py-7 text-primary-foreground print:hidden md:flex md:flex-col md:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 backdrop-blur">
                <Hotel className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">Sayohat</p>
                <p className="text-sm font-bold">Hotel · {new Date().getFullYear()}</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-3xl font-black leading-none tracking-tight">
                {L('Анкета', 'Anketa')}
              </h2>
              <p className="mt-1.5 text-[11px] leading-snug text-white/65">
                {L('Регистрация заселяющегося гостя', "Joylashayotgan mehmonni ro'yxatga olish")}
              </p>
            </div>

            {/* Live summary card */}
            <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/55">
                {L('Гость', 'Mehmon')}
              </p>
              <p className="mt-0.5 truncate text-[13px] font-bold">
                {form.fullName || L('— не заполнено —', "— to'ldirilmagan —")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <p className="font-black uppercase tracking-[0.18em] text-white/50">{L('Заезд', 'Kirish')}</p>
                  <p className="mt-0.5 font-bold tabular-nums">
                    {form.checkIn ? format(parseISO(form.checkIn), 'dd.MM') : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.18em] text-white/50">{L('Выезд', 'Chiqish')}</p>
                  <p className="mt-0.5 font-bold tabular-nums">
                    {form.checkOut ? format(parseISO(form.checkOut), 'dd.MM') : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.18em] text-white/50">{L('Ночей', 'Tunlar')}</p>
                  <p className="mt-0.5 font-bold tabular-nums">{nights || '—'}</p>
                </div>
                <div>
                  <p className="font-black uppercase tracking-[0.18em] text-white/50">{L('Номер', 'Xona')}</p>
                  <p className="mt-0.5 font-bold tabular-nums">№ {form.roomNumber || '—'}</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/65">
                  {t('anketaProgress')}
                </span>
                <span className="text-[11px] font-black tabular-nums">{completion}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                  className="h-full rounded-full bg-gradient-to-r from-white to-white/80"
                />
              </div>
            </div>

            <div className="mt-auto pt-3 text-[10px] leading-relaxed text-white/55">
              {L('Документ оформляется в соответствии с правилами размещения. Расчётный час — 12:00.', "Hujjat joylashish qoidalariga muvofiq rasmiylashtiriladi. Hisob-kitob vaqti — 12:00.")}
            </div>
          </aside>

          {/* MAIN — sectioned form */}
          <div className="anketa-main relative">
            <button
              onClick={requestClose}
              className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-foreground/15 bg-background/90 text-foreground/60 backdrop-blur transition hover:border-destructive/50 hover:text-destructive print:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Print-only header (matches sidebar info on web) */}
            <div className="hidden print:block px-4 pt-2 pb-2 border-b border-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em]">SAYOHAT HOTEL</p>
                  <h2 className="text-[14px] font-black">{L('Анкета гостя', 'Mehmon anketasi')}</h2>
                </div>
                <p className="text-[8px] font-bold">{format(new Date(), 'dd.MM.yyyy')}</p>
              </div>
            </div>

            <div className="anketa-body max-h-[78vh] overflow-y-auto px-7 py-6 print:max-h-none print:overflow-visible print:px-3 print:py-2">
              {/* §1 PERSONAL */}
              <Section n={1} icon={<User className="h-3.5 w-3.5" />} title={L('Личные данные', "Shaxsiy ma'lumotlar")} delay={0.02}>
                <PaperField
                  label={L('Ф.И.О', 'F.I.Sh')}
                  required
                  value={form.fullName}
                  onChange={(v) => update('fullName', v)}
                  placeholder={L('Фамилия Имя Отчество', 'Familiya Ism Otasining ismi')}
                />
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-[200px_1fr]">
                  <PaperField label={L('Дата рождения', "Tug'ilgan sana")} required type="date" value={form.birthDate} onChange={(v) => update('birthDate', v)} />
                  <div className="min-w-0">
                    <div className="anketa-field-label">
                      {L('Гражданство', 'Fuqaroligi')}<span className="ml-1 text-destructive">*</span>
                    </div>
                    <CountrySelect
                      value={form.citizenship}
                      onChange={(v) => update('citizenship', v)}
                      placeholder={L('Узбекистан', "O'zbekiston")}
                      compact
                    />
                  </div>
                </div>
              </Section>


              {/* §3 STAY */}
              <Section n={3} icon={<BedDouble className="h-3.5 w-3.5" />} title={L('Данные проживания', "Yashash ma'lumotlari")} delay={0.06}>
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
                  <PaperField label={L('Дата въезда', 'Kirish sanasi')} required type="date" value={form.checkIn} onChange={(v) => update('checkIn', v)} />
                  <PaperField label={L('Дата выезда', 'Chiqish sanasi')} required type="date" value={form.checkOut} onChange={(v) => update('checkOut', v)} />
                </div>
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-[140px_1fr]">
                  <PaperField label={L('№ комнаты', 'Xona №')} required value={form.roomNumber} onChange={(v) => update('roomNumber', v)} placeholder="101" readOnly />
                  <div />
                </div>
                {nights > 0 && (
                  <div className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] font-semibold text-foreground/75 ring-1 ring-primary/15">
                    <span className="font-black tabular-nums text-primary">{nights}</span> {t('nightsShort')} · {format(parseISO(form.checkIn), 'dd.MM.yyyy')} → {format(parseISO(form.checkOut), 'dd.MM.yyyy')}
                  </div>
                )}
              </Section>

              {/* §4 CONTACTS */}
              <Section n={4} icon={<Phone className="h-3.5 w-3.5" />} title={L('Контактные данные', "Aloqa ma'lumotlari")} delay={0.08}>
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
                  <PaperField label={L('Телефон', 'Telefon')} required value={form.phone} onChange={(v) => update('phone', v)} placeholder="+998 90 123 45 67" maxLength={20} inputMode="tel" invalid={!isValidPhone(form.phone)} />
                  <PaperField label={L('Эл. адрес', 'El. pochta')} type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="email@example.com" maxLength={80} invalid={!isValidEmail(form.email)} />
                </div>
              </Section>

              {/* §5 RULES + SIGNATURE */}
              <Section n={5} icon={<ScrollText className="h-3.5 w-3.5" />} title={L('Правила и подпись', "Qoidalar va imzo")} delay={0.10}>
                <div className="rounded-lg border border-foreground/15 bg-foreground/[0.025] p-3 text-[12px] leading-relaxed text-foreground/85 print:p-2 print:text-[8.5px]">
                  <p className="mb-1.5 font-bold tracking-tight text-foreground">
                    {L('Правила размещения «Sayohat»', "«Sayohat» joylashish qoidalari")}
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>
                        {L('Расчётный час — 12:00.', 'Hisob-kitob vaqti — 12:00.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>
                        {L('Ранний заезд (07:00–12:00) — 50% стоимости.', 'Erta kirish (07:00–12:00) — narxning 50%.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>
                        {L('Поздний выезд (14:00–18:00) — 50% стоимости.', 'Kech chiqish (14:00–18:00) — narxning 50%.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>
                        {L('После 18:00 — 100% стоимости.', '18:00 dan keyin — narxning 100%.')}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      <span>
                        {L('Оплата перед заселением.', "Joylashishdan oldin to'lov.")}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="min-w-0">
                  <div className="anketa-field-label">
                    {L('Ознакомлен Ф.И.О', "Tanishib chiqdim F.I.Sh")}
                    <span className="ml-1 text-destructive">*</span>
                  </div>
                  <input
                    value={form.acknowledgedName}
                    onChange={(e) => update('acknowledgedName', e.target.value.slice(0, 28))}
                    placeholder={L('Фамилия Имя Отчество', 'Familiya Ism Otasining ismi')}
                    maxLength={28}
                    className="anketa-line-input"
                  />
                </div>

                <div className="anketa-field-label">
                  {L('Подпись', 'Imzo')} <span className="text-destructive">*</span>
                </div>

                <motion.div
                  key="draw"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  <SignaturePad
                    value={form.signatureImage}
                    onChange={(v) => update('signatureImage', v)}
                    lang={lang}
                    labelClear={t('anketaSigClear')}
                    hint={t('anketaSigHint')}
                  />
                </motion.div>

                <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-snug text-foreground/80">
                  <input
                    type="checkbox"
                    checked={form.acknowledged}
                    onChange={(e) => update('acknowledged', e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                  />
                  <span>{t('anketaAcknowledge')}</span>
                </label>
              </Section>
            </div>

            {/* FOOTER */}
            <div className="anketa-footer relative z-10 flex flex-wrap items-center justify-between gap-3 px-7 py-3.5 print:hidden">
            <div className="flex items-center gap-2 text-[11px] font-medium text-foreground/65">
              <CheckCircle2 className="h-3.5 w-3.5 text-foreground/55" />
              {t('anketaAutosaveHint')}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 rounded-md">
                <Printer className="h-3.5 w-3.5" /> {t('anketaPrint')}
              </Button>
              <Button variant="outline" size="sm" onClick={requestClose} className="rounded-md">
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.fullName || !hasSignature || !form.acknowledged}
                className="gap-1.5 rounded-md"
              >
                <Download className="h-3.5 w-3.5" /> {t('anketaSubmit')}
              </Button>
            </div>
          </div>
          </div>
        </motion.div>
      </DialogContent>

      <UnsavedCloseWarning
        open={warnOpen}
        onCancel={() => setWarnOpen(false)}
        onDiscard={() => {
          setWarnOpen(false);
          setDirty(false);
          onClose();
        }}
        title={t('unsavedTitle')}
        message={t('unsavedMessage')}
        cancelLabel={t('unsavedKeep')}
        discardLabel={t('unsavedDiscard')}
      />
    </Dialog>
  );
}

/* ---------- Paper-style line field ---------- */

function Section({
  n,
  title,
  icon,
  children,
  delay = 0,
}: {
  n: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="anketa-section"
    >
      <header className="anketa-section-head">
        <span className="anketa-section-num">§{n}</span>
        <span className="anketa-section-icon">{icon}</span>
        <h3 className="anketa-section-h">{title}</h3>
        <span className="anketa-section-rule" aria-hidden />
      </header>
      <div className="anketa-section-body">{children}</div>
    </motion.section>
  );
}

function PaperField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  delay = 0,
  readOnly,
  maxLength = 28,
  inputMode,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  delay?: number;
  readOnly?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'search' | 'url' | 'none';
  invalid?: boolean;
}) {
  const isDate = type === 'date';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0"
    >
      <div className="anketa-field-label">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </div>
      <div className={isDate ? 'relative' : ''}>
        {isDate ? (
          <HotelDatePicker label={label} value={value} onChange={onChange} required={required} compact />
        ) : (
          <input
            type={type}
            inputMode={inputMode}
            value={value}
            readOnly={readOnly}
            aria-invalid={invalid || undefined}
            onChange={(e) => { if (readOnly) return; onChange(e.target.value.slice(0, maxLength)); }}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`anketa-line-input${readOnly ? ' cursor-not-allowed bg-foreground/[0.04] text-foreground/80' : ''}${invalid ? ' !border-destructive/60 text-destructive' : ''}`}
          />
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Signature Pad — pixel-tight cursor alignment ---------- */

function SignaturePad({
  value,
  onChange,
  lang,
  labelClear,
  hint,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  lang: string;
  labelClear: string;
  hint: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const hidLastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(!!value);
  const { t } = useI18n();

  // ---- Draw a stroke segment for an external HID sample ----
  const drawHIDSample = useCallback(
    (s: HIDSample) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!s.down) {
        if (hidLastRef.current && canvasRef.current) {
          // pen lifted -> commit current strokes to dataURL
          onChange(canvasRef.current.toDataURL('image/png'));
        }
        hidLastRef.current = null;
        return;
      }
      const x = s.x * w;
      const y = s.y * h;
      const lineW = Math.max(1.2, s.pressure * 3.2 + 1);
      ctx.lineWidth = lineW;
      if (!hidLastRef.current) {
        // start a new stroke with a dot
        ctx.beginPath();
        ctx.arc(x, y, lineW / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(hidLastRef.current.x, hidLastRef.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      hidLastRef.current = { x, y };
      if (!hasInk) setHasInk(true);
    },
    [hasInk, onChange],
  );

  const hid = useSignaturePadHID(drawHIDSample);

  /**
   * (Re)size the canvas pixel buffer to match its CSS box exactly,
   * so 1 CSS px == 1 device px after the DPR scale. This is the key to
   * removing any gap between the cursor and the drawn ink.
   */
  const resizeCanvas = useCallback((preserve: boolean) => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    let snapshot: ImageData | null = null;
    const prevCtx = canvas.getContext('2d');
    if (preserve && prevCtx && canvas.width > 0 && canvas.height > 0) {
      try { snapshot = prevCtx.getImageData(0, 0, canvas.width, canvas.height); } catch { /* ignore */ }
    }

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 unit = 1 CSS px
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--foreground')
      .trim()
      ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()})`
      : '#0f172a';
    ctxRef.current = ctx;

    if (snapshot) {
      // Re-blit raw snapshot (in device px) without DPR transform interfering
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(snapshot, 0, 0);
      ctx.restore();
    } else if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasInk(true);
      };
      img.src = value;
    }
  }, [value]);

  // Initial setup + observe size changes (handles modal open animation, responsive)
  useEffect(() => {
    resizeCanvas(false);
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => resizeCanvas(true));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Compute pointer position in the canvas's CSS pixel space.
   * Using the CANVAS bounding rect (not the wrapper) eliminates any
   * border / padding offset between cursor and ink. The canvas has
   * no border, no padding, and width/height match the wrapper exactly.
   */
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    // Account for any zoom / sub-pixel rounding via the ratio between
    // the canvas's CSS size and its bounding rect (usually 1:1).
    const scaleX = canvas.clientWidth / rect.width;
    const scaleY = canvas.clientHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = getPos(e);
    lastRef.current = p;
    // Draw a single dot so taps register tightly
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    if (!hasInk) setHasInk(true);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx || !lastRef.current) return;
    const p = getPos(e);
    // Use coalesced events when available for maximum stroke fidelity
    const events = (typeof e.nativeEvent.getCoalescedEvents === 'function')
      ? e.nativeEvent.getCoalescedEvents()
      : [e.nativeEvent];
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.clientWidth / rect.width;
    const scaleY = canvas.clientHeight / rect.height;
    for (const ev of events) {
      const px = (ev.clientX - rect.left) * scaleX;
      const py = (ev.clientY - rect.top) * scaleY;
      ctx.lineTo(px, py);
      lastRef.current = { x: px, y: py };
    }
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };

  const onUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Clear in device-px space, keep DPR transform for next stroke
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasInk(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div ref={wrapRef} className="signature-pad-wrap h-44 print:h-32">
        <div className="signature-baseline" aria-hidden />
        <div className="pointer-events-none absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground/45">
          ✗ {lang === 'ru' ? 'подпись' : 'imzo'}
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
          className="signature-pad-canvas"
        />

        <AnimatePresence>
          {!hasInk && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"
            >
              <PenLine className="h-5 w-5 text-foreground/30" />
              <p className="text-[11px] font-medium text-foreground/45">{hint}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-foreground/55">
          {hasInk ? '✓ ' + (lang === 'ru' ? 'подпись захвачена' : 'imzo qabul qilindi') : '\u00A0'}
        </p>
        <div className="flex items-center gap-2">
          {/* USB / WebHID signature pad connector */}
          {hid.supported ? (
            hid.connected ? (
              <motion.button
                type="button"
                onClick={() => void hid.disconnect()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                title={hid.deviceName ?? ''}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Radio className="h-3 w-3" />
                <span className="max-w-[120px] truncate">{hid.deviceName ?? t('hidConnected')}</span>
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={() => void hid.connect()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/15"
                title={t('hidHint')}
              >
                <Usb className="h-3 w-3" /> {t('hidConnect')}
              </motion.button>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-foreground/10 bg-background px-2 py-1 text-[10px] font-medium text-foreground/40">
              <Usb className="h-3 w-3" /> {t('hidUnsupported')}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={!hasInk}
            className="h-7 gap-1 rounded-md text-[11px] font-bold text-foreground/60 hover:text-destructive"
          >
            <Eraser className="h-3 w-3" /> {labelClear}
          </Button>
        </div>
      </div>
    </div>
  );
}
