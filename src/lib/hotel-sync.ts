import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type HotelStateKey = 'bookings' | 'grid' | 'admins' | 'audit' | 'auth-history';

interface Row<T> { state_data: T; version: number; updated_at: string }

const FLUSH_MS = 150;

/**
 * Shared, real-time, cross-user state backed by `public.hotel_app_state`.
 * - Initial value comes from the DB (or `initial` if row is empty).
 * - Every change in any browser is pushed to every other browser via Supabase Realtime.
 * - Concurrent writes are reconciled with a compare-and-swap RPC + retry.
 */
export function useSharedState<T>(key: HotelStateKey, initial: T) {
  const [data, setDataState] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const versionRef = useRef<number>(0);
  const pendingRef = useRef<T | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localEchoRef = useRef<number>(0); // ignore realtime for our own writes

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from('hotel_app_state')
        .select('state_data, version')
        .eq('state_key', key)
        .maybeSingle();
      if (cancelled) return;
      if (!error && row) {
        versionRef.current = Number(row.version) || 0;
        setDataState(row.state_data as T);
      } else {
        // Seed row so realtime UPDATEs work for everyone
        const { data: seeded } = await supabase
          .rpc('hotel_app_state_cas', { p_key: key, p_expected_version: 0, p_state_data: initial as any })
          .select()
          .maybeSingle();
        if (seeded) versionRef.current = Number((seeded as any).version) || 1;
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`hotel_app_state:${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hotel_app_state', filter: `state_key=eq.${key}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as Row<T> | null;
          if (!row) return;
          const v = Number(row.version) || 0;
          if (v <= versionRef.current) return;
          if (localEchoRef.current && v === localEchoRef.current) {
            localEchoRef.current = 0;
            return;
          }
          versionRef.current = v;
          setDataState(row.state_data as T);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [key]);

  const flush = useCallback(async () => {
    if (pendingRef.current === null) return;
    const value = pendingRef.current;
    pendingRef.current = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const expected = versionRef.current;
      const { data: rows, error } = await supabase.rpc('hotel_app_state_cas', {
        p_key: key,
        p_expected_version: expected,
        p_state_data: value as any,
      });
      if (error) { console.error('[hotel-sync] cas error', error); return; }
      const row = Array.isArray(rows) ? (rows[0] as Row<T> | undefined) : (rows as Row<T> | null);
      if (!row) return;
      const newV = Number(row.version) || 0;
      if (newV === expected + 1) {
        versionRef.current = newV;
        localEchoRef.current = newV;
        return;
      }
      // CAS lost: pull latest, merge by overwriting with our intended value, retry
      versionRef.current = newV;
      setDataState(row.state_data as T);
      // Re-apply our local change on top of the freshly fetched state
      pendingRef.current = value;
    }
  }, [key]);


  const setData = useCallback((updater: T | ((prev: T) => T)) => {
    setDataState((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      pendingRef.current = next;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => { void flush(); }, FLUSH_MS);
      return next;
    });
  }, [flush]);

  return { data, setData, ready } as const;
}
