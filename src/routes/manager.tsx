import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Manager from "@/pages/Manager";

export const Route = createFileRoute("/manager")({
  component: ManagerRouteComponent,
});

function ManagerRouteComponent() {
  return (
    <ProtectedRoute allow={["superuser", "manager"]}>
      <Manager />
    </ProtectedRoute>
  );
}
