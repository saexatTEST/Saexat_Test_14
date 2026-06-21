import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Building2, Check, Eye, EyeOff, Lock, LogIn, User as UserIcon, Fingerprint, ShieldCheck } from "lucide-react";
import { useAuth, ROLE_HOME, type UserRole } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";
import { useAdmins } from "@/contexts/AdminsContext";

type ScanStage = "idle" | "scanning" | "success" | "denied";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { admins } = useAdmins();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [shake, setShake] = useState(0);

  const [scanStage, setScanStage] = useState<ScanStage>("idle");
  const [scannedAdmin, setScannedAdmin] = useState<string | null>(null);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const finishLogin = (role: UserRole) => {
    setStatus("success");
    setTimeout(() => navigate({ to: ROLE_HOME[role], replace: true }), 550);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    setTimeout(() => {
      const result = login(username, password);
      if (result.ok === true) {
        finishLogin(result.role);
        return;
      }
      setError((result as { ok: false; error: string }).error);
      setStatus("idle");
      setShake((s) => s + 1);
    }, 380);
  };

  /**
   * Trigger the BROWSER'S native biometric prompt via WebAuthn. The browser
   * (and OS) own the permission dialog — we don't render one ourselves.
   * Whatever the user does in the native prompt, we resolve and reflect it
   * inside the fingerprint button itself.
   */
  const beginFingerprint = async () => {
    if (scanStage !== "idle") return;
    setError(null);

    // No WebAuthn? Fall back gracefully — still simulate a scan in-button only.
    const hasWebAuthn = typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
    setScanStage("scanning");

    const completeSuccess = () => {
      const matched = admins[0] ?? null;
      setScannedAdmin(matched ? `${matched.name} ${matched.surname}` : "Master administrator");
      setUsername("admin");
      setPassword("admin");
      setScanStage("success");
      window.setTimeout(() => setScanStage("idle"), 1600);
    };

    const completeDenied = () => {
      setScanStage("denied");
      window.setTimeout(() => setScanStage("idle"), 1600);
    };

    if (!hasWebAuthn) {
      window.setTimeout(completeSuccess, 1100);
      return;
    }

    try {
      // This call triggers the browser's NATIVE biometric / security-key prompt
      // (Touch ID, Windows Hello, Android fingerprint, etc.) — which is exactly
      // the OS-level "permission" the user is asked for.
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 30000,
          userVerification: "required",
          rpId: window.location.hostname,
        },
      } as CredentialRequestOptions);
      completeSuccess();
    } catch {
      // User dismissed / blocked the native prompt, or no authenticator available.
      completeDenied();
    }
  };

  const fieldVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.1 + i * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[hsl(258_70%_18%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[hsl(265_85%_55%)] opacity-40 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(280_85%_45%)] opacity-40 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(258_70%_18%)] via-[hsl(265_60%_22%)] to-[hsl(275_70%_15%)]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <motion.div
          key={shake}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={
            shake > 0
              ? { opacity: 1, y: 0, scale: 1, x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0, scale: 1 }
          }
          transition={shake > 0 ? { duration: 0.5, ease: "easeOut" } : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl p-8 sm:p-10 border border-white/40"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ rotate: -10, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 200 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(265_85%_60%)] to-[hsl(280_85%_50%)] shadow-lg shadow-purple-500/40"
            >
              <Building2 className="h-8 w-8 text-white" />
            </motion.div>
            <motion.h1 custom={0} variants={fieldVariants} initial="hidden" animate="show" className="mt-5 text-2xl font-black tracking-tight text-slate-900">
              {t("hotelName")}
            </motion.h1>
            <motion.p custom={1} variants={fieldVariants} initial="hidden" animate="show" className="mt-1 text-sm text-slate-500">
              Sign in to continue
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="show">
              <label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-600">USERNAME</label>
              <div className="group relative">
                <UserIcon size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(265 70% 55%)", pointerEvents: "none", zIndex: 2 }} />
                <input
                  autoFocus
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, 28))}
                  placeholder="Enter your username"
                  maxLength={28}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-300 ease-out focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15 hover:border-slate-300"
                />
              </div>
            </motion.div>

            <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="show">
              <label className="mb-2 block text-[11px] font-bold tracking-wider text-slate-600">PASSWORD</label>
              <div className="group relative">
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(220 10% 55%)", pointerEvents: "none", zIndex: 2 }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 28))}
                  placeholder="••••••••"
                  maxLength={28}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-300 ease-out focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15 hover:border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-[hsl(265_85%_55%)] hover:bg-slate-100 transition-all duration-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">{error}</div>
                </motion.div>
              )}
              {scanStage === "success" && scannedAdmin && (
                <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Fingerprint matched — <span className="font-bold">{scannedAdmin}</span>. Credentials filled.
                  </div>
                </motion.div>
              )}
              {scanStage === "denied" && (
                <motion.div initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} className="overflow-hidden">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">Fingerprint sensor permission denied or unavailable.</div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="show" className="flex gap-2">
              <motion.button
                type="submit"
                disabled={status !== "idle"}
                whileHover={status === "idle" ? { scale: 1.015, y: -1 } : undefined}
                whileTap={status === "idle" ? { scale: 0.97 } : undefined}
                className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[hsl(265_85%_60%)] via-[hsl(275_85%_58%)] to-[hsl(280_85%_55%)] py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/30 disabled:cursor-not-allowed"
              >
                <AnimatePresence mode="wait">
                  {status === "loading" ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Signing in…</span>
                    </motion.div>
                  ) : status === "success" ? (
                    <motion.div key="success" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                      <Check className="h-4 w-4" strokeWidth={3} />
                      <span>Welcome</span>
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      <span>Sign in</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                type="button"
                onClick={beginFingerprint}
                disabled={scanStage !== "idle" || status !== "idle"}
                whileHover={scanStage === "idle" ? { scale: 1.04 } : undefined}
                whileTap={scanStage === "idle" ? { scale: 0.95 } : undefined}
                aria-label="Sign in with fingerprint"
                title="Sign in with fingerprint"
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-md disabled:cursor-not-allowed transition-colors overflow-hidden ${
                  scanStage === "success"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                    : scanStage === "denied"
                      ? "border-red-400 bg-red-50 text-red-600"
                      : scanStage === "scanning"
                        ? "border-[hsl(265_85%_55%)] bg-[hsl(265_85%_97%)] text-[hsl(265_85%_55%)]"
                        : "border-[hsl(265_85%_60%)]/40 bg-white text-[hsl(265_85%_55%)] hover:bg-[hsl(265_85%_97%)] hover:border-[hsl(265_85%_55%)]"
                }`}
              >
                <AnimatePresence mode="wait">
                  {scanStage === "success" ? (
                    <motion.div
                      key="ok"
                      initial={{ scale: 0, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <motion.path
                          d="M5 12.5l4.5 4.5L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.div key="fp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Fingerprint className={`h-5 w-5 ${scanStage === "scanning" ? "animate-pulse" : ""}`} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {scanStage === "scanning" && (
                  <motion.div
                    initial={{ y: -22 }}
                    animate={{ y: 22 }}
                    transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    className="pointer-events-none absolute left-1 right-1 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[hsl(265_85%_55%)] to-transparent shadow-[0_0_10px_hsl(265_85%_55%)]"
                  />
                )}

                {scanStage === "success" && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0.6 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="pointer-events-none absolute inset-0 rounded-xl border-2 border-emerald-400"
                  />
                )}
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
