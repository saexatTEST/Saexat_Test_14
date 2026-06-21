// Lightweight format checkers for the contact fields shown across the
// booking dialog, edit modal and anketa. Each helper accepts empty input
// (optional fields) and only enforces the format when the user typed
// something. Keeping these rules in one place guarantees the same
// validation behaviour everywhere a guest's contact data is captured.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Allow the canonical "+998 90 123 45 67" style: a leading +, then digits
// and spaces/dashes/parentheses. We require at least 9 digits total.
export const PHONE_RE = /^\+?[\d][\d\s()\-]{7,24}$/;
const PHONE_DIGITS_MIN = 9;
// Telegram/Instagram handles. We accept either "@name" or a plain
// "name" — both display fine to the user — but reject anything with
// spaces or symbols other than `._`.
export const HANDLE_RE = /^@?[a-zA-Z0-9_.]{3,32}$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return EMAIL_RE.test(v) && v.length <= 80;
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (!PHONE_RE.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= PHONE_DIGITS_MIN && digits.length <= 15;
}

export function isValidHandle(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return HANDLE_RE.test(v);
}

export type ContactValidationError = {
  field: 'email' | 'phone' | 'whatsapp' | 'telegram' | 'instagram';
  message: string;
};

export function validateContactBundle(c: {
  phone?: string;
  whatsapp?: string;
  email?: string;
  telegram?: string;
  instagram?: string;
}): ContactValidationError | null {
  if (c.phone !== undefined && !isValidPhone(c.phone)) {
    return { field: 'phone', message: 'Телефон должен быть в формате +998 90 123 45 67' };
  }
  if (c.whatsapp !== undefined && !isValidPhone(c.whatsapp)) {
    return { field: 'whatsapp', message: 'WhatsApp должен быть в формате +998 90 123 45 67' };
  }
  if (c.email !== undefined && !isValidEmail(c.email)) {
    return { field: 'email', message: 'Эл. почта должна содержать «@» — например email@example.com' };
  }
  if (c.telegram !== undefined && !isValidHandle(c.telegram)) {
    return { field: 'telegram', message: 'Telegram должен быть в формате @username' };
  }
  if (c.instagram !== undefined && !isValidHandle(c.instagram)) {
    return { field: 'instagram', message: 'Instagram должен быть в формате @username' };
  }
  return null;
}
