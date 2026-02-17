// ──────────────────────────────────────────────────────────
// useVehicles — fetch + poll vehicles with exponential backoff
// ──────────────────────────────────────────────────────────
//
// Polling logic:
//   1. On mount (and whenever settings change), start an interval
//      at the configured pollInterval (default 5s).
//   2. On a successful fetch, reset the backoff multiplier to 1.
//   3. On an error, multiply the interval by 2 (capped at 60s)
//      using exponential backoff so we don't hammer a broken endpoint.
//   4. When settings change we clear and restart the interval.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSettings, Vehicle, ApiResponse, RawVehicle } from '../types';
import { normalizeVehicles } from '../utils/normalize';

/** Build the fetch URL from current settings.
 *  In dev mode we always go through Vite's proxy (/api/…) to avoid CORS.
 *  The proxy is configured in vite.config.ts.
 *  In a production build, toggle useProxy off and point to the real URL
 *  (or set up your own server-side proxy).
 */
function buildUrl(s: AppSettings): string {
  const base = s.useProxy
    ? 'https://mapa.idsbk.sk/navigation/vehicles/nearby'
    : '/api/navigation/vehicles/nearby';
  return `${base}?lat=${s.lat}&lng=${s.lng}&radius=${s.radius}&cityID=-1`;
}

export function useVehicles(settings: AppSettings) {
  const [vehicles, setVehicles] = useState<Map<string, Vehicle>>(new Map());
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  // Refs to keep mutable state across closures without re-renders
  const backoffRef = useRef(1);
  const vehiclesRef = useRef<Map<string, Vehicle>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVehicles = useCallback(async (opts?: { manual?: boolean }) => {
    if (opts?.manual) setReloading(true);
    try {
      const res = await fetch(buildUrl(settings));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: ApiResponse = await res.json();

      // Defensive: handle unexpected shapes
      let rawList: RawVehicle[] = [];
      if (Array.isArray(data?.vehicles)) {
        rawList = data.vehicles;
      } else if (Array.isArray(data)) {
        // Fallback: maybe the endpoint returns a bare array
        rawList = data as unknown as RawVehicle[];
      }

      const newMap = normalizeVehicles(rawList, vehiclesRef.current);
      vehiclesRef.current = newMap;
      setVehicles(newMap);
      setLastFetch(Date.now());
      setError(null);
      setLoading(false);

      // Reset backoff on success
      backoffRef.current = 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setLoading(false);

      // Exponential backoff: double the multiplier, cap at 12× (≈60s at 5s base)
      backoffRef.current = Math.min(backoffRef.current * 2, 12);
    } finally {
      if (opts?.manual) setReloading(false);
    }
  }, [settings]);

  const reloadNow = useCallback(async () => {
    await fetchVehicles({ manual: true });
  }, [fetchVehicles]);

  useEffect(() => {
    // Fetch immediately on mount / settings change
    fetchVehicles();

    const schedule = () => {
      const interval = settings.pollInterval * 1000 * backoffRef.current;
      timerRef.current = setTimeout(async () => {
        await fetchVehicles();
        schedule(); // re-schedule with potentially updated backoff
      }, interval);
    };

    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchVehicles, settings.pollInterval]);

  return { vehicles, lastFetch, error, loading, reloadNow, reloading };
}
