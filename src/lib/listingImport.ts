/** External listing information is a suggestion, never payment authorization. */
export function listingSource(value: string | null): { url: string; host: string } | null {
  if (!value || value.length > 2048) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    if (!host.includes(".") || /^(localhost|127\.|0\.|10\.|192\.168\.|\[)/.test(host)) return null;
    u.hash = "";
    return { url: u.href, host: host.replace(/^www\./, "") };
  } catch { return null; }
}
