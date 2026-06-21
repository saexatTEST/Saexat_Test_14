import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { ROLE_HOME, UserRole, useAuth } from "@/contexts/AuthContext";

interface Props {
  allow: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allow, children }: Props) {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm font-medium text-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.canSwitchWorkspaces) return <>{children}</>;
  if (!allow.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}
