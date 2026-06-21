import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useServerFn } from '@tanstack/react-start';
import { getHotelState, setHotelState } from '@/lib/hotel-state.functions';
import { useBookingsContext } from '@/hooks/BookingsContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  BedDouble,
  CalendarDays,
  Check,
  Clock3,
  ContactRound,
  Fingerprint,
  Flag,
  IdCard,
  Instagram,
  Mail,
  // MapPin removed with address field
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Users,
  Zap,
  X,
} from 'lucide-react';
import { HotelDatePicker } from './HotelDatePicker';
import { CountrySelect } from './CountrySelect';

interface GuestDetailsWindowProps {
  open: boolean;
  onClose: () => void;
  guest: {
    bookingId?: string;
    fullName: string;
    initials: string;
    roomNumber: number;
    bedIndex?: number;
    statusLabel: string;
    statusColor: string;
    guestLastName?: string;
    guestFirstName?: string;
    guestMiddleName?: string;
    guestPhone: string;
    guestEmail: string;
    guestWhatsapp: string;
    guestTelegram: string;
    guestInstagram: string;
    guestCount: number;
    inHuman: string;
    outHuman: string;
    nightsDisplay: number;
    checkInTime: string;
    checkOutTime: string;
    paymentTypeLabel: string;
    paymentTimingLabel: string;
    paymentAmount: string;
    paymentConfirmed: boolean;
    notes: string;
  };
}

type ContactIcon = typeof Phone;

const PASSPORT_FIELDS = [
  { key: 'lastName', label: 'Фамилия', placeholder: 'Иванов', icon: IdCard, span: 1 },
  { key: 'firstName', label: 'Имя', placeholder: 'Иван', icon: IdCard, span: 1 },
  { key: 'middleName', label: 'Отчество', placeholder: 'Иванович', icon: IdCard, span: 1 },
  { key: 'birthDate', label: 'Дата рождения', placeholder: 'дд.мм.гггг', icon: CalendarDays, span: 1, type: 'date' },
  { key: 'issueDate', label: 'Дата выдачи', placeholder: 'дд.мм.гггг', icon: CalendarDays, span: 1, type: 'date' },
  { key: 'citizenship', label: 'Гражданство', placeholder: 'Узбекистан', icon: Flag, span: 1 },
  { key: 'gender', label: 'Пол', placeholder: 'М / Ж', icon: Users, span: 1 },
] as const;

type PassportKey = (typeof PASSPORT_FIELDS)[number]['key'];
type PassportData = Record<PassportKey, string>;

const EMPTY_PASSPORT: PassportData = PASSPORT_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: '' }),
  {} as PassportData,
);

export function GuestDetailsWindow({ open, onClose, guest }: GuestDetailsWindowProps) {
  const [confirmClose, setConfirmClose] = useState(false);

  const { updateBooking } = useBookingsContext();
  const getSharedState = useServerFn(getHotelState);
  const setSharedState = useServerFn(setHotelState);
  const passportVersionRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const recordKey = guest.bookingId
    ? `booking:${guest.bookingId}`
    : `room:${guest.roomNumber}:${guest.bedIndex ?? 'main'}`;

  const buildAutoFill = useCallback(
    (current: PassportData): PassportData => {
      const auto: Partial<PassportData> = {
        lastName: guest.guestLastName ?? '',
        firstName: guest.guestFirstName ?? '',
        middleName: guest.guestMiddleName ?? '',
        birthDate: (guest as any).guestBirthDate ?? '',
        issueDate: (guest as any).guestPassportIssueDate ?? '',
        citizenship: (guest as any).guestCitizenship ?? '',
        gender: (guest as any).guestGender ?? '',
      };

      const next = { ...current };

      (Object.keys(auto) as PassportKey[]).forEach((k) => {
        const v = (auto[k] ?? '').toString().trim();
        if (v && !(next[k] ?? '').trim()) next[k] = v;
      });

      return next;
    },
    [
      guest.guestLastName,
      guest.guestFirstName,
      guest.guestMiddleName,
      (guest as any).guestBirthDate,
      (guest as any).guestPassportIssueDate,
      (guest as any).guestCitizenship,
      (guest as any).guestGender,
    ],
  );

  const [passport, setPassport] = useState<PassportData>(EMPTY_PASSPORT);

  const applyPassportRecords = useCallback(
    (records: unknown, version?: number) => {
      const map =
        records && typeof records === 'object' && !Array.isArray(records)
          ? (records as Record<string, Partial<PassportData>>)
          : {};

      const stored = map[recordKey] ?? {};
      const next = buildAutoFill({ ...EMPTY_PASSPORT, ...stored });

      if (typeof version === 'number') passportVersionRef.current = version;

      setPassport(next);
    },
    [recordKey, buildAutoFill],
  );

  const loadPassport = useCallback(async () => {
    const row = await getSharedState({ data: { key: 'passport-records' } });

    if (row?.stateData) {
      if (
        passportVersionRef.current !== null &&
        row.version <= passportVersionRef.current
      ) {
        return;
      }

      applyPassportRecords(row.stateData, row.version);
      return;
    }

    const saved = await setSharedState({
      data: {
        key: 'passport-records',
        stateData: {},
        expectedVersion: null,
      },
    });

    applyPassportRecords(saved.stateData, saved.version);
  }, [getSharedState, setSharedState, applyPassportRecords]);

  useEffect(() => {
    if (!open) return;

    void loadPassport().catch(() => {
      setPassport(buildAutoFill(EMPTY_PASSPORT));
    });

    const id = window.setInterval(() => {
      void loadPassport().catch(() => undefined);
    }, 1500);

    return () => window.clearInterval(id);
  }, [open, loadPassport, buildAutoFill]);

  useEffect(() => {
    if (!open) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`passport_records_${recordKey}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hotel_app_state',
            filter: 'state_key=eq.passport-records',
          },
          (payload) => {
            const next = payload.new as {
              state_data?: unknown;
              version?: number;
            };

            if (!next?.state_data) return;

            const nextVersion = Number(next.version ?? 0);

            if (
              passportVersionRef.current !== null &&
              nextVersion <= passportVersionRef.current
            ) {
              return;
            }

            applyPassportRecords(next.state_data, nextVersion);
          },
        )
        .subscribe();
    } catch {
      // polling is fallback
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [open, recordKey, applyPassportRecords]);

  const savePassport = useCallback(
    (nextPassport: PassportData) => {
      if (guest.bookingId) {
        updateBooking(guest.bookingId, {
          guestLastName: nextPassport.lastName,
          guestFirstName: nextPassport.firstName,
          guestMiddleName: nextPassport.middleName,
          guestName: [
            nextPassport.lastName,
            nextPassport.firstName,
            nextPassport.middleName,
          ]
            .filter(Boolean)
            .join(' '),
          guestBirthDate: nextPassport.birthDate,
          guestPassportIssueDate: nextPassport.issueDate,
          guestCitizenship: nextPassport.citizenship,
          guestGender: nextPassport.gender,
        } as any);
      }

      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      saveTimerRef.current = window.setTimeout(async () => {
        try {
          const row = await getSharedState({ data: { key: 'passport-records' } });

          const current =
            row?.stateData &&
            typeof row.stateData === 'object' &&
            !Array.isArray(row.stateData)
              ? (row.stateData as Record<string, PassportData>)
              : {};

          const saved = await setSharedState({
            data: {
              key: 'passport-records',
              stateData: {
                ...current,
                [recordKey]: nextPassport,
              },
              expectedVersion: row?.version ?? passportVersionRef.current,
            },
          });

          passportVersionRef.current = saved.version;
        } catch {
          // cloud temporarily unavailable
        }
      }, 120);
    },
    [guest.bookingId, updateBooking, getSharedState, setSharedState, recordKey],
  );

  const updatePassport = (key: PassportKey, value: string) => {
    setPassport((prev) => {
      const next = { ...prev, [key]: value };
      savePassport(next);
      return next;
    });
  };

  const filledPassportCount = (Object.values(passport) as string[]).filter((v) => v.trim().length > 0).length;

  const nights = Number.isInteger(guest.nightsDisplay) ? guest.nightsDisplay : guest.nightsDisplay.toFixed(1);
  const contacts: { label: string; value: string; icon: ContactIcon }[] = [
    { label: 'Phone', value: guest.guestPhone, icon: Phone },
    { label: 'WhatsApp', value: guest.guestWhatsapp, icon: MessageCircle },
    { label: 'Telegram', value: guest.guestTelegram, icon: Send },
    { label: 'Instagram', value: guest.guestInstagram, icon: Instagram },
    { label: 'Email', value: guest.guestEmail, icon: Mail },
  ].filter((row) => row.value.trim());
  const requestClose = () => setConfirmClose(true);
  const finishClose = () => { setConfirmClose(false); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && requestClose()}>
      <DialogContent className="w-[min(1040px,calc(100vw-2rem))] max-w-[1040px] max-h-[90vh] overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-[32px] [&>button.absolute]:hidden">
        <VisuallyHidden>
          <DialogTitle>Guest details</DialogTitle>
          <DialogDescription>Passport and identification fields</DialogDescription>
        </VisuallyHidden>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, filter: 'blur(2px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="guest-holo-window relative overflow-hidden rounded-[32px] border border-primary/25 bg-card shadow-[0_34px_110px_hsl(var(--primary-hsl)/0.32)]"
        >
          <div className="guest-holo-grid absolute inset-0" aria-hidden />
          <div className="guest-holo-scan pointer-events-none absolute inset-x-0 top-0 h-20" aria-hidden />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" aria-hidden />
          <div className="relative max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4 rounded-[26px] border border-primary/25 bg-gradient-to-br from-primary/15 via-background/90 to-accent/40 p-5 shadow-lg shadow-primary/10">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-primary to-primary/70 text-2xl font-black text-primary-foreground shadow-xl shadow-primary/30">
                  <span>{guest.initials}</span>
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-card bg-background text-primary shadow-md">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Guest intelligence profile
                  </div>
                  <h2 className="font-display truncate text-3xl font-black leading-tight text-foreground">
                    {guest.fullName || 'Unnamed guest'}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm font-semibold leading-relaxed text-muted-foreground">
                    Live stay summary with identity, contact readiness, arrival timing, and operational notes in one control view.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge icon={BedDouble}>Room {guest.roomNumber}{guest.bedIndex !== undefined ? ` · Bed ${guest.bedIndex + 1}` : ''}</Badge>
                    <Badge icon={Zap}>{contacts.length ? 'Contact ready' : 'Needs contact data'}</Badge>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1"
                      style={{ background: `${guest.statusColor}20`, color: guest.statusColor, borderColor: `${guest.statusColor}55` }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: guest.statusColor }} />
                      {guest.statusLabel}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close guest details"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
              <section className="space-y-4">
                <Panel title="Identity Signal" icon={Fingerprint}>
                  <div className="space-y-3">
                    <InfoLine label="Profile" value={guest.fullName ? 'Verified input' : 'Awaiting name'} />
                    <InfoLine label="Data quality" value={contacts.length >= 2 ? 'Strong record' : contacts.length ? 'Basic record' : 'Incomplete'} />
                    <InfoLine label="Occupancy" value={`${guest.guestCount || 1} guest${guest.guestCount === 1 ? '' : 's'} registered`} />
                  </div>
                </Panel>

                <Panel title="Stay Snapshot" icon={ShieldCheck}>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Nights" value={`${nights}`} />
                    <Stat label="Guests" value={`${guest.guestCount || 1}`} />
                    <Stat label="Check-in" value={guest.checkInTime} />
                    <Stat label="Check-out" value={guest.checkOutTime} />
                  </div>
                </Panel>

                <Panel title="Данные об оплате" icon={Check}>
                  <div className="grid gap-2">
                    <InfoLine label="Тип оплаты" value={guest.paymentTypeLabel} />
                    <InfoLine label="Условие" value={guest.paymentTimingLabel} />
                    <InfoLine label="Сумма" value={`${Number(guest.paymentAmount || 0).toLocaleString('ru-RU')} сум`} />
                    <InfoLine label="Статус" value={guest.paymentConfirmed ? 'Подтверждено' : 'Ожидает подтверждения'} />
                  </div>
                </Panel>

                <Panel title="Operational Readiness" icon={Clock3}>
                  <div className="grid gap-2">
                    <InfoLine label="Arrival protocol" value={guest.inHuman ? 'Scheduled' : 'Missing date'} />
                    <InfoLine label="Follow-up" value={contacts.length ? 'Reachable' : 'No channel'} />
                    <InfoLine label="Desk priority" value={guest.notes.trim() ? 'Review notes' : 'Standard'} />
                  </div>
                </Panel>
              </section>

              <section className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={CalendarDays} label="Arrival" value={guest.inHuman || 'Not set'} sub={guest.checkInTime} />
                  <Metric icon={CalendarDays} label="Departure" value={guest.outHuman || 'Not set'} sub={guest.checkOutTime} />
                  <Metric icon={Users} label="People" value={`${guest.guestCount || 1}`} sub="registered" />
                </div>

                <Panel title="Contact Channels" icon={ContactRound}>
                  {contacts.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {contacts.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="contact-card rounded-2xl border border-border/60 bg-background/70 p-3 transition hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10">
                          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            <Icon className="h-3.5 w-3.5 text-primary" /> {label}
                          </div>
                          <div className="truncate text-sm font-bold text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm font-semibold text-muted-foreground">
                      No contact details entered yet.
                    </div>
                  )}
                </Panel>

                <Panel title="Guest Notes" icon={StickyNote}>
                  <p className="min-h-20 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm font-semibold leading-relaxed text-foreground/80">
                    {guest.notes.trim() || 'No special notes added for this guest.'}
                  </p>
                </Panel>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 24 }}
                  className="rounded-[24px] border-2 border-primary/40 bg-card p-5 shadow-lg shadow-primary/10"
                >
                  <div className="mb-4 flex items-center justify-between gap-2 border-b-2 border-primary/15 pb-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-foreground">
                      <IdCard className="h-4 w-4 text-primary" />
                      Паспортные данные · Passport
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                      <Check className="h-3 w-3" /> {filledPassportCount}/{PASSPORT_FIELDS.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PASSPORT_FIELDS.map((f, idx) => {
                      const Icon = f.icon;
                      return (
                        <motion.div
                          key={f.key}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + idx * 0.025, type: 'spring', stiffness: 240, damping: 22 }}
                          className="rounded-xl border border-border bg-background/60 p-3 transition-colors hover:border-primary/40"
                        >
                          <label className="anketa-field-label flex items-center gap-1.5">
                            <Icon className="h-3 w-3 text-primary/70" />
                            {f.label}
                          </label>
                          {'type' in f && f.type === 'date' ? (
                            <HotelDatePicker
                              label={f.label}
                              value={passport[f.key]}
                              onChange={(value) => updatePassport(f.key, value)}
                              compact
                              showLabel={false}
                            />
                          ) : f.key === 'citizenship' ? (
                            <CountrySelect
                              value={passport[f.key]}
                              onChange={(value) => updatePassport(f.key, value)}
                              placeholder={f.placeholder}
                              compact
                            />
                          ) : (
                            <input
                              value={passport[f.key]}
                              onChange={(e) => updatePassport(f.key, e.target.value.slice(0, 28))}
                              placeholder={f.placeholder}
                              maxLength={28}
                              className="anketa-line-input input-focus-glow"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </section>
            </div>
          </div>

          <AnimatePresence>
            {confirmClose && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-5 backdrop-blur-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-primary/30 bg-card p-5 shadow-[0_28px_90px_hsl(var(--primary-hsl)/0.28)]"
                >
                  <div className="guest-holo-grid absolute inset-0 opacity-70" aria-hidden />
                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-xl font-black text-foreground">Save this guest view?</h3>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground">
                      You are leaving Guest Details. Keep the current guest information view, or discard and close the intelligence panel.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button type="button" onClick={finishClose} className="rounded-2xl border border-border bg-background px-4 py-3 text-sm font-black text-muted-foreground hover:border-destructive/40 hover:text-destructive">
                        Discard
                      </button>
                      <button type="button" onClick={finishClose} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40">
                        <Check className="h-4 w-4" /> Save view
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ icon: Icon, children }: { icon: ContactIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-background/75 px-3 py-1 text-xs font-black text-foreground ring-1 ring-border/70">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {children}
    </span>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ContactIcon; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-foreground/70">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/65 px-3 py-2.5 text-sm">
      <span className="font-bold text-muted-foreground">{label}</span>
      <span className="text-right font-black text-foreground">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
      <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-black text-primary">{value}</div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: ContactIcon; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[22px] border border-primary/20 bg-gradient-to-b from-primary/10 to-background/70 p-4 shadow-lg shadow-primary/10">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-display text-base font-black text-foreground">{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted-foreground">{sub}</div>
    </div>
  );
}
