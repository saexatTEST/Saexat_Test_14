import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Users,
  ScanLine,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  IdCard,
  AtSign,
  KeyRound,
} from "lucide-react";
import { useAdmins, type AdminRecord, type AdminInput } from "@/contexts/AdminsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { HotelNavbar } from "@/components/hotel/HotelNavbar";

function formatFingerprint(): string {
  const part = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  return `FP-${part()}-${part()}`;
}

function genPassword(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function SuperuserAdmins({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { admins, addAdmin, updateAdmin, removeAdmin } = useAdmins();
  const { log } = useAudit();
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const [query, setQuery] = useState("");
  const canEdit = user?.role === "superuser" || user?.role === "manager";

  const actor = user
    ? { username: user.username, role: user.role, adminId: user.adminId ?? null }
    : { username: "system", role: "superuser" as const };

  const filtered = admins.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.surname.toLowerCase().includes(q) ||
      a.username.toLowerCase().includes(q) ||
      a.idNumber.toLowerCase().includes(q) ||
      a.fingerprintId.toLowerCase().includes(q)
    );
  });

  return (
    <div className={embedded ? "flex flex-col" : "flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100"}>
      {!embedded && <HotelNavbar totalRooms={0} viewMode="tiles" onViewModeChange={() => {}} />}
      <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2 text-[hsl(265_85%_55%)] text-xs font-bold tracking-widest uppercase">
              <Users className="h-3.5 w-3.5" />
              Registered administrators
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Administrators directory</h1>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Onboard staff, capture their fingerprint, ID number, and login credentials. Each admin signs into the
              shared admin dashboard with their own username and password.
            </p>
          </div>
          {canEdit && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setEditing(null); setOpenForm(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[hsl(265_85%_60%)] to-[hsl(280_85%_55%)] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30"
            >
              <Plus className="h-4 w-4" />
              Register administrator
            </motion.button>
          )}
        </header>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 28))}
            placeholder="Search by name, username, ID or fingerprint…"
            maxLength={28}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 py-14 text-center">
            <Fingerprint className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No administrators yet</p>
            <p className="mt-1 text-xs text-slate-500">Register your first administrator to start tracking activity.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {filtered.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(265_85%_60%)] to-[hsl(280_85%_55%)] text-white shadow-md shadow-purple-500/30">
                      <Fingerprint className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-black text-slate-900 truncate">
                        {a.name} {a.surname}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1"><AtSign className="h-3 w-3" />{a.username || "—"}</span>
                        <span className="inline-flex items-center gap-1"><IdCard className="h-3 w-3" />{a.idNumber || "—"}</span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-[hsl(265_85%_45%)]">
                        <ShieldCheck className="h-3 w-3" />
                        {a.fingerprintId}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-400">
                        Registered {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditing(a); setOpenForm(true); }}
                          className="rounded-lg p-1.5 text-slate-500 hover:text-[hsl(265_85%_55%)] hover:bg-slate-100"
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${a.name} ${a.surname}?`)) {
                              removeAdmin(a.id);
                              log({
                                actor,
                                category: "admin",
                                action: "admin.deleted",
                                summary: `Removed administrator ${a.name} ${a.surname} (${a.username})`,
                                details: { adminId: a.id, username: a.username, idNumber: a.idNumber },
                              });
                            }
                          }}
                          className="rounded-lg p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>

      <AnimatePresence>
        {openForm && (
          <AdminForm
            initial={editing}
            existing={admins}
            onClose={() => setOpenForm(false)}
            onSave={(data) => {
              if (editing) {
                updateAdmin(editing.id, data);
                log({
                  actor,
                  category: "admin",
                  action: "admin.updated",
                  summary: `Updated administrator ${data.name} ${data.surname} (${data.username})`,
                  details: { adminId: editing.id, before: editing, patch: data },
                });
              } else {
                const rec = addAdmin(data);
                log({
                  actor,
                  category: "admin",
                  action: "admin.created",
                  summary: `Registered new administrator ${data.name} ${data.surname} (${data.username})`,
                  details: { adminId: rec.id, username: data.username, idNumber: data.idNumber },
                });
              }
              setOpenForm(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminForm({
  initial,
  existing,
  onClose,
  onSave,
}: {
  initial: AdminRecord | null;
  existing: AdminRecord[];
  onClose: () => void;
  onSave: (data: AdminInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [surname, setSurname] = useState(initial?.surname ?? "");
  const [idNumber, setIdNumber] = useState(initial?.idNumber ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [fingerprintId, setFingerprintId] = useState(initial?.fingerprintId ?? "");
  const [scanning, setScanning] = useState(false);
  const [captured, setCaptured] = useState(!!initial?.fingerprintId);

  const usernameTrim = username.trim().toLowerCase();
  const usernameTaken = usernameTrim.length > 0 && existing.some(
    (a) => a.username.toLowerCase() === usernameTrim && a.id !== initial?.id,
  );
  const valid =
    name.trim() &&
    surname.trim() &&
    idNumber.trim() &&
    usernameTrim.length >= 3 &&
    !usernameTaken &&
    password.length >= 4 &&
    fingerprintId.trim();

  const startCapture = () => {
    setScanning(true);
    window.setTimeout(() => {
      setFingerprintId(formatFingerprint());
      setCaptured(true);
      setScanning(false);
    }, 1600);
  };

  // Lock body scroll while the modal is open so the page doesn't shift when
  // the scrollbar appears/disappears. Also prevents the layout glitch that
  // occurs when this dialog renders inside an ancestor with a `filter` CSS
  // property (filters/transforms create a new containing block for `fixed`).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, filter: "blur(2px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        exit={{ scale: 0.96, opacity: 0, filter: "blur(2px)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl my-8 text-card-foreground"
      >
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-foreground">
            {initial ? "Edit administrator" : "Register administrator"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 28))}
              placeholder="Akmal"
              maxLength={28}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
            />
          </Field>
          <Field label="Surname">
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value.slice(0, 28))}
              placeholder="Karimov"
              maxLength={28}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
            />
          </Field>

          <Field label="ID number">
            <div className="relative">
              <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.slice(0, 28))}
                placeholder="AA1234567"
                maxLength={28}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
              />
            </div>
          </Field>
          <Field label="Login username">
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, "").slice(0, 28))}
                placeholder="akmal.k"
                maxLength={28}
                className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-4 ${
                  usernameTaken
                    ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                    : "border-slate-200 focus:border-[hsl(265_85%_55%)] focus:ring-[hsl(265_85%_55%)]/15"
                }`}
              />
            </div>
            {usernameTaken && <p className="mt-1 text-[11px] font-semibold text-red-600">This username is already taken.</p>}
          </Field>

          <div className="sm:col-span-2">
            <Field label="Password">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, 28))}
                    placeholder="At least 4 characters"
                    maxLength={28}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm outline-none focus:border-[hsl(265_85%_55%)] focus:ring-4 focus:ring-[hsl(265_85%_55%)]/15"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-[hsl(265_85%_55%)] hover:bg-slate-100"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setPassword(genPassword()); setShowPassword(true); }}
                  className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  title="Generate strong password"
                >
                  Generate
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                The admin uses this username and password to sign into the shared admin dashboard.
              </p>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Fingerprint">
              <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
                <button
                  type="button"
                  onClick={startCapture}
                  disabled={scanning}
                  className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 overflow-hidden transition-colors ${
                    captured
                      ? "border-emerald-400 bg-emerald-50"
                      : scanning
                        ? "border-[hsl(265_85%_55%)] bg-[hsl(265_85%_97%)]"
                        : "border-slate-300 bg-white hover:border-[hsl(265_85%_55%)]"
                  }`}
                >
                  {captured && !scanning ? (
                    <Check className="h-7 w-7 text-emerald-600" strokeWidth={3} />
                  ) : scanning ? (
                    <ScanLine className="h-7 w-7 text-[hsl(265_85%_55%)] animate-pulse" />
                  ) : (
                    <Fingerprint className="h-7 w-7 text-slate-400" />
                  )}
                  {scanning && (
                    <motion.div
                      initial={{ y: -22 }}
                      animate={{ y: 22 }}
                      transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                      className="pointer-events-none absolute left-1 right-1 h-1 rounded-full bg-gradient-to-r from-transparent via-[hsl(265_85%_55%)] to-transparent shadow-[0_0_12px_hsl(265_85%_55%)]"
                    />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  {captured ? (
                    <>
                      <div className="text-xs font-bold text-emerald-700">Captured</div>
                      <div className="font-mono text-xs font-bold tracking-wider text-slate-700 truncate">{fingerprintId}</div>
                      <button type="button" onClick={startCapture} className="mt-1 text-[11px] font-semibold text-[hsl(265_85%_55%)] hover:underline">
                        Re-scan
                      </button>
                    </>
                  ) : scanning ? (
                    <div className="text-xs font-bold text-[hsl(265_85%_45%)]">Scanning…</div>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-slate-700">Tap to capture fingerprint</div>
                      <div className="text-[11px] text-slate-500">Sensor permission will be requested.</div>
                    </>
                  )}
                </div>
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() =>
              onSave({
                name: name.trim(),
                surname: surname.trim(),
                idNumber: idNumber.trim(),
                username: usernameTrim,
                password,
                fingerprintId: fingerprintId.trim(),
              })
            }
            className="rounded-xl bg-gradient-to-r from-[hsl(265_85%_60%)] to-[hsl(280_85%_55%)] px-4 py-2 text-sm font-bold text-white shadow-md shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initial ? "Save changes" : "Register"}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-600">{label.toUpperCase()}</label>
      {children}
    </div>
  );
}
