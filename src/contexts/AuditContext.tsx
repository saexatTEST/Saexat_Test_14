import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { UserRole } from './AuthContext';
import { useSharedState } from '@/lib/hotel-sync';

export interface AuditEvent {
  id: string;
  at: string;
  actor: { username: string; role: UserRole; adminId?: string | null };
  category: 'auth' | 'booking' | 'admin' | 'shift' | 'form' | 'system';
  action: string;
  summary: string;
  details?: Record<string, unknown>;
}

interface AuditContextValue {
  events: AuditEvent[];
  log: (e: Omit<AuditEvent, 'id' | 'at'>) => void;
  clear: () => void;
}

const AuditContext = createContext<AuditContextValue | undefined>(undefined);

export function AuditProvider({ children }: { children: ReactNode }) {
  const { data, setData } = useSharedState<AuditEvent[]>('audit', []);
  const events = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const log = useCallback<AuditContextValue['log']>((e) => {
    const ev: AuditEvent = { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: new Date().toISOString() };
    setData((prev) => [ev, ...(Array.isArray(prev) ? prev : [])].slice(0, 2000));
  }, [setData]);

  const clear = useCallback(() => setData([]), [setData]);

  const value = useMemo(() => ({ events, log, clear }), [events, log, clear]);
  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
}
