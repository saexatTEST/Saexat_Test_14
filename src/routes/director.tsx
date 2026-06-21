import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DirectorPage from "@/pages/Director";

export const Route = createFileRoute("/director")({
  component: DirectorRouteComponent,
});

function DirectorRouteComponent() {
  return (
    <ProtectedRoute allow={["superuser", "director", "manager"]}>
      <DirectorPage />
    </ProtectedRoute>
  );
}
