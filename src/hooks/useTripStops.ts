// ──────────────────────────────────────────────────────────
// useTripStops — fetch the stops for a specific vehicle trip
// ──────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import type { TripStop } from '../types';
import { parseTripStops } from '../utils/tripStops';

interface TripStopsResult {
  tripStops: TripStop[];
  loading: boolean;
  error: string | null;
  fetchTripStops: (tripID: number) => Promise<void>;
  clearTripStops: () => void;
  activeTripID: number | null;
}

export function useTripStops(): TripStopsResult {
  const [tripStops, setTripStops] = useState<TripStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTripID, setActiveTripID] = useState<number | null>(null);

  const fetchTripStops = useCallback(async (tripID: number) => {
    if (!tripID) return;

    // If already showing this trip, toggle it off
    if (tripID === activeTripID) {
      setTripStops([]);
      setActiveTripID(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveTripID(tripID);

    try {
      const res = await fetch(`/api/navigation/vehicles/trip_stops?tripID=${tripID}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as unknown;
      const normalized = parseTripStops(data);

      setTripStops(normalized);
      if (normalized.length === 0) {
        setError('No route data available for this trip.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setTripStops([]);
    } finally {
      setLoading(false);
    }
  }, [activeTripID]);

  const clearTripStops = useCallback(() => {
    setTripStops([]);
    setActiveTripID(null);
    setError(null);
  }, []);

  return { tripStops, loading, error, fetchTripStops, clearTripStops, activeTripID };
}
