import { Building2, Clock, LayoutGrid, CalendarRange, Shield, Briefcase, ChevronDown, LogOut, Sun, Moon, Timer, UserCog, Users, History, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useI18n } from '@/hooks/useI18n';
import { useClock } from '@/hooks/useClock';
import { HotelLanguageDropdown } from './HotelLanguageDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { LogoutDialog } from '@/components/auth/LogoutDialog';
import { motion } from 'framer-motion';
import { useShift, useNow, formatRemaining } from '@/contexts/ShiftContext';
import { useTheme } from '@/hooks/ThemeContext';

interface HotelNavbarProps {
  totalRooms: number;
  viewMode: 'tiles' | 'timeline';
  onViewModeChange: (mode: 'tiles' | 'timeline') => void;
}

export function HotelNavbar({ viewMode, onViewModeChange }: HotelNavbarProps) {
  const { t } = useI18n();
  const time = useClock();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, switchRole, history } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { session } = useShift();
  const now = useNow();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const roles = [
    { to: '/superuser', label: 'Superuser', Icon: Shield },
    { to: '/director', label: 'Director', Icon: Briefcase },
    { to: '/admin', label: 'Admin', Icon: Shield },
    { to: '/manager', label: 'Manager', Icon: Settings2 },
  ] as const;
  const isSuperuser = user?.role === 'superuser' || !!user?.canSwitchWorkspaces;
  const isAdmin = user?.role === 'admin';
  const isDirector = user?.role === 'director';
  const isManager = user?.role === 'manager';
  const canSeeShiftPanel = isSuperuser || isManager;
  const canManageAdmins = isSuperuser && location.pathname !== '/manager';
  const roleToPath: Record<string, typeof roles[number]> = {
    superuser: roles[0],
    director: roles[1],
    admin: roles[2],
    manager: roles[3],
  };
  const currentRole =
    (user && roleToPath[user.role]) ??
    roles.find((r) => r.to === location.pathname) ??
    roles[0];
  const CurrentIcon = currentRole.Icon;

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    setTimeout(() => {
      logout();
      navigate({ to: '/login', replace: true });
    }, 200);
  };

  const remainingMs = useMemo(() => {
    if (!session) return 0;
    return new Date(session.endISO).getTime() - now.getTime();
  }, [session, now]);

  const isDayShift = session?.kind === 'day';
  const ShiftIcon = isDayShift ? Sun : Moon;
  const isSubstitute = !!session?.coveringFor;

  // Derive currently-signed-in admins from the login history: an admin is
  // "active" if their most recent event in the log is a `login` (no later
  // `logout`). Lets superuser / director / manager see who is on the floor
  // even when several admins are working simultaneously across browsers.
  const activeAdmins = useMemo(() => {
    const latest = new Map<string, { username: string; displayName?: string; at: string; action: 'login' | 'logout' }>();
    for (const ev of history) {
      if (ev.role !== 'admin') continue;
      const prev = latest.get(ev.username);
      if (!prev || new Date(ev.at).getTime() > new Date(prev.at).getTime()) {
        latest.set(ev.username, { username: ev.username, displayName: ev.displayName, at: ev.at, action: ev.action });
      }
    }
    return Array.from(latest.values()).filter((e) => e.action === 'login');
  }, [history]);

  const handleWorkspaceSwitch = (to: typeof roles[number]['to']) => {
    if (location.pathname === to && user?.role === to.slice(1)) return;
    const role = to.slice(1) as 'superuser' | 'director' | 'admin' | 'manager';
    switchRole(role);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace:reset', { detail: { to } }));
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        navigate({ to });
      });
      return;
    }
    navigate({ to });
  };

  return (
    <header className="sticky top-0 z-40 navbar-gradient shadow-xl">
      <div className="relative w-full overflow-hidden bg-gradient-to-r from-fuchsia-600/30 via-purple-500/25 to-indigo-600/30 border-b border-white/15 backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.18)_50%,transparent_70%)] bg-[length:200%_100%] animate-[shimmer_6s_linear_infinite]" />
        <div className="relative flex items-center justify-center gap-2.5 py-1.5 px-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          </span>
          <span className="font-display font-extrabold uppercase tracking-[0.4em] text-[11px] sm:text-xs md:text-sm text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            Тестовый вариант
          </span>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-5 py-3 sm:py-3.5 gap-3 relative">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 animate-fade-in-up">
          <button
            type="button"
            onClick={() => {
              const target = (user && roleToPath[user.role]?.to) ?? currentRole.to;
              navigate({ to: target });
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('workspace:reset', { detail: { to: target } }));
                window.requestAnimationFrame(() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                });
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 group/home rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Go to default page"
            title="Go to default page"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-inner hover-lift transition-transform duration-300 group-hover/home:scale-105">
              <Building2 className="h-5 w-5 text-white transition-transform duration-500 group-hover/home:rotate-12 group-hover/home:scale-110" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="font-display text-lg font-black leading-tight tracking-tight text-white truncate">{t('hotelName')}</h1>
              <p className="text-[11px] text-white/65 font-medium tracking-wide">{t('roomManagement')}</p>
            </div>
          </button>

          {isSuperuser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-2 flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white border border-white/15 transition-all duration-300 hover-lift"
                  aria-label="Switch workspace"
                >
                  <CurrentIcon className="h-3.5 w-3.5" />
                  <span>{currentRole.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {roles.map(({ to, label, Icon }) => (
                  <DropdownMenuItem
                    key={to}
                    onSelect={() => handleWorkspaceSwitch(to)}
                    className={`gap-2 cursor-pointer ${location.pathname === to ? 'bg-accent font-semibold' : ''}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canManageAdmins && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="group ml-1 flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white border border-white/15 transition-colors duration-300 shadow-sm shadow-black/10"
                  aria-label="Manage"
                >
                  <Settings2 className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-90" />
                  <span>Manage</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="w-60 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl shadow-purple-500/10 p-2"
              >
                <DropdownMenuLabel className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] font-bold text-[hsl(265_85%_55%)]">
                  Administration
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={() => {
                    navigate({ to: '/superuser/admins' });
                    if (typeof window !== 'undefined') {
                      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
                    }
                  }}
                  className={`group/item gap-2 cursor-pointer rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-gradient-to-r hover:from-[hsl(265_85%_97%)] hover:to-[hsl(280_85%_97%)] focus:bg-gradient-to-r focus:from-[hsl(265_85%_97%)] focus:to-[hsl(280_85%_97%)] ${location.pathname === '/superuser/admins' ? 'bg-gradient-to-r from-[hsl(265_85%_95%)] to-[hsl(280_85%_95%)] font-bold text-[hsl(265_85%_45%)]' : 'text-slate-700'}`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover/item:bg-[hsl(265_85%_55%)] group-hover/item:text-white transition-colors duration-200">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">Administrators</span>
                </DropdownMenuItem>
                {isSuperuser && (
                  <>
                    <DropdownMenuSeparator className="my-1.5 bg-slate-200/70" />
                    <DropdownMenuItem
                      onSelect={() => {
                        navigate({ to: '/superuser/history' });
                        if (typeof window !== 'undefined') {
                          window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
                        }
                      }}
                      className={`group/item gap-2 cursor-pointer rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 hover:bg-gradient-to-r hover:from-[hsl(265_85%_97%)] hover:to-[hsl(280_85%_97%)] focus:bg-gradient-to-r focus:from-[hsl(265_85%_97%)] focus:to-[hsl(280_85%_97%)] ${location.pathname === '/superuser/history' ? 'bg-gradient-to-r from-[hsl(265_85%_95%)] to-[hsl(280_85%_95%)] font-bold text-[hsl(265_85%_45%)]' : 'text-slate-700'}`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover/item:bg-[hsl(265_85%_55%)] group-hover/item:text-white transition-colors duration-200">
                        <History className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1">Login history</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          {session && isSubstitute && (
            <div
              className="hidden md:flex items-center gap-2 rounded-xl bg-amber-400/20 border border-amber-300/40 px-3 py-2 backdrop-blur-sm"
              title={`Covering for ${session.coveringFor}${session.reason ? ` — ${session.reason}` : ''}`}
            >
              <UserCog className="h-4 w-4 text-amber-200" />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-wider text-amber-100/90 uppercase">
                  Substitute
                </span>
                <span className="text-xs font-black text-white">
                  {session.name} → {session.coveringFor}
                </span>
              </div>
            </div>
          )}

          {isAdmin && session && (
            <div
              className={`hidden md:flex items-center gap-2.5 rounded-xl px-3 py-2 border backdrop-blur-sm animate-fade-in-up ${
                isDayShift
                  ? 'bg-amber-400/15 border-amber-300/30'
                  : 'bg-indigo-400/15 border-indigo-300/30'
              }`}
              title={`${session.name} · ${isDayShift ? 'Day shift 06:00–18:00' : 'Night shift 18:00–06:00'}`}
            >
              <ShiftIcon className={`h-4 w-4 ${isDayShift ? 'text-amber-200' : 'text-indigo-200'}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-wider text-white/70 uppercase">
                  {isDayShift ? 'Day · 06–18' : 'Night · 18–06'} · {session.name}
                </span>
                <span className="text-xs font-black text-white tabular-nums flex items-center gap-1">
                  <Timer className="h-3 w-3 opacity-80" />
                  {formatRemaining(remainingMs)}
                </span>
              </div>
            </div>
          )}

          {(isSuperuser || isManager) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden md:flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-white border border-white/15 transition-all duration-300"
                  aria-label="Active admins"
                  title="Admins currently signed in"
                >
                  <Users className="h-3.5 w-3.5 opacity-90" />
                  <span>
                    {activeAdmins.length > 0
                      ? `${activeAdmins.length} admin${activeAdmins.length > 1 ? 's' : ''}`
                      : 'No admins'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Admins on duty
                </DropdownMenuLabel>
                {activeAdmins.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No admin is currently signed in.
                  </div>
                ) : (
                  <div className="px-1 py-1 space-y-0.5 max-h-64 overflow-auto">
                    {activeAdmins.map((a) => (
                      <div key={a.username} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/60">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-sm font-bold truncate">{a.displayName || a.username}</span>
                          <span className="text-[10px] text-muted-foreground truncate">@{a.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center gap-1 rounded-xl bg-white/10 backdrop-blur-sm p-1 border border-white/15">
            <button
              onClick={() => onViewModeChange('tiles')}
              className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'tiles' ? 'bg-white/25 text-white shadow-lg scale-110' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              aria-label={t('tilesView')}
              title={t('tilesView')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'timeline' ? 'bg-white/25 text-white shadow-lg scale-110' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
              aria-label={t('timelineView')}
              title={t('timelineView')}
            >
              <CalendarRange className="h-4 w-4" />
            </button>
          </div>

          {time && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-sm border border-white/15 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <Clock className="h-4 w-4 text-white/70 animate-pulse" />
              <span className="font-bold text-white tabular-nums">{time}</span>
            </div>
          )}
          <HotelLanguageDropdown />

          <button
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-white transition-colors"
            aria-label={theme === 'dark' ? 'Use white theme' : 'Use black theme'}
            title={theme === 'dark' ? 'White theme' : 'Black theme'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLogoutOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 text-white transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
      <LogoutDialog
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </header>
  );
}
