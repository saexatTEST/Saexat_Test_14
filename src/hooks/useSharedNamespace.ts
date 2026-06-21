import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getHotelState, setHotelState, type HotelStateKey } from '@/lib/hotel-state.functions';

export type RecordMap = Record<string, Record<string, unknown>>;

/**
 * Syncs a record-map (keyed by bookingId) through the shared `hotel_app_state`
 * table — the same engine bookings already use. Every browser/IP polls the
 * cloud every 2s and writes are debounced+pushed, so passport/anketa data is
 * identical for superuser, admin and director everywhere.
 */
export function useSharedNamespace(key: HotelStateKey, eventName: string) {
  const getShared = useServerFn(getHotelState);
  const setShared = useServerFn(setHotelState);
  const [map, setMap] = useState<RecordMap>({});
  const mapRef = useRef<RecordMap>({});
  const writeTimer = useRef<number | null>(null);
  const lastVersion = useRef(0);
  const pendingWrite = useRef(false);

  useEffect(() => { mapRef.current = map; }, [map]);

  // Pull from cloud on mount + poll every 2s.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const pull = async () => {
      try {
        const row = await getShared({ data: { key } });
        if (cancelled || !row?.stateData) return;
        // Don't clobber a value we just typed (waiting to be flushed),
        // and ignore stale versions we already have.
        if (row.version <= lastVersion.current || pendingWrite.current) return;
        lastVersion.current = row.version;
        setMap((row.stateData as RecordMap) || {});
        window.dispatchEvent(new Event(eventName));
      } catch {
        /* offline: keep whatever we have, retry on next tick */
      }
    };
    void pull();
    const id = window.setInterval(pull, 2000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [getShared, key, eventName]);

  // Write one booking's slice; merges into the full map and pushes to cloud.
  const setRecord = useCallback((id: string, data: Record<string, unknown>) => {
    setMap((prev) => {
      const next = { ...prev, [id]: data };
      mapRef.current = next;
      pendingWrite.current = true;
      if (typeof window !== 'undefined') {
        if (writeTimer.current) window.clearTimeout(writeTimer.current);
        writeTimer.current = window.setTimeout(() => {
          void setShared({ data: { key, stateData: mapRef.current } })
            .then((row) => { lastVersion.current = row.version; pendingWrite.current = false; })
            .catch(() => { pendingWrite.current = false; });
        }, 150);
        window.dispatchEvent(new Event(eventName));
      }
      return next;
    });
  }, [setShared, key, eventName]);

  return { map, setRecord };
}
