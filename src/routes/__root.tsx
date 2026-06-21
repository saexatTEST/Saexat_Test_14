import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
void Outlet;
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingsProvider } from "@/hooks/BookingsContext";
import { HotelGridProvider } from "@/hooks/HotelGridContext";
import { ThemeProvider } from "@/hooks/ThemeContext";
import { I18nProvider } from "@/hooks/useI18n";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import { AdminsProvider } from "@/contexts/AdminsContext";
import { AuditProvider } from "@/contexts/AuditContext";
import { ShiftWatcher } from "@/components/auth/ShiftWatcher";
import { PageTransition } from "@/components/PageTransition";
import { ToastAutoDismiss } from "@/components/ToastAutoDismiss";
import { UserLanguageSync } from "@/components/auth/UserLanguageSync";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
  { charSet: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { title: "Отель Саёхат — управление" },
  {
    name: "description",
    content: "Панель управления номерами, бронированиями и сменами отеля Саёхат.",
  },
  { property: "og:title", content: "Отель Саёхат — управление" },
  {
    property: "og:description",
    content: "Панель управления номерами, бронированиями и сменами отеля Саёхат.",
  },
  { property: "og:image", content: "" },
  { property: "og:type", content: "website" },
  { name: "twitter:title", content: "Отель Саёхат — управление" },
  {
    name: "twitter:description",
    content: "Панель управления номерами, бронированиями и сменами отеля Саёхат.",
  },
  { name: "twitter:image", content: "" },
  { name: "twitter:card", content: "summary" },
],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <TooltipProvider delayDuration={150}>
            <Toaster />
            <Sonner />
            <ToastAutoDismiss />
            <AdminsProvider>
              <AuditProvider>
                <AuthProvider>
                  <UserLanguageSync />
                  <BookingsProvider>
                    <HotelGridProvider>
                      <ShiftProvider>
                        <ShiftWatcher />
                        <PageTransition />
                      </ShiftProvider>
                    </HotelGridProvider>
                  </BookingsProvider>
                </AuthProvider>
              </AuditProvider>
            </AdminsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
