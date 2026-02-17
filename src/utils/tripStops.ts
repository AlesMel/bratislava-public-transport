import type { TripStop } from '../types';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStop(row: Record<string, unknown>): TripStop | null {
  const latitude = toNumber(row.latitude ?? row.lat);
  const longitude = toNumber(row.longitude ?? row.lng);
  if (latitude === null || longitude === null) return null;

  return {
    stopOrder: toNumber(row.stopOrder) ?? 0,
    stopID: toNumber(row.stopID ?? row.id) ?? 0,
    stopName: String(row.stopName ?? row.name ?? 'Unknown stop'),
    stopCity: String(row.stopCity ?? row.cityName ?? ''),
    platformNumber: toNumber(row.platformNumber ?? row.platform) ?? 0,
    platformName: String(row.platformName ?? row.platform ?? ''),
    plannedDepartureMinutes: toNumber(row.plannedDepartureMinutes) ?? 0,
    plannedDepartureTimestamp: String(row.plannedDepartureTimestamp ?? ''),
    latitude,
    longitude,
    zones: String(row.zones ?? ''),
    crossing: Boolean(row.crossing),
  };
}

export function parseTripStops(data: unknown): TripStop[] {
  let rawStops: unknown[] = [];

  if (Array.isArray(data)) {
    rawStops = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.tripStops)) rawStops = obj.tripStops;
    else if (Array.isArray(obj.stops)) rawStops = obj.stops;
    else if (Array.isArray(obj.data)) rawStops = obj.data;
    else if (Array.isArray(obj.result)) rawStops = obj.result;
  }

  return rawStops
    .map((row) => toStop(row as Record<string, unknown>))
    .filter((stop): stop is TripStop => stop !== null)
    .sort((a, b) => a.stopOrder - b.stopOrder);
}
