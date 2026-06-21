import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const Route = createFileRoute("/superuser")({
  component: () => (
    <ProtectedRoute allow={["superuser"]}>
      <Outlet />
    </ProtectedRoute>
  ),
});
