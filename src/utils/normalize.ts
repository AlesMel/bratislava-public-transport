// ──────────────────────────────────────────────────────────
// Data normalisation helpers
// ──────────────────────────────────────────────────────────
// Converts raw API vehicle objects into our internal Vehicle type.
// Handles missing / alternate field names defensively.

import type { RawVehicle, Vehicle, VehicleType } from '../types';

/**
 * Determine a canonical vehicle type from the various API fields.
 * Falls back through ezVehicleType → ezLineType → "UNKNOWN".
 */
function resolveVehicleType(raw: RawVehicle): VehicleType | 'UNKNOWN' {
  const vt = raw.timeTableTrip?.timeTableLine?.ezVehicleType?.toUpperCase();
  if (vt === 'TRAM' || vt === 'BUS' || vt === 'TROLLEY') return vt;

  const lt = raw.timeTableTrip?.timeTableLine?.ezLineType?.toLowerCase();
  if (lt === 'tram') return 'TRAM';
  if (lt === 'bus') return 'BUS';
  if (lt === 'trolley') return 'TROLLEY';

  return 'UNKNOWN';
}

/**
 * Build a unique key for a vehicle position entry.
 * The API can return the same vehicleID at multiple positions (breadcrumb trail),
 * so we combine vehicleID + lastStopOrder to deduplicate.
 */
function makeId(raw: RawVehicle): string {
  return `${raw.vehicleID}-${raw.lastStopOrder}`;
}

/**
 * Normalise a single raw vehicle into our internal format.
 */
export function normalizeVehicle(raw: RawVehicle, existingMap?: Map<string, Vehicle>): Vehicle {
  const id = makeId(raw);
  const existing = existingMap?.get(id);
  const vType = resolveVehicleType(raw);

  return {
    id,
    vehicleID: raw.vehicleID,
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    // Keep previous position for smooth animation
    prevLatitude: existing?.latitude,
    prevLongitude: existing?.longitude,
    line: raw.timeTableTrip?.timeTableLine?.line ?? '?',
    lineName: raw.timeTableTrip?.timeTableLine?.lineName ?? '',
    vehicleType: vType,
    vehicleTypeClass: vType.toLowerCase(),
    destination: raw.timeTableTrip?.destination ?? '',
    destinationStop: raw.timeTableTrip?.destinationStopName ?? '',
    delayMinutes: raw.delayMinutes ?? 0,
    lowFloor: raw.timeTableTrip?.lowFloor ?? false,
    tooltip: raw.tooltip ?? null,
    tripDirection: raw.timeTableTrip?.ezTripDirection ?? '',
    operatorName: raw.timeTableTrip?.operatorName ?? '',
    lastCommunication: raw.lastCommunication ?? '',
    lastStopOrder: raw.lastStopOrder ?? 0,
    isOnStop: raw.isOnStop ?? false,
    lastSeen: Date.now(),
    tripID: raw.timeTableTrip?.tripID ?? 0,
  };
}

/**
 * Normalise an entire API response array.
 * Merges with an existing vehicle map to preserve previous positions.
 */
export function normalizeVehicles(
  rawList: RawVehicle[],
  existingMap?: Map<string, Vehicle>,
): Map<string, Vehicle> {
  const map = new Map<string, Vehicle>();
  for (const raw of rawList) {
    const v = normalizeVehicle(raw, existingMap);
    map.set(v.id, v);
  }
  return map;
}
