import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import SuperuserAdmins from "@/pages/SuperuserAdmins";

export const Route = createFileRoute("/superuser/admins")({
  component: () => (
    <ProtectedRoute allow={["superuser", "admin", "manager"]}>
      <SuperuserAdmins />
    </ProtectedRoute>
  ),
});
