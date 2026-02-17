// ──────────────────────────────────────────────────────────
// useStops — fetch nearby stops for current map center/radius
// ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, RawStop, Stop } from '../types';
import { normalizeStops } from '../utils/normalizeStops';

function buildStopsUrl(s: AppSettings): string {
  const base = s.useProxy
    ? 'https://mapa.idsbk.sk/navigation/stops/nearby'
    : '/api/navigation/stops/nearby';
  return `${base}?lat=${s.lat}&lng=${s.lng}&radius=${s.radius}&cityID=-1`;
}

export function useStops(settings: AppSettings) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildStopsUrl(settings));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as unknown;
      let rawList: RawStop[] = [];

      if (Array.isArray(data)) {
        rawList = data as RawStop[];
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.stops)) rawList = obj.stops as RawStop[];
        else if (Array.isArray(obj.data)) rawList = obj.data as RawStop[];
        else if (Array.isArray(obj.result)) rawList = obj.result as RawStop[];
      }

      setStops(normalizeStops(rawList));
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setStops([]);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  return { stops, stopsError: error, stopsLoading: loading, reloadStops: fetchStops };
}
