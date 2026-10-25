/** Public, busy, camera-covered places near a point, from OpenStreetMap. Shared by the deal page and the MCP server. */
export type Spot = { name: string; kind: string; lat: number; lon: number; m: number };

export const SPOT_KIND: Record<string, string> = { police: "Police station", mall: "Shopping centre", station: "Station", library: "Library", townhall: "Town hall" };

const dist = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  return Math.round(Math.hypot(x, (c - a) * r) * 6371e3);
};

export async function spotsNear(lat: number, lon: number): Promise<Spot[]> {
  const q = `[out:json][timeout:8];(nwr(around:2000,${lat},${lon})[amenity=police];nwr(around:2000,${lat},${lon})[shop=mall];nwr(around:2000,${lat},${lon})[railway=station];nwr(around:2000,${lat},${lon})[amenity=library];nwr(around:2000,${lat},${lon})[amenity=townhall];);out center 40;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }) });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  const j = await r.json();
  return (j.elements ?? [])
    .map((e: { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }) => {
      const t = e.tags ?? {};
      const kind = t.amenity === "police" ? "police" : t.shop === "mall" ? "mall" : t.railway === "station" ? "station" : t.amenity ?? "";
      const la = e.lat ?? e.center?.lat ?? lat;
      const lo = e.lon ?? e.center?.lon ?? lon;
      return { name: t.name ?? SPOT_KIND[kind] ?? "Public place", kind, lat: la, lon: lo, m: dist(lat, lon, la, lo) };
    })
    // police first: the safest handover there is
    .sort((a: Spot, b: Spot) => (a.kind === "police" ? -1 : 0) - (b.kind === "police" ? -1 : 0) || a.m - b.m)
    .filter((s: Spot, i: number, all: Spot[]) => all.findIndex((x) => x.name === s.name) === i)
    .slice(0, 5);
}
