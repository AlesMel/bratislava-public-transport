import type { TripStop } from '../types';

interface Props {
  activeTripLine: string | null;
  tripStops: TripStop[];
  onClearTrip: () => void;
}

export default function RouteSummaryCard({
  activeTripLine,
  tripStops,
  onClearTrip,
}: Props) {
  if (tripStops.length === 0) return null;

  const firstStop = tripStops[0];
  const lastStop = tripStops[tripStops.length - 1];

  return (
    <div className="bg-white shadow rounded-xl border border-gray-200 px-3 py-2">
      <div className="text-xs text-gray-700 mb-1">
        <span className="font-semibold">
          {activeTripLine ? `Line ${activeTripLine}` : 'Selected line'}
        </span>
        <span className="text-gray-500"> · {tripStops.length} stops</span>
      </div>
      {tripStops.length > 1 && (
        <div className="text-[11px] text-gray-600 mb-2 max-w-[240px] leading-snug">
          <span className="font-medium">{firstStop.stopName}</span>
          <span className="mx-1 text-gray-400">→</span>
          <span className="font-medium">{lastStop.stopName}</span>
        </div>
      )}
      <button
        onClick={onClearTrip}
        className="bg-white rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700
                   hover:bg-gray-50 border border-gray-200"
      >
        ✕ Clear route
      </button>
    </div>
  );
}
