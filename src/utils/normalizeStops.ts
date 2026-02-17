// ──────────────────────────────────────────────────────────
// Stop data normalisation helpers
// ──────────────────────────────────────────────────────────
// The nearby-stops API returns latitude/longitude as null at
// the stop level – actual coordinates live on each platform.
// We flatten platforms into individual Stop records.

import type { RawStop, Stop } from '../types';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}

/**
 * Normalise a single raw stop. If the stop itself has valid lat/lng we use
 * that. Otherwise we expand each platform that carries coordinates into
 * its own Stop entry. Only urban / bus transport stops are kept (bikesharing
 * and POI entries are filtered out).
 */
export function normalizeStop(raw: RawStop, _idx: number): Stop[] {
  // Skip non-transport entries (bikesharing, POI, etc.)
  if (!raw.forUrbanPublicTransport && !raw.forBusTransport) return [];

  const stopID = toNumber(raw.stopID);
  const baseName = toStringValue(raw.stopName ?? raw.name) ?? `Stop ${stopID ?? _idx}`;
  const cityName = toStringValue(raw.stopCity ?? raw.cityName);

  // Try stop-level coordinates first
  const lat = toNumber(raw.latitude ?? raw.lat);
  const lng = toNumber(raw.longitude ?? raw.lng);

  if (lat !== null && lng !== null) {
    return [{
      id: `stop-${stopID ?? _idx}`,
      stopID: stopID ?? undefined,
      name: baseName,
      latitude: lat,
      longitude: lng,
      cityName,
    }];
  }

  // Fall back to platforms
  const platforms = raw.platforms;
  if (!Array.isArray(platforms) || platforms.length === 0) return [];

  const results: Stop[] = [];
  for (const p of platforms) {
    const pLat = toNumber(p.latitude);
    const pLng = toNumber(p.longitude);
    if (pLat === null || pLng === null) continue;

    results.push({
      id: `stop-${stopID ?? _idx}-p${p.platformNumber}`,
      stopID: stopID ?? undefined,
      name: baseName,
      latitude: pLat,
      longitude: pLng,
      cityName,
      platform: toStringValue(p.platformName) || String(p.platformNumber),
    });
  }

  return results;
}

export function normalizeStops(rawList: RawStop[]): Stop[] {
  const out: Stop[] = [];
  const seen = new Set<string>();

  rawList.forEach((raw, idx) => {
    const stops = normalizeStop(raw, idx);
    for (const s of stops) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
  });

  return out;
}
