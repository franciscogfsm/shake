"use client";
import { useState } from "react";
import { Button } from "./Button";

type Spot = { name: string; kind: string; lat: number; lon: number; m: number };

const KIND: Record<string, string> = { police: "Police station", mall: "Shopping centre", station: "Station", library: "Library", townhall: "Town hall" };

const dist = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r);
  return Math.round(Math.hypot(x, (c - a) * r) * 6371e3);
};

/** Public, busy, camera-covered places near you, from OpenStreetMap. Your location never leaves the phone except to ask OSM. */
export function SafeSpots() {
  const [state, setState] = useState<"idle" | "finding" | "done" | "denied" | "failed">("idle");
  const [spots, setSpots] = useState<Spot[]>([]);

  const find = () => {
    setState("finding");
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        const q = `[out:json][timeout:8];(nwr(around:2000,${lat},${lon})[amenity=police];nwr(around:2000,${lat},${lon})[shop=mall];nwr(around:2000,${lat},${lon})[railway=station];nwr(around:2000,${lat},${lon})[amenity=library];nwr(around:2000,${lat},${lon})[amenity=townhall];);out center 40;`;
        try {
          const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: new URLSearchParams({ data: q }) });
          const j = await r.json();
          const list: Spot[] = (j.elements ?? [])
            .map((e: { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }) => {
              const t = e.tags ?? {};
              const kind = t.amenity === "police" ? "police" : t.shop === "mall" ? "mall" : t.railway === "station" ? "station" : t.amenity ?? "";
              const la = e.lat ?? e.center?.lat ?? lat;
              const lo = e.lon ?? e.center?.lon ?? lon;
              return { name: t.name ?? KIND[kind] ?? "Public place", kind, lat: la, lon: lo, m: dist(lat, lon, la, lo) };
            })
            // police first: the safest handover there is
            .sort((a: Spot, b: Spot) => (a.kind === "police" ? -1 : 0) - (b.kind === "police" ? -1 : 0) || a.m - b.m)
            .filter((s: Spot, i: number, all: Spot[]) => all.findIndex((x) => x.name === s.name) === i)
            .slice(0, 5);
          setSpots(list);
          setState("done");
        } catch {
          setState("failed");
        }
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  if (state === "idle" || state === "finding")
    return (
      <Button variant="glass" full loading={state === "finding"} onClick={find}>
        Find a safe place to meet
      </Button>
    );
  return (
    <div className="glass p-4 text-left" aria-live="polite">
      <div className="eyebrow">Safe places nearby</div>
      {state === "denied" && <p className="mt-2 text-[14px] text-ink-2">Location is off. Meet somewhere busy and public: a police station lobby, a shopping centre, a station.</p>}
      {state === "failed" && <p className="mt-2 text-[14px] text-ink-2">Couldn&apos;t load the map right now. Pick somewhere busy, public and with cameras.</p>}
      {state === "done" && !spots.length && <p className="mt-2 text-[14px] text-ink-2">Nothing within 2 km. Pick somewhere busy, public and with cameras.</p>}
      <ul className="mt-2 divide-y divide-white/10">
        {spots.map((s) => (
          <li key={s.name + s.lat}>
            <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 py-2.5 hover:text-safe">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.name}</span>
                <span className="block text-[13px] text-mute">{KIND[s.kind] ?? "Public place"} · {s.m < 1000 ? `${s.m} m` : `${(s.m / 1000).toFixed(1)} km`}</span>
              </span>
              <span aria-hidden className="text-mute">↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
