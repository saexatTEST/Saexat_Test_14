import { useState, useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Booking } from "@/types/hotel";
import { differenceInCalendarDays, isBefore, parseISO, startOfDay } from "date-fns";
import { toast } from "sonner";
import { getHotelState, setHotelState } from "@/lib/hotel-state.functions";
import { useI18n } from "./useI18n";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "sayohat-bookings-v2";
const CHANGE_EVENT = "sayohat-bookings-changed";

function bookingSignature(b: Booking): string {
  return [
    b.roomNumber,
    b.bedIndex ?? "room",
    b.checkIn,
    b.checkOut,
    b.status,
    (b.guestName || "").trim().toLowerCase(),
  ].join("|");
}

function isLegacySampleBooking(b: Booking): boolean {
  return /^b\d+$/.test(String(b.id));
}

function normalizeBookings(input: unknown): Booking[] {
  if (!Array.isArray(input)) return [];

  const byId = new Map<string, Booking>();

  for (const item of input) {
    if (!item || typeof item !== "object") continue;

    const b = item as Booking;

    if (!b.id || !b.roomNumber || !b.checkIn || !b.checkOut || !b.status) continue;
    if (isLegacySampleBooking(b)) continue;

    byId.set(String(b.id), b);
  }

  const bySignature = new Map<string, Booking>();
  for (const b of byId.values()) bySignature.set(bookingSignature(b), b);

  return applyAutoCheckout(Array.from(bySignature.values()));
}

function bookingHalfSpan(b: Booking): [number, number] {
  const base = startOfDay(parseISO("2000-01-01"));
  const inDay = differenceInCalendarDays(parseISO(b.checkIn), base);
  const outDay = differenceInCalendarDays(parseISO(b.checkOut), base);

  return [
    2 * inDay + 1 - (b.checkInHalfDay ? 1 : 0),
    2 * outDay + 1 + (b.checkOutHalfDay ? 1 : 0),
  ];
}

function bookingsConflict(a: Booking, b: Booking): boolean {
  if (a.id === b.id) return false;
  if (a.roomNumber !== b.roomNumber) return false;

  const eitherIsRoomWide =
    a.status === "maintenance" ||
    b.status === "maintenance" ||
    a.bedIndex === undefined ||
    b.bedIndex === undefined;

  if (!eitherIsRoomWide) {
    const aBeds = new Set<number>([a.bedIndex as number, ...(a.additionalBeds ?? [])]);
    const bBeds = new Set<number>([b.bedIndex as number, ...(b.additionalBeds ?? [])]);

    let overlap = false;

    for (const bed of aBeds) {
      if (bBeds.has(bed)) {
        overlap = true;
        break;
      }
    }

    if (!overlap) return false;
  }

  const [aStart, aEnd] = bookingHalfSpan(a);
  const [bStart, bEnd] = bookingHalfSpan(b);

  return aStart < bEnd && bStart < aEnd;
}

function findConflict(list: Booking[], candidate: Booking): Booking | undefined {
  return list.find((b) => bookingsConflict(b, candidate));
}

function applyAutoCheckout(list: Booking[]): Booking[] {
  const today = startOfDay(new Date());
  let changed = false;

  const next = list.map((b) => {
    if (b.status === "maintenance" || b.status === "checked-out") return b;

    const out = parseISO(b.checkOut);

    if (isBefore(out, today)) {
      changed = true;
      return { ...b, status: "checked-out" as const };
    }

    return b;
  });

  return changed ? next : list;
}

export function useBookings() {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const getSharedState = useServerFn(getHotelState);
  const setSharedState = useServerFn(setHotelState);
  const versionRef = useRef<number | null>(null);
  const writeTimerRef = useRef<number | null>(null);

  const applyRemoteBookings = useCallback((stateData: unknown, version?: number) => {
    const next = normalizeBookings(stateData);

    setBookings(next);

    if (typeof version === "number") versionRef.current = version;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // local cache failed, cloud remains source of truth
    }
  }, []);

  const loadCloud = useCallback(async () => {
    const row = await getSharedState({ data: { key: "bookings" } });

    if (row?.stateData) {
      if (versionRef.current !== null && row.version <= versionRef.current) return;
      applyRemoteBookings(row.stateData, row.version);
      return;
    }

    const saved = await setSharedState({
      data: {
        key: "bookings",
        stateData: [],
        expectedVersion: null,
      },
    });

    applyRemoteBookings(saved.stateData, saved.version);
  }, [getSharedState, setSharedState, applyRemoteBookings]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const boot = async () => {
      try {
        const cached = window.localStorage.getItem(STORAGE_KEY);

        if (cached) {
          setBookings(normalizeBookings(JSON.parse(cached)));
        }
      } catch {
        // ignore local cache
      }

      try {
        if (!cancelled) await loadCloud();
      } catch {
        // cloud temporarily unavailable
      }
    };

    void boot();

    const poll = window.setInterval(() => {
      void loadCloud().catch(() => undefined);
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [loadCloud]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel("hotel_app_state_bookings")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "hotel_app_state",
            filter: "state_key=eq.bookings",
          },
          (payload) => {
            const next = payload.new as {
              state_data?: unknown;
              version?: number;
            };

            if (!next?.state_data) return;

            const nextVersion = Number(next.version ?? 0);

            if (versionRef.current !== null && nextVersion <= versionRef.current) return;

            applyRemoteBookings(next.state_data, nextVersion);
          },
        )
        .subscribe();
    } catch {
      // polling above is fallback
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [applyRemoteBookings]);

  const persist = useCallback(
    (nextRaw: Booking[]) => {
      const next = normalizeBookings(nextRaw);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGE_EVENT));

        if (writeTimerRef.current) window.clearTimeout(writeTimerRef.current);

        writeTimerRef.current = window.setTimeout(() => {
          void setSharedState({
            data: {
              key: "bookings",
              stateData: next,
              expectedVersion: versionRef.current,
            },
          })
            .then((row) => {
              versionRef.current = row.version;
              applyRemoteBookings(row.stateData, row.version);
            })
            .catch(() => undefined);
        }, 80);
      }

      return next;
    },
    [setSharedState, applyRemoteBookings],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tick = () => {
      setBookings((prev) => {
        const next = applyAutoCheckout(prev);
        if (next === prev) return prev;
        return persist(next);
      });
    };

    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [persist]);

  const addBooking = useCallback(
    (booking: Booking) => {
      let rejected = false;

      setBookings((prev) => {
        const conflict = findConflict(prev, booking);

        if (conflict) {
          rejected = true;
          toast.error(t("overlapError"));
          return prev;
        }

        return persist([...prev, booking]);
      });

      return !rejected;
    },
    [persist, t],
  );

  const removeBooking = useCallback(
    (id: string) => {
      setBookings((prev) => persist(prev.filter((b) => b.id !== id)));
    },
    [persist],
  );

  const updateBooking = useCallback(
    (id: string, updates: Partial<Booking>) => {
      let rejected = false;

      setBookings((prev) => {
        const target = prev.find((b) => b.id === id);
        if (!target) return prev;

        const candidate: Booking = { ...target, ...updates };
        const conflict = findConflict(prev, candidate);

        if (conflict) {
          rejected = true;
          toast.error(t("overlapError"));
          return prev;
        }

        return persist(prev.map((b) => (b.id === id ? candidate : b)));
      });

      return !rejected;
    },
    [persist, t],
  );

  return { bookings, addBooking, removeBooking, updateBooking };
}
