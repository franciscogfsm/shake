"use client";
// The one-time handshake code that only exists on the seller's live screen.
// On-chain we commit sha256(code bytes); the QR carries the code itself.

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no 0/O/1/I/L/U look-alikes

export function newCode() {
  const b = new Uint8Array(10);
  crypto.getRandomValues(b);
  return [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
}

export const prettyCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
export const normalizeCode = (input: string) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const codeToHex = (code: string) => [...new TextEncoder().encode(code)].map((x) => x.toString(16).padStart(2, "0")).join("");

export const qrPayload = (origin: string, dealId: string, code: string) => `${origin}/scan/${dealId}#${code}`;

/** Accepts a scanned QR (our URL), or a typed code. Returns the code and the deal it belongs to, if known. */
export function parseScan(text: string): { code: string; dealId: string | null } | null {
  const m = /\/scan\/(\d+)#([A-Za-z0-9-]+)/.exec(text);
  if (m) return { dealId: m[1], code: normalizeCode(m[2]) };
  if (/^[0-9a-f]{64}$/i.test(text.trim())) return { dealId: null, code: text.trim() }; // pitch team secret
  const c = normalizeCode(text);
  return c.length === 10 ? { code: c, dealId: null } : null;
}

/** Secrets are stored per deal on the seller's phone so a refresh keeps the same QR. */
export const sellerCode = {
  get: (dealId: string) => {
    try {
      return localStorage.getItem(`shake.code.${dealId}`);
    } catch {
      return null;
    }
  },
  set: (dealId: string, code: string) => {
    try {
      localStorage.setItem(`shake.code.${dealId}`, code);
    } catch {}
  },
};

/** What the buyer typed when they created the deal (not on-chain). */
export const dealMeta = {
  get: (dealId: string): { item?: string; seller?: string; kind?: string; listingUrl?: string } => {
    try {
      return JSON.parse(localStorage.getItem(`shake.meta.${dealId}`) ?? "{}");
    } catch {
      return {};
    }
  },
  set: (dealId: string, meta: { item?: string; seller?: string; kind?: string; listingUrl?: string }) => {
    try {
      localStorage.setItem(`shake.meta.${dealId}`, JSON.stringify(meta));
    } catch {}
  },
};
