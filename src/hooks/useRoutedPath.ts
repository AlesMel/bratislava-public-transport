// ──────────────────────────────────────────────────────────
// useRoutedPath — fetch actual road geometry via OSRM
// ──────────────────────────────────────────────────────────
//
// Takes an array of TripStop waypoints and returns a dense
// array of [lng, lat] coordinates that follow real roads,
// using the free OSRM routing engine (public demo server).
//
// OSRM has a ~100 waypoint limit on the match/route endpoint,
// so for long routes we chunk waypoints with overlap to keep
// continuity, then stitch the results.

import { useState, useEffect, useRef } from 'react';
import type { TripStop } from '../types';

/** Maximum waypoints per OSRM request (public server limit) */
const MAX_WAYPOINTS = 80;

/** Overlap between chunks to ensure continuity */
const CHUNK_OVERLAP = 2;

export type RoutedPath = [number, number][]; // [lng, lat][]

interface UseRoutedPathResult {
  /** Road-following coordinates in [lng, lat] format (GeoJSON order) */
  routedPath: RoutedPath;
  /** Whether we're currently fetching the route */
  loading: boolean;
}

async function fetchOSRMRoute(coords: [number, number][]): Promise<[number, number][]> {
  // coords are in [lng, lat] format
  const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(';');
  const url = `/osrm/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM: ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(`OSRM: ${data.code || 'no route'}`);
  }

  return data.routes[0].geometry.coordinates as [number, number][];
}

/**
 * For routes with many stops, split into overlapping chunks
 * and stitch the results together.
 */
async function fetchChunkedRoute(waypoints: [number, number][]): Promise<[number, number][]> {
  if (waypoints.length <= MAX_WAYPOINTS) {
    return fetchOSRMRoute(waypoints);
  }

  const chunks: [number, number][][] = [];
  let i = 0;
  while (i < waypoints.length) {
    const end = Math.min(i + MAX_WAYPOINTS, waypoints.length);
    chunks.push(waypoints.slice(i, end));
    if (end >= waypoints.length) break;
    i = end - CHUNK_OVERLAP; // overlap so geometry connects
  }

  const results: [number, number][][] = [];
  for (const chunk of chunks) {
    results.push(await fetchOSRMRoute(chunk));
  }

  // Stitch: skip first few points of subsequent chunks (overlap region)
  const stitched: [number, number][] = [...results[0]];
  for (let c = 1; c < results.length; c++) {
    // Find where the overlap ends by skipping points close to the last stitched point
    const lastPt = stitched[stitched.length - 1];
    let startIdx = 0;
    for (let j = 0; j < Math.min(50, results[c].length); j++) {
      const dx = results[c][j][0] - lastPt[0];
      const dy = results[c][j][1] - lastPt[1];
      if (Math.hypot(dx, dy) < 0.0001) {
        startIdx = j + 1;
      }
    }
    stitched.push(...results[c].slice(startIdx));
  }

  return stitched;
}

export function useRoutedPath(tripStops: TripStop[]): UseRoutedPathResult {
  const [routedPath, setRoutedPath] = useState<RoutedPath>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    if (tripStops.length < 2) {
      setRoutedPath([]);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const waypoints: [number, number][] = tripStops.map((ts) => [ts.longitude, ts.latitude]);

    setLoading(true);

    fetchChunkedRoute(waypoints)
      .then((coords) => {
        if (!ctrl.signal.aborted) {
          setRoutedPath(coords);
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.warn('OSRM routing failed, falling back to straight lines:', err);
          // Fallback: straight lines between stops
          setRoutedPath(waypoints);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      });

    return () => ctrl.abort();
  }, [tripStops]);

  return { routedPath, loading };
}
