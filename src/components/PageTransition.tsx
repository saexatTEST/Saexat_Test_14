import { Outlet, useRouterState } from "@tanstack/react-router";

/**
 * Snappy route transition: a lightweight fade (no blur, no layout-shift),
 * mounted without AnimatePresence so the new page renders immediately
 * instead of waiting for the previous page to exit. This eliminates the
 * perceived "lag" when switching between superuser / admin / director /
 * manager panels and when opening dropdown destinations like
 * /superuser/admins or /superuser/history.
 */
export function PageTransition() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div
      key={pathname}
      className="workspace-page-transition"
      style={{ willChange: "opacity, transform" }}
    >
      <Outlet />
    </div>
  );
}
