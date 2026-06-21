import { useMemo, useState, useCallback, useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { HotelNavbar } from "@/components/hotel/HotelNavbar";
import { HotelSummaryCards, type SummaryFilter } from "@/components/hotel/HotelSummaryCards";
import { HotelStatusFilter } from "@/components/hotel/HotelStatusFilter";
import { HotelRoomGrid } from "@/components/hotel/HotelRoomGrid";
import { HotelRoomTileGrid } from "@/components/hotel/HotelRoomTileGrid";
import { BookingDialog } from "@/components/hotel/BookingDialog";
import { useBookingsContext } from "@/hooks/BookingsContext";
import { useHotelGrid } from "@/hooks/HotelGridContext";
import { useI18n } from "@/hooks/useI18n";
import { type Booking } from "@/types/hotel";
import { startOfDay, parseISO, isWithinInterval, format, addDays } from "date-fns";

/**
 * Shared dashboard body — same workspace UI used by superuser (with navbar)
 * and by Manager (inside its own layout, navbar provided by Manager).
 */
export function HotelDashboardBody({
  showNavbar = true,
  showFooter = true,
  viewMode: controlledViewMode,
  onViewModeChange,
}: {
  showNavbar?: boolean;
  showFooter?: boolean;
  viewMode?: "tiles" | "timeline";
  onViewModeChange?: (mode: "tiles" | "timeline") => void;
}) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");
  const { bookings, addBooking, removeBooking, updateBooking } = useBookingsContext();
  const { rooms } = useHotelGrid();
  const [internalViewMode, setInternalViewMode] = useState<"tiles" | "timeline">("timeline");
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = useCallback(
    (next: "tiles" | "timeline" | ((prev: "tiles" | "timeline") => "tiles" | "timeline")) => {
      const resolved = typeof next === "function" ? (next as (p: "tiles" | "timeline") => "tiles" | "timeline")(viewMode) : next;
      if (onViewModeChange) onViewModeChange(resolved);
      if (controlledViewMode === undefined) setInternalViewMode(resolved);
    },
    [controlledViewMode, onViewModeChange, viewMode],
  );
  const [statusFilter, setStatusFilter] = useState<SummaryFilter>("all");
  const [editRoomNumber, setEditRoomNumber] = useState<number | null>(null);
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);

  const handleSummarySelect = useCallback((filter: SummaryFilter) => {
    setStatusFilter(filter);
    setViewMode("tiles");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document
          .getElementById("hotel-main-grid")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  useEffect(() => {
    if (focusBookingId) setViewMode("timeline");
  }, [focusBookingId]);

  const handleFocusConsumed = useCallback(() => {
    setFocusBookingId(null);
  }, []);

  const goToBookingOnGrid = useCallback((bookingId: string) => {
    setViewMode("timeline");
    setFocusBookingId(bookingId);
  }, []);

  const handleAddBooking = useCallback((b: Booking) => {
    const ok = addBooking(b);
    if (ok) setStatusFilter((prev) => (prev !== "all" && prev !== b.status ? "all" : prev));
    return ok;
  }, [addBooking]);

  const handleUpdateBooking = useCallback((id: string, updates: Partial<Booking>) => {
    const ok = updateBooking(id, updates);
    if (ok && updates.status) {
      setStatusFilter((prev) => (prev !== "all" && prev !== updates.status ? "all" : prev));
    }
    return ok;
  }, [updateBooking]);

  const handleEditRoom = useCallback((roomNumber: number) => {
    setEditRoomNumber(roomNumber);
  }, []);

  const editingBooking = useMemo<Booking | null>(() => {
    if (editRoomNumber == null) return null;
    const today = startOfDay(new Date());
    return (
      bookings.find(
        (b) =>
          b.roomNumber === editRoomNumber &&
          isWithinInterval(today, { start: parseISO(b.checkIn), end: parseISO(b.checkOut) }),
      ) ?? null
    );
  }, [editRoomNumber, bookings]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    bookings.forEach((booking) => {
      c[booking.status] = (c[booking.status] || 0) + 1;
    });
    return c;
  }, [bookings]);

  const summary = useMemo(() => {
    const inHouse = counts["in-house"] || 0;
    const booked = counts.booked || 0;
    const confirmed = counts.confirmed || 0;
    const pending = counts.pending || 0;
    const maintenance = counts.maintenance || 0;
    const checkedOut = counts["checked-out"] || 0;
    const occupied = inHouse + booked + confirmed + pending + maintenance;

    return {
      total: rooms.length,
      available: Math.max(0, rooms.length - occupied),
      confirmed,
      pending,
      booked,
      inHouse,
      checkedOut,
      maintenance,
    };
  }, [counts, rooms]);

  const filteredBookings = useMemo(() => {
    if (statusFilter === "all") return bookings;
    return bookings.filter((booking) => booking.status === statusFilter);
  }, [bookings, statusFilter]);

  return (
    <>
      {showNavbar && (
        <HotelNavbar totalRooms={rooms.length} viewMode={viewMode} onViewModeChange={setViewMode} />
      )}
      <HotelSummaryCards {...summary} activeFilter={statusFilter} onSelect={handleSummarySelect} />
      <div className="px-4">
        <HotelStatusFilter activeFilter={statusFilter} onFilterChange={setStatusFilter} counts={counts} />
      </div>
      <main id="hotel-main-grid" className="flex min-h-0 flex-1 flex-col px-4 pb-2 scroll-mt-4 transition-[opacity] duration-300">
        {viewMode === "timeline" ? (
          <HotelRoomGrid
            bookings={filteredBookings}
            conflictBookings={bookings}
            onAddBooking={handleAddBooking}
            onDeleteBooking={removeBooking}
            onUpdateBooking={handleUpdateBooking}
            focusBookingId={focusBookingId}
            onFocusConsumed={handleFocusConsumed}
            labelWidth={isAdminRoute ? 320 : undefined}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HotelRoomTileGrid
              rooms={rooms}
              bookings={bookings}
              activeFilter={statusFilter}
              selectedDate={new Date()}
              onEditRoom={handleEditRoom}
              onShowOnGrid={goToBookingOnGrid}
            />
          </div>
        )}
      </main>
      <BookingDialog
        open={editRoomNumber != null}
        onClose={() => setEditRoomNumber(null)}
        onSave={(b) => { const ok = handleAddBooking(b); if (ok !== false) setEditRoomNumber(null); return ok; }}
        onUpdate={handleUpdateBooking}
        onDelete={removeBooking}
        roomNumber={editRoomNumber ?? 0}
        checkIn={editingBooking?.checkIn ?? format(new Date(), "yyyy-MM-dd")}
        checkOut={editingBooking?.checkOut ?? format(addDays(new Date(), 1), "yyyy-MM-dd")}
        editBooking={editingBooking}
      />
      {showFooter && (
        <footer className="footer-animate shrink-0 px-4 py-2 text-center text-[11px] text-muted-foreground">
          {t("copyright")}
        </footer>
      )}
    </>
  );
}

function HotelDashboard() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <HotelDashboardBody />
    </div>
  );
}

export default HotelDashboard;
