import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DeleteBookingPage from "@/pages/DeleteBooking";

export const Route = createFileRoute("/bookings/$id/delete")({
  component: DeleteBookingRoute,
});

function DeleteBookingRoute() {
  const { id } = Route.useParams();

  return (
    <ProtectedRoute allow={["superuser", "director", "admin"]}>
      <DeleteBookingPage bookingId={id} />
    </ProtectedRoute>
  );
}
