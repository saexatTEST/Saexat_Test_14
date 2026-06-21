import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Check, ScanLine, UserCog } from "lucide-react";

export type FingerprintMode = "auto" | "manual";
export type FingerprintStatus = "idle" | "scanning" | "verified" | "error";

interface Props {
  /** Currently entered name (used in manual mode to verify it matches). */
  name: string;
  /** Setter — used in auto-fill mode after a successful scan. */
  onName: (n: string) => void;
  /** When verification succeeds. */
  onVerified: () => void;
  /** When user clears verification (e.g. changed name). */
  onReset: () => void;
  /** Verified state (parent controls so it can clear when name changes). */
  verified: boolean;
  /** Default name to auto-fill when "auto" mode is used and scan succeeds. */
  autoFillName?: string;
}

/**
 * Visual-only fingerprint verification pad. No real biometrics — the scan is
 * a 1.5s animation that always succeeds (in auto mode it auto-fills the name,
 * in manual mode it just marks the entered name as verified).
 */
export function FingerprintPad({ name, onName, onVerified, onReset, verified, autoFillName }: Props) {
  const [mode, setMode] = useState<FingerprintMode>("auto");
  const [status, setStatus] = useState<FingerprintStatus>("idle");

  // If parent resets verified externally (e.g. user retyped name), reflect it.
  useEffect(() => {
    if (!verified && status === "verified") setStatus("idle");
  }, [verified, status]);

  const startScan = () => {
    if (status === "scanning") return;
    if (mode === "manual" && !name.trim()) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 1100);
      return;
    }
    setStatus("scanning");
    window.setTimeout(() => {
      if (mode === "auto") onName(autoFillName || "Akmal Karimov");
      setStatus("verified");
      onVerified();
    }, 1500);
  };

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-[hsl(265_85%_55%)]" />
          <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
            Identity verification
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              setMode("auto");
              if (verified) {
                onReset();
                setStatus("idle");
              }
            }}
            className={`rounded-md px-2 py-1 transition ${mode === "auto" ? "bg-white text-[hsl(265_85%_55%)] shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            AUTO
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              if (verified) {
                onReset();
                setStatus("idle");
              }
            }}
            className={`rounded-md px-2 py-1 transition ${mode === "manual" ? "bg-white text-[hsl(265_85%_55%)] shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            MANUAL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={startScan}
          disabled={status === "scanning"}
          className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 transition-all overflow-hidden ${
            status === "verified"
              ? "border-emerald-400 bg-emerald-50"
              : status === "scanning"
                ? "border-[hsl(265_85%_55%)] bg-[hsl(265_85%_97%)]"
                : status === "error"
                  ? "border-red-400 bg-red-50 animate-pulse"
                  : "border-slate-300 bg-white hover:border-[hsl(265_85%_55%)] hover:bg-[hsl(265_85%_98%)]"
          }`}
          aria-label="Scan fingerprint"
        >
          <AnimatePresence mode="wait">
            {status === "verified" ? (
              <motion.div
                key="ok"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
              >
                <Check className="h-9 w-9 text-emerald-600" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                key="fp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Fingerprint
                  className={`h-10 w-10 ${
                    status === "scanning"
                      ? "text-[hsl(265_85%_55%)]"
                      : status === "error"
                        ? "text-red-500"
                        : "text-slate-400"
                  }`}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {status === "scanning" && (
            <motion.div
              initial={{ y: -28 }}
              animate={{ y: 28 }}
              transition={{ duration: 0.75, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              className="pointer-events-none absolute left-1 right-1 h-1 rounded-full bg-gradient-to-r from-transparent via-[hsl(265_85%_55%)] to-transparent shadow-[0_0_12px_hsl(265_85%_55%)]"
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {status === "verified" ? (
            <div>
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                <Check className="h-4 w-4" /> Done — identity verified
              </div>
              <p className="mt-0.5 text-xs text-slate-600 truncate">
                Welcome, <span className="font-bold text-slate-900">{name || autoFillName}</span>
              </p>
            </div>
          ) : status === "scanning" ? (
            <div>
              <div className="flex items-center gap-1.5 text-[hsl(265_85%_45%)] font-bold text-sm">
                <ScanLine className="h-4 w-4 animate-pulse" /> Scanning fingerprint…
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Hold still for a moment.</p>
            </div>
          ) : status === "error" ? (
            <div>
              <div className="text-red-600 font-bold text-sm">Enter a name first</div>
              <p className="mt-0.5 text-xs text-slate-500">In manual mode the name must be filled in before scanning.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm">
                <UserCog className="h-4 w-4" /> Tap to {mode === "auto" ? "scan & auto-fill name" : "verify entered name"}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {mode === "auto"
                  ? "Fingerprint will reveal who is on shift."
                  : "Type the name above, then tap to confirm."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}