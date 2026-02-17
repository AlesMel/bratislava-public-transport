// ──────────────────────────────────────────────────────────
// StatusIndicator — shows Live / Drifting / Offline
// ──────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { getConnectionStatus, STATUS_LABELS } from '../utils/time';

interface Props {
  lastFetch: number | null;
  vehicleCount: number;
}

export default function StatusIndicator({ lastFetch, vehicleCount }: Props) {
  const [, setTick] = useState(0);

  // Re-render every 2s so status transitions in real time
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const status = getConnectionStatus(lastFetch);
  const info = STATUS_LABELS[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-block h-2 w-2 rounded-full ${info.dot} animate-pulse`} />
      <span className={`font-medium ${info.color}`}>{info.label}</span>
      <span className="text-slate-500 text-xs">
        · {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
