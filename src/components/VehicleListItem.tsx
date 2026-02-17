// ──────────────────────────────────────────────────────────
// VehicleListItem — one row in the side panel vehicle list
// ──────────────────────────────────────────────────────────

import type { Vehicle } from '../types';
import { relativeTime } from '../utils/time';

const TYPE_EMOJI: Record<string, string> = {
  TRAM: '🚊',
  BUS: '🚌',
  TROLLEY: '🚎',
  UNKNOWN: '🚐',
};

interface Props {
  vehicle: Vehicle;
  onClick: (v: Vehicle) => void;
  onLineClick: (v: Vehicle) => void;
  selected?: boolean;
}

export default function VehicleListItem({ vehicle, onClick, onLineClick, selected = false }: Props) {
  const emoji = TYPE_EMOJI[vehicle.vehicleType] ?? '🚐';

  return (
    <div
      onClick={() => onClick(vehicle)}
      className={`w-full text-left glass rounded-xl px-3 py-2.5 flex items-center gap-3
                 hover:bg-slate-100 transition-colors duration-300 cursor-pointer
                 animate-fade-in group border
                 ${selected ? 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/70' : 'border-transparent'}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(vehicle);
        }
      }}
    >
      {/* Type icon + line number */}
      <div className="flex-shrink-0 text-center">
        <span className="text-lg">{emoji}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLineClick(vehicle);
          }}
          className="text-xs font-bold text-blue-600 mt-0.5 px-1.5 py-0.5 rounded
                     hover:bg-blue-50 transition-colors duration-200"
          title="Show full route for this line"
        >
          {vehicle.line}
        </button>
      </div>

      {/* Middle: destination + direction */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-slate-800">
          {vehicle.destinationStop || vehicle.destination || 'Unknown'}
        </div>
        {vehicle.tripDirection && (
          <div className="text-[11px] text-slate-500 capitalize">
            {vehicle.tripDirection === 'here' ? '← inbound' : '→ outbound'}
          </div>
        )}
      </div>

      {/* Right: delay + last seen */}
      <div className="flex-shrink-0 text-right">
        {vehicle.delayMinutes > 0 && (
          <div className={`text-xs font-medium ${vehicle.delayMinutes > 10 ? 'text-red-500' : 'text-amber-500'}`}>
            +{vehicle.delayMinutes}m
          </div>
        )}
        <div className="text-[10px] text-slate-400">
          {relativeTime(vehicle.lastSeen)}
        </div>
      </div>
    </div>
  );
}
