import type { AuditEvent } from "@/contexts/AuditContext";

/**
 * Humanize an audit event into one or more English sentences describing
 * exactly what the actor did. This replaces the previous raw-JSON
 * presentation in the activity log.
 *
 * Returns a list of plain strings. The caller decides how to render them
 * (usually as a bullet/line list).
 */
export function humanizeAudit(event: AuditEvent): string[] {
  const d = (event.details ?? {}) as Record<string, unknown>;
  const lines: string[] = [];
  const who = event.actor.username;

  switch (event.action) {
    /* ---------------- AUTH ---------------- */
    case "auth.login":
      lines.push(`${who} signed in to the system.`);
      break;
    case "auth.logout":
      lines.push(`${who} signed out of the system.`);
      break;
    case "auth.role_switch":
      lines.push(event.summary);
      break;

    /* ---------------- BOOKINGS ---------------- */
    case "booking.created": {
      const room = d.room ?? "?";
      const guest = (d.guestName as string) || "an unnamed guest";
      const checkIn = d.checkIn as string | undefined;
      const checkOut = d.checkOut as string | undefined;
      const status = d.status as string | undefined;
      const bed = d.bedIndex as number | undefined;
      lines.push(
        `Created a new booking in room ${room}${
          typeof bed === "number" ? ` (bed #${bed + 1})` : ""
        } for ${guest}.`,
      );
      if (checkIn && checkOut) {
        lines.push(`Check-in ${formatDate(checkIn)}, check-out ${formatDate(checkOut)}.`);
      }
      if (status) lines.push(`Initial status set to "${status}".`);
      break;
    }
    case "booking.deleted": {
      const room = d.roomNumber ?? d.room ?? "?";
      const guest = (d.guestName as string) || "the guest";
      lines.push(`Deleted the booking for room ${room} (${guest}).`);
      if (d.checkIn && d.checkOut) {
        lines.push(
          `It was scheduled from ${formatDate(d.checkIn as string)} to ${formatDate(
            d.checkOut as string,
          )}.`,
        );
      }
      break;
    }
    case "booking.updated": {
      const before = d.before as Record<string, unknown> | undefined;
      const patch = d.patch as Record<string, unknown> | undefined;
      const room = before?.roomNumber ?? "?";
      lines.push(`Edited the booking in room ${room}.`);
      if (before && patch) {
        for (const k of Object.keys(patch)) {
          const b = before[k];
          const a = patch[k];
          if (b === a) continue;
          lines.push(
            `• Changed ${prettyField(k)} from "${prettyValue(k, b)}" to "${prettyValue(k, a)}".`,
          );
        }
      }
      break;
    }

    /* ---------------- ADMINS ---------------- */
    case "admin.created":
      lines.push(
        `Registered a new administrator account "${d.username ?? ""}"${
          d.idNumber ? ` (ID ${d.idNumber})` : ""
        }.`,
      );
      break;
    case "admin.deleted":
      lines.push(
        `Removed administrator account "${d.username ?? ""}"${
          d.idNumber ? ` (ID ${d.idNumber})` : ""
        } from the system.`,
      );
      break;
    case "admin.updated": {
      const before = d.before as Record<string, unknown> | undefined;
      const patch = d.patch as Record<string, unknown> | undefined;
      lines.push(`Updated administrator "${patch?.username ?? before?.username ?? ""}".`);
      if (before && patch) {
        for (const k of Object.keys(patch)) {
          if (k === "password") {
            if (before[k] !== patch[k]) lines.push(`• Changed the password.`);
            continue;
          }
          if (before[k] === patch[k]) continue;
          lines.push(
            `• Changed ${prettyField(k)} from "${prettyValue(k, before[k])}" to "${prettyValue(
              k,
              patch[k],
            )}".`,
          );
        }
      }
      break;
    }

    /* ---------------- SHIFT / FORM / SYSTEM ---------------- */
    default:
      lines.push(event.summary);
      break;
  }

  return lines;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

const FIELD_LABELS: Record<string, string> = {
  guestName: "guest name",
  guestPhone: "guest phone",
  guestEmail: "guest email",
  guestCount: "number of guests",
  checkIn: "check-in date",
  checkOut: "check-out date",
  status: "status",
  notes: "notes",
  price: "price",
  roomNumber: "room number",
  bedIndex: "bed",
  guestFirstName: "guest first name",
  guestLastName: "guest last name",
  guestMiddleName: "guest middle name",
  guestWhatsapp: "WhatsApp",
  guestTelegram: "Telegram",
  guestInstagram: "Instagram",
  name: "name",
  surname: "surname",
  username: "username",
  idNumber: "ID number",
  fingerprintId: "fingerprint",
  checkInHalfDay: "early check-in (half day)",
  checkOutHalfDay: "late check-out (half day)",
  paymentAmount: "total payment amount",
  payments: "recorded payments",
  paid: "fully paid",
  paymentMethod: "payment method",
};

function prettyField(k: string): string {
  return FIELD_LABELS[k] ?? k.replace(/([A-Z])/g, " $1").toLowerCase().trim();
}

function formatMoney(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}

function formatPayment(p: unknown): string {
  if (!p || typeof p !== "object") return String(p ?? "—");
  const o = p as Record<string, unknown>;
  const amount = typeof o.amount === "number" ? formatMoney(o.amount) : String(o.amount ?? "?");
  const method = typeof o.method === "string" ? o.method : "—";
  const at = typeof o.at === "string" ? formatDateTime(o.at) : "";
  return `${amount} via ${method}${at ? ` on ${at}` : ""}`;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function prettyValue(k: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (k === "checkIn" || k === "checkOut") return formatDate(String(v));
  if (k === "bedIndex" && typeof v === "number") return `#${v + 1}`;
  if (k === "checkInHalfDay" || k === "checkOutHalfDay" || k === "paid") {
    return v === true || v === "true" ? "yes" : "no";
  }
  if (k === "paymentAmount" && typeof v === "number") return formatMoney(v);
  if (k === "payments") {
    if (Array.isArray(v)) {
      if (v.length === 0) return "no payments";
      return v.map((p, i) => `#${i + 1} — ${formatPayment(p)}`).join("; ");
    }
    return formatPayment(v);
  }
  if (Array.isArray(v)) return v.map((x) => prettyValue(k, x)).join(", ");
  if (typeof v === "object") {
    try {
      return Object.entries(v as Record<string, unknown>)
        .map(([kk, vv]) => `${prettyField(kk)}: ${prettyValue(kk, vv)}`)
        .join(", ");
    } catch {
      return "—";
    }
  }
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}
