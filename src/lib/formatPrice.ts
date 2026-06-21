/**
 * Format a numeric price (UZS sums) with thousand separators so the last
 * three digits visually group apart from the rest, e.g. 1 250 000.
 * Uses a non-breaking thin space so the number never wraps mid-amount.
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  // ru-RU uses a regular space as the group separator — visually identical to
  // the convention shown in the reference (e.g. "120 000").
  return Math.trunc(n).toLocaleString('ru-RU');
}

/**
 * Format a raw digit string for display in an input with spaces every 3 digits.
 * Strips all non-digits, then formats with ru-RU locale.
 */
export function formatInputNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('ru-RU');
}

/**
 * Remove spaces from a formatted number string to get raw digits.
 */
export function parseInputNumber(value: string): string {
  return value.replace(/\s/g, '');
}
