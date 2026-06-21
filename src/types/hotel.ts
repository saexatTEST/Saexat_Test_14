export type RoomCategory = 'standard-double' | 'standard-twin' | 'standard-triple' | 'standard-quadruple' | 'deluxe-double' | 'deluxe-twin';

export const ROOM_CATEGORIES: { id: RoomCategory; label: Record<string, string>; short: string; maxGuests: number }[] = [
  { id: 'standard-double', label: { en: 'Standard Double', ru: 'Стандарт Двухместный', uz: 'Standart Ikki kishilik' }, short: 'Std Dbl', maxGuests: 2 },
  { id: 'standard-twin', label: { en: 'Standard Twin', ru: 'Стандарт Твин', uz: 'Standart Twin' }, short: 'Std Twin', maxGuests: 2 },
  { id: 'standard-triple', label: { en: 'Standard Triple', ru: 'Стандарт Трёхместный', uz: 'Standart Uch kishilik' }, short: 'Std Trpl', maxGuests: 3 },
  { id: 'standard-quadruple', label: { en: 'Standard Quadruple', ru: 'Стандарт Четырёхместный', uz: "Standart To'rt kishilik" }, short: 'Std Quad', maxGuests: 4 },
  { id: 'deluxe-double', label: { en: 'Deluxe Double', ru: 'Делюкс Двухместный', uz: 'Deluxe Ikki kishilik' }, short: 'Dlx Dbl', maxGuests: 2 },
  { id: 'deluxe-twin', label: { en: 'Deluxe Twin', ru: 'Делюкс Твин', uz: 'Deluxe Twin' }, short: 'Dlx Twin', maxGuests: 2 },
];

export const ROOMS_PER_CATEGORY = 5;

export interface Room { number: number; category: RoomCategory; }

export type BookingStatus = 'confirmed' | 'pending' | 'booked' | 'in-house' | 'checked-out' | 'maintenance' | 'dirty' | 'cleaned';

export interface StatusConfig {
  color: string; bg: string; border: string; opacity: string;
  label: Record<string, string>; icon: string;
  tailwindBg: string; tailwindText: string; tailwindBorder: string;
}

export const BOOKING_STATUSES: Record<BookingStatus, StatusConfig> = {
  confirmed: { color: '#3B82F6', bg: 'bg-blue-500', border: 'border-solid border-blue-600', opacity: 'opacity-100', label: { en: 'Confirmed', ru: 'Подтверждено', uz: 'Tasdiqlangan' }, icon: '✔', tailwindBg: 'bg-blue-50', tailwindText: 'text-blue-700', tailwindBorder: 'border-blue-200' },
  pending: { color: '#F59E0B', bg: 'bg-amber-500', border: 'border-solid border-amber-600', opacity: 'opacity-100', label: { en: 'Pending', ru: 'Ожидание', uz: 'Kutilmoqda' }, icon: '⏳', tailwindBg: 'bg-amber-50', tailwindText: 'text-amber-700', tailwindBorder: 'border-amber-200' },
  booked: { color: '#8B5CF6', bg: 'bg-violet-500', border: 'border-solid border-violet-600', opacity: 'opacity-100', label: { en: 'Booked', ru: 'Забронировано', uz: 'Band qilingan' }, icon: '📋', tailwindBg: 'bg-violet-50', tailwindText: 'text-violet-700', tailwindBorder: 'border-violet-200' },
  'in-house': { color: '#10B981', bg: 'bg-emerald-500', border: 'border-solid border-emerald-600', opacity: 'opacity-100', label: { en: 'In House', ru: 'Проживает', uz: 'Ichkarida' }, icon: '🛏', tailwindBg: 'bg-emerald-50', tailwindText: 'text-emerald-700', tailwindBorder: 'border-emerald-200' },
  'checked-out': { color: '#6B7280', bg: 'bg-gray-400/60', border: 'border-solid border-gray-300', opacity: 'opacity-60', label: { en: 'Checked Out', ru: 'Выехал', uz: 'Chiqib ketgan' }, icon: '✓', tailwindBg: 'bg-gray-100', tailwindText: 'text-gray-600', tailwindBorder: 'border-gray-200' },
  maintenance: { color: '#EF4444', bg: 'bg-red-500', border: 'border-solid border-red-600', opacity: 'opacity-90', label: { en: 'Maintenance', ru: 'Обслуживание', uz: 'Texnik xizmat' }, icon: '🔧', tailwindBg: 'bg-red-50', tailwindText: 'text-red-700', tailwindBorder: 'border-red-200' },
  dirty: { color: '#EF4444', bg: 'bg-red-500', border: 'border-solid border-red-600', opacity: 'opacity-90', label: { en: 'Dirty', ru: 'Грязный', uz: 'Iflos' }, icon: '🧹', tailwindBg: 'bg-red-50', tailwindText: 'text-red-700', tailwindBorder: 'border-red-200' },
  cleaned: { color: '#9CA3AF', bg: 'bg-gray-400/60', border: 'border-solid border-gray-300', opacity: 'opacity-60', label: { en: 'Cleaned', ru: 'Убрано', uz: 'Tozalangan' }, icon: '✨', tailwindBg: 'bg-gray-100', tailwindText: 'text-gray-600', tailwindBorder: 'border-gray-200' },
};

/**
 * A room is "dirty" when it has at least one booking currently in the `dirty`
 * state (guest checked out, room not yet marked cleaned). Returns false once
 * housekeeping flips that booking to `cleaned`.
 */
export function isRoomDirty(roomNumber: number, bookings: Pick<Booking, 'roomNumber' | 'status'>[]): boolean {
  return bookings.some((b) => b.roomNumber === roomNumber && b.status === 'dirty');
}

export interface Booking {
  id: string; roomNumber: number; guestName: string; guestPhone: string; guestEmail: string;
  guestCount: number; checkIn: string; checkOut: string; notes: string; status: BookingStatus;
  /** Final cash price for this booking, entered by admin/superuser. */
  price?: number;
  /** Payment details captured by admin after check-in and shared across roles. */
  paymentType?: 'cash' | 'card' | 'transfer';
  /** Legacy timing dropdown — kept optional for back-compat with old data. */
  paymentTiming?: 'full_now' | 'half_now' | 'quarter_now' | 'after_checkout';
  /** Total amount the guest is expected to pay for the stay. */
  paymentAmount?: number;
  /** True once `payments` sum reaches `paymentAmount`. */
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: string;
  /** Full installment history — each press of "Оплатить" appends an entry. */
  payments?: Array<{ amount: number; at: string; method: 'cash' | 'card' | 'transfer' }>;
  /** Creation timestamp used for director revenue withdrawals. */
  createdAt?: string;
  /**
   * Structured guest name fields. These are the source of truth — `guestName`
   * is kept as a denormalized "Surname Name MiddleName" display string for
   * back-compat with code paths that already expect it. Each field can contain
   * multi-token values (e.g. "baxtiyor ogli") without leaking into adjacent
   * fields, because we never re-split `guestName` to repopulate inputs.
   */
  guestLastName?: string;
  guestFirstName?: string;
  guestMiddleName?: string;
  guestBirthDate?: string;
  guestPassportIssueDate?: string;
  guestCitizenship?: string;
  guestGender?: string;
  anketa?: {
    fullName?: string;
    birthDate?: string;
    citizenship?: string;
    phone?: string;
    email?: string;
    roomNumber?: string;
    checkIn?: string;
    checkOut?: string;
    signatureImage?: string;
    acknowledgedName?: string;
    acknowledged?: boolean;
  };

  /** Optional bed/person slot index (0-based) when booking is assigned to a specific bed within a multi-bed room. */
  bedIndex?: number;
  /**
   * Additional bed slot indexes that this booking visually blocks (red-stripe
   * overlay). Used when a multi-guest booking is placed via the room row and
   * the system auto-distributes the party across consecutive bed slots — the
   * lowest free index becomes `bedIndex`, the remaining ones land here so no
   * other booking can occupy those beds on the same dates.
   */
  additionalBeds?: number[];
  /** Optional additional contact channels. */
  guestWhatsapp?: string;
  guestTelegram?: string;
  guestInstagram?: string;
  /**
   * When true, the booking's checkOut is extended by an additional half-day
   * beyond the date stored in `checkOut`. Used for late-adjustment drags
   * that snap to half-cell increments and bypass the 14:00 → 12:00 normalization.
   */
  checkOutHalfDay?: boolean;
  /**
   * When true, the booking's check-in begins a half-day EARLIER than the
   * date stored in `checkIn` (08:00 instead of 14:00). Set by a left-edge
   * drag of the booking bar that snaps to a half-cell increment.
   */
  checkInHalfDay?: boolean;
  /**
   * Guest residency status — chosen at booking time. Drives which category
   * rate (resident vs non-resident) is used to compute the total price.
   * Defaults to 'resident' for legacy bookings without this field.
   */
  residency?: 'resident' | 'nonResident';
}

export function generateRooms(): Room[] {
  const rooms: Room[] = [];
  let floor = 1;
  ROOM_CATEGORIES.forEach((cat) => {
    for (let i = 1; i <= ROOMS_PER_CATEGORY; i++) {
      rooms.push({ number: floor * 100 + i, category: cat.id });
    }
    floor++;
  });
  return rooms;
}

export function generateSampleBookings(): Booking[] {
  return [
    { id: 'b1', roomNumber: 101, guestName: 'John Doe', guestPhone: '+998901234567', guestEmail: 'john@email.com', guestCount: 2, checkIn: '2026-04-11', checkOut: '2026-04-16', notes: 'VIP guest', status: 'in-house' },
    { id: 'b2', roomNumber: 102, guestName: 'Asef Karimov', guestPhone: '+998907654321', guestEmail: 'asef@email.com', guestCount: 1, checkIn: '2026-04-10', checkOut: '2026-04-16', notes: '', status: 'confirmed' },
    { id: 'b3', roomNumber: 103, guestName: 'Maria Ivanova', guestPhone: '+998912223344', guestEmail: 'maria@email.com', guestCount: 2, checkIn: '2026-04-11', checkOut: '2026-04-12', notes: 'Early checkout', status: 'pending' },
    { id: 'b4', roomNumber: 104, guestName: 'Alex Turner', guestPhone: '+998933334455', guestEmail: 'alex@email.com', guestCount: 1, checkIn: '2026-04-09', checkOut: '2026-04-11', notes: '', status: 'checked-out' },
    { id: 'b5', roomNumber: 105, guestName: 'Sam Wilson', guestPhone: '+998944445566', guestEmail: 'sam@email.com', guestCount: 1, checkIn: '2026-04-11', checkOut: '2026-04-14', notes: '', status: 'booked' },
    { id: 'b6', roomNumber: 201, guestName: '', guestPhone: '', guestEmail: '', guestCount: 0, checkIn: '2026-04-10', checkOut: '2026-04-20', notes: 'Plumbing repair', status: 'maintenance' },
    { id: 'b7', roomNumber: 202, guestName: 'Elena Petrova', guestPhone: '+998955556677', guestEmail: 'elena@email.com', guestCount: 2, checkIn: '2026-04-12', checkOut: '2026-04-18', notes: '', status: 'confirmed' },
    { id: 'b8', roomNumber: 203, guestName: 'Dmitry Volkov', guestPhone: '+998966667788', guestEmail: 'dmitry@email.com', guestCount: 1, checkIn: '2026-04-13', checkOut: '2026-04-19', notes: '', status: 'booked' },
    { id: 'b9', roomNumber: 204, guestName: 'Lola Alimova', guestPhone: '+998977778899', guestEmail: 'lola@email.com', guestCount: 3, checkIn: '2026-04-11', checkOut: '2026-04-15', notes: 'Family room', status: 'in-house' },
    { id: 'b10', roomNumber: 205, guestName: 'Rustam Akhmedov', guestPhone: '+998988889900', guestEmail: 'rustam@email.com', guestCount: 2, checkIn: '2026-04-14', checkOut: '2026-04-20', notes: '', status: 'pending' },
    { id: 'b11', roomNumber: 301, guestName: 'Anna Schmidt', guestPhone: '+498123456789', guestEmail: 'anna@email.com', guestCount: 2, checkIn: '2026-04-12', checkOut: '2026-04-17', notes: '', status: 'confirmed' },
    { id: 'b12', roomNumber: 302, guestName: 'Pierre Dupont', guestPhone: '+331234567890', guestEmail: 'pierre@email.com', guestCount: 1, checkIn: '2026-04-13', checkOut: '2026-04-18', notes: 'Late arrival', status: 'pending' },
    { id: 'b13', roomNumber: 303, guestName: 'Yuki Tanaka', guestPhone: '+811234567890', guestEmail: 'yuki@email.com', guestCount: 2, checkIn: '2026-04-11', checkOut: '2026-04-14', notes: '', status: 'in-house' },
    { id: 'b14', roomNumber: 304, guestName: 'Omar Hassan', guestPhone: '+201234567890', guestEmail: 'omar@email.com', guestCount: 1, checkIn: '2026-04-15', checkOut: '2026-04-21', notes: '', status: 'booked' },
    { id: 'b15', roomNumber: 305, guestName: 'Li Wei', guestPhone: '+861234567890', guestEmail: 'li@email.com', guestCount: 2, checkIn: '2026-04-12', checkOut: '2026-04-16', notes: '', status: 'confirmed' },
    { id: 'b16', roomNumber: 401, guestName: 'Carlos Silva', guestPhone: '+551234567890', guestEmail: 'carlos@email.com', guestCount: 4, checkIn: '2026-04-11', checkOut: '2026-04-19', notes: 'Large family', status: 'in-house' },
    { id: 'b17', roomNumber: 402, guestName: 'Priya Patel', guestPhone: '+911234567890', guestEmail: 'priya@email.com', guestCount: 3, checkIn: '2026-04-14', checkOut: '2026-04-22', notes: '', status: 'pending' },
    { id: 'b18', roomNumber: 104, guestName: 'Фыва', guestPhone: '+998900001104', guestEmail: 'fyva@sayohat.uz', guestCount: 1, checkIn: '2026-04-30', checkOut: '2026-05-01', notes: 'Номер 104', status: 'confirmed', checkInHalfDay: true, checkOutHalfDay: true },
  ];
}

/**
 * Format a guest's name for display in the canonical "Surname Name MiddleName"
 * order. Falls back to the legacy denormalized `guestName` if the structured
 * fields are not present (e.g. older sample data created before the split).
 */
export function formatGuestName(b: Pick<Booking, 'guestName' | 'guestLastName' | 'guestFirstName' | 'guestMiddleName'>): string {
  const last = (b.guestLastName || '').trim();
  const first = (b.guestFirstName || '').trim();
  const middle = (b.guestMiddleName || '').trim();
  if (last || first || middle) {
    return [last, first, middle].filter(Boolean).join(' ');
  }
  return (b.guestName || '').trim();
}
