import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import SuperuserHistory from "@/pages/SuperuserHistory";

export const Route = createFileRoute("/superuser/history")({
  component: () => (
    <ProtectedRoute allow={["superuser", "manager"]}>
      <SuperuserHistory />
    </ProtectedRoute>
  ),
});
