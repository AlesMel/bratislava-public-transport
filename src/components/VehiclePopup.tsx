// ──────────────────────────────────────────────────────────
// VehiclePopup — cozy popup card shown when a marker is clicked
// ──────────────────────────────────────────────────────────

import type { Vehicle } from '../types';

const TYPE_EMOJI: Record<string, string> = {
  TRAM: '🚊',
  BUS: '🚌',
  TROLLEY: '🚎',
  UNKNOWN: '🚐',
};

interface Props {
  vehicle: Vehicle;
}

export default function VehiclePopup({ vehicle }: Props) {
  const emoji = TYPE_EMOJI[vehicle.vehicleType] ?? '🚐';

  return (
    <div className="min-w-[200px] p-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="text-lg font-bold leading-tight">
            Line {vehicle.line}
          </div>
          <div className="text-xs text-slate-500 capitalize">
            {vehicle.vehicleType.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Destination */}
      {vehicle.destinationStop && (
        <div className="text-sm mb-1">
          <span className="text-slate-400">→ </span>
          <span className="text-slate-700">{vehicle.destinationStop}</span>
        </div>
      )}

      {/* Delay */}
      {vehicle.delayMinutes > 0 && (
        <div className="text-sm mb-1">
          <span className="text-slate-400">Delay: </span>
          <span className={vehicle.delayMinutes > 10 ? 'text-red-500' : 'text-amber-500'}>
            {vehicle.delayMinutes} min
          </span>
        </div>
      )}

      {/* Info chips */}
      <div className="flex flex-wrap gap-1 mt-2 mb-2">
        {vehicle.lowFloor && (
          <span className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5">♿ Low floor</span>
        )}
        {vehicle.isOnStop && (
          <span className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5">📍 At stop</span>
        )}
      </div>

      {/* Coordinates */}
      <div className="text-[10px] text-slate-400 mt-1">
        {vehicle.latitude.toFixed(5)}, {vehicle.longitude.toFixed(5)}
      </div>

      {/* Operator */}
      {vehicle.operatorName && (
        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
          {vehicle.operatorName}
        </div>
      )}
    </div>
  );
}
