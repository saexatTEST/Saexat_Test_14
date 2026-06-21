import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSignaturePadHID — connect to an external USB signature pad via WebHID
 * and stream its X/Y/pressure samples to a callback so they can be drawn
 * into the on-screen <canvas> in real time.
 *
 * The vendor / report layout varies per device, so we keep parsing
 * deliberately permissive: we read up to 4 little-endian uint16 values
 * out of each input report and look for an obvious "pen down" pressure /
 * tip-switch byte. Devices that follow the HID Digitizer usage page
 * (Wacom STU, Topaz, generic OEM pads, etc.) tend to fit this shape.
 *
 * If the user's browser doesn't support WebHID (Firefox, Safari) we
 * silently expose `supported = false` and the regular touch / mouse
 * drawing keeps working.
 */

export type HIDSample = {
  /** 0..1 normalized X across the pad surface */
  x: number;
  /** 0..1 normalized Y across the pad surface */
  y: number;
  /** 0..1 normalized pressure; 0 == pen up */
  pressure: number;
  /** True when the pen tip is touching the surface */
  down: boolean;
};

type HIDInputReportEvent = Event & {
  data: DataView;
  device: { productName?: string };
  reportId: number;
};

// Minimal WebHID typings (the lib targets DOM, so we just narrow what we use)
type HIDDeviceLike = {
  open: () => Promise<void>;
  close: () => Promise<void>;
  opened: boolean;
  productName?: string;
  addEventListener: (
    type: 'inputreport',
    handler: (e: HIDInputReportEvent) => void,
  ) => void;
  removeEventListener: (
    type: 'inputreport',
    handler: (e: HIDInputReportEvent) => void,
  ) => void;
};

declare global {
  interface Navigator {
    hid?: {
      requestDevice: (opts: { filters: unknown[] }) => Promise<HIDDeviceLike[]>;
      getDevices: () => Promise<HIDDeviceLike[]>;
    };
  }
}

const MAX_X_GUESS = 0xffff;
const MAX_Y_GUESS = 0xffff;
const MAX_P_GUESS = 0x03ff;

export function useSignaturePadHID(onSample: (s: HIDSample) => void) {
  const [supported, setSupported] = useState(false);
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<HIDDeviceLike | null>(null);
  const cbRef = useRef(onSample);

  useEffect(() => {
    cbRef.current = onSample;
  }, [onSample]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.hid) {
      setSupported(true);
    }
  }, []);

  const handleReport = useCallback((e: HIDInputReportEvent) => {
    const dv = e.data;
    if (dv.byteLength < 4) return;
    // Heuristic parse: first 2 uint16 LE = X, Y. Optional uint16 = pressure.
    const x = dv.getUint16(0, true);
    const y = dv.getUint16(2, true);
    const pressure =
      dv.byteLength >= 6 ? dv.getUint16(4, true) : dv.getUint8(dv.byteLength - 1);
    const tipByte = dv.byteLength >= 7 ? dv.getUint8(6) : pressure > 0 ? 1 : 0;
    const down = (tipByte & 0x01) === 1 || pressure > 0;
    cbRef.current({
      x: Math.min(1, x / MAX_X_GUESS),
      y: Math.min(1, y / MAX_Y_GUESS),
      pressure: Math.min(1, pressure / MAX_P_GUESS),
      down,
    });
  }, []);

  const disconnect = useCallback(async () => {
    const d = deviceRef.current;
    if (!d) return;
    try {
      d.removeEventListener('inputreport', handleReport);
      if (d.opened) await d.close();
    } catch {
      /* ignore */
    }
    deviceRef.current = null;
    setConnected(false);
    setDeviceName(null);
  }, [handleReport]);

  const connect = useCallback(async () => {
    setError(null);
    if (!navigator.hid) {
      setError('WebHID not supported in this browser');
      return;
    }
    try {
      // Empty filters → user picks any HID device from the chooser.
      const devices = await navigator.hid.requestDevice({ filters: [] });
      const device = devices[0];
      if (!device) return;
      if (!device.opened) await device.open();
      device.addEventListener('inputreport', handleReport);
      deviceRef.current = device;
      setDeviceName(device.productName ?? 'USB Signature Pad');
      setConnected(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [handleReport]);

  // Auto re-attach previously authorized devices on mount.
  useEffect(() => {
    let alive = true;
    if (!navigator.hid) return;
    navigator.hid
      .getDevices()
      .then(async (devs) => {
        if (!alive || devs.length === 0) return;
        const device = devs[0];
        try {
          if (!device.opened) await device.open();
          device.addEventListener('inputreport', handleReport);
          deviceRef.current = device;
          setDeviceName(device.productName ?? 'USB Signature Pad');
          setConnected(true);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, [handleReport]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return { supported, connected, deviceName, error, connect, disconnect };
}
