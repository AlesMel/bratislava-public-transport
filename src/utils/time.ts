// ──────────────────────────────────────────────────────────
// Time formatting helpers
// ──────────────────────────────────────────────────────────

/**
 * Returns a cozy relative time string like "12s ago", "3m ago".
 */
export function relativeTime(timestampMs: number): string {
  const diff = Math.max(0, Date.now() - timestampMs);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Determine connection status from time since last successful fetch.
 * Returns 'live' | 'drifting' | 'offline' with associated color labels.
 */
export type ConnectionStatus = 'live' | 'drifting' | 'offline';

export function getConnectionStatus(lastFetchMs: number | null): ConnectionStatus {
  if (lastFetchMs === null) return 'offline';
  const age = Date.now() - lastFetchMs;
  if (age < 10_000) return 'live';
  if (age < 30_000) return 'drifting';
  return 'offline';
}

export const STATUS_LABELS: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  live: { label: 'Live', color: 'text-green-400', dot: 'bg-green-400' },
  drifting: { label: 'Drifting', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  offline: { label: 'Offline', color: 'text-red-400', dot: 'bg-red-400' },
};
