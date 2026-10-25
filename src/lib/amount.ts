/** Normalize digits without removing signs, letters or ambiguous punctuation. */
export function normalizeDigits(value: string): string {
  return value.normalize("NFKC").replace(/[٠-٩۰-۹०-९০-৯]/g, (digit) => {
    const n = digit.charCodeAt(0);
    const base = n >= 0x09e6 ? 0x09e6 : n >= 0x0966 ? 0x0966 : n >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(n - base);
  });
}

/** Parse the viewer's decimal/grouping conventions, rejecting fractions of a cent.
 * An alternate decimal mark is accepted only when it cannot be a grouping mark.
 */
export function parseAmount(input: string, locale: string): number {
  let value = normalizeDigits(input).trim().replace(/[\u200e\u200f\u061c]/g, "");
  if (!value) return NaN;
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const group = normalizeDigits(parts.find((p) => p.type === "group")?.value ?? ",");
  const hasLocalDecimal = value.includes(decimal);
  // Accept 12.50 on a comma-decimal keyboard, and 12,50 on a dot-decimal one.
  const alternate = decimal === "." ? "," : ".";
  if (!hasLocalDecimal && value.includes(alternate) && /^\d+[.,]\d{1,2}$/.test(value)) {
    value = value.replace(alternate, decimal);
  }
  const pieces = value.split(decimal);
  if (pieces.length > 2 || (pieces[1] !== undefined && !/^\d{1,2}$/.test(pieces[1]))) return NaN;
  const integer = pieces[0];
  if (integer.includes(group)) {
    // Validate grouping with Intl itself (including India's 12,34,567 convention).
    const plain = integer.split(group).join("");
    if (!/^\d+$/.test(plain)) return NaN;
    const grouped = normalizeDigits(new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: "always" }).format(Number(plain)));
    if (integer !== grouped) return NaN;
    pieces[0] = plain;
  }
  if (!/^\d+$/.test(pieces[0])) return NaN;
  const cents = Number(pieces[0]) * 100 + Number((pieces[1] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents / 100 : NaN;
}

export function isCentAmount(amount: number): boolean {
  return Number.isFinite(amount) && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
}
