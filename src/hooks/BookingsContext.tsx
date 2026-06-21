import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useBookings as useBookingsHook } from './useBookings';
import type { Booking } from '@/types/hotel';
import { useAudit } from '@/contexts/AuditContext';
import { useAuth } from '@/contexts/AuthContext';

type Ctx = {
  bookings: Booking[];
  addBooking: (b: Booking) => boolean;
  removeBooking: (id: string) => void;
  updateBooking: (id: string, updates: Partial<Booking>) => boolean;
};

const BookingsContext = createContext<Ctx | null>(null);

function describeChange(prev: Booking, updates: Partial<Booking>): string {
  const keys = Object.keys(updates) as (keyof Booking)[];
  const parts: string[] = [];
  for (const k of keys) {
    const before = prev[k];
    const after = updates[k];
    if (before === after) continue;
    parts.push(`${String(k)}: "${String(before ?? '')}" → "${String(after ?? '')}"`);
  }
  return parts.length ? parts.join(', ') : 'no field changes';
}

export function BookingsProvider({ children }: { children: React.ReactNode }) {
  const inner = useBookingsHook();
  const { log } = useAudit();
  const { user } = useAuth();

  const actor = useMemo(
    () =>
      user
        ? { username: user.username, role: user.role, adminId: user.adminId ?? null }
        : { username: 'anonymous', role: 'admin' as const, adminId: null },
    [user],
  );

  const addBooking = useCallback(
    (b: Booking) => {
      const ok = inner.addBooking(b);
      if (ok) {
        log({
          actor,
          category: 'booking',
          action: 'booking.created',
          summary: `Created booking for room ${b.roomNumber}${b.guestName ? ` (${b.guestName})` : ''}`,
          details: {
            bookingId: b.id,
            room: b.roomNumber,
            bedIndex: b.bedIndex,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            status: b.status,
            guestName: b.guestName,
          },
        });
      }
      return ok;
    },
    [inner, log, actor],
  );

  const removeBooking = useCallback(
    (id: string) => {
      const target = inner.bookings.find((b) => b.id === id);
      inner.removeBooking(id);
      log({
        actor,
        category: 'booking',
        action: 'booking.deleted',
        summary: target
          ? `Deleted booking #${target.roomNumber}${target.guestName ? ` (${target.guestName})` : ''}`
          : `Deleted booking ${id}`,
        details: target ? { ...target } : { id },
      });
    },
    [inner, log, actor],
  );

  const updateBooking = useCallback(
    (id: string, updates: Partial<Booking>) => {
      const before = inner.bookings.find((b) => b.id === id);
      const ok = inner.updateBooking(id, updates);
      if (ok && before) {
        log({
          actor,
          category: 'booking',
          action: 'booking.updated',
          summary: `Updated booking #${before.roomNumber} — ${describeChange(before, updates)}`,
          details: { bookingId: id, before, patch: updates },
        });
      }
      return ok;
    },
    [inner, log, actor],
  );

  const value = useMemo<Ctx>(
    () => ({ bookings: inner.bookings, addBooking, removeBooking, updateBooking }),
    [inner.bookings, addBooking, removeBooking, updateBooking],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookingsContext() {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error('useBookingsContext must be used inside BookingsProvider');
  return ctx;
}
