// ──────────────────────────────────────────────────────────
// RouteInfoPanel — detailed route/trip info with timeline
// ──────────────────────────────────────────────────────────

import type { TripStop } from '../types';

interface Props {
  tripStops: TripStop[];
  activeTripLine: string | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
}

/** Format minutes into HH:MM style departure string */
function formatDeparture(minutes: number): string {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Format a timestamp string into HH:MM */
function formatTimestamp(ts: string): string {
  if (!ts || ts === '0' || ts.startsWith('0001')) return '';
  const n = Number(ts);
  if (!n || n <= 0) return '';
  const d = new Date(n * 1000);
  if (isNaN(d.getTime())) return '';
  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function RouteInfoPanel({
  tripStops,
  activeTripLine,
  loading,
  error,
  onClear,
}: Props) {
  if (!loading && !error && tripStops.length === 0 && !activeTripLine) return null;

  const firstStop = tripStops[0];
  const lastStop = tripStops[tripStops.length - 1];

  return (
    <div className="mx-3 mb-2 rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/90 to-white/90 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {activeTripLine && (
            <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
              {activeTripLine}
            </span>
          )}
          <div className="text-xs text-slate-700 truncate">
            {loading ? (
              <span className="text-blue-600 animate-pulse">Loading route…</span>
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : tripStops.length > 1 ? (
              <>
                <span className="font-medium">{firstStop?.stopName}</span>
                <span className="mx-1 text-slate-400">→</span>
                <span className="font-medium">{lastStop?.stopName}</span>
              </>
            ) : (
              'Route'
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex-shrink-0 text-[11px] px-2 py-1 rounded-lg border border-blue-200
                     text-blue-600 hover:bg-blue-100 transition-colors duration-200"
        >
          ✕
        </button>
      </div>

      {/* Stops count badge */}
      {!loading && !error && tripStops.length > 0 && (
        <div className="px-3 pb-2">
          <span className="text-[10px] text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
            {tripStops.length} stops
          </span>
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && tripStops.length > 0 && (
        <div className="max-h-52 overflow-y-auto px-3 pb-3 scrollbar-thin">
          <div className="relative">
            {tripStops.map((ts, i) => {
              const isFirst = i === 0;
              const isLast = i === tripStops.length - 1;
              const dotColor = isFirst
                ? 'bg-green-500 ring-green-200'
                : isLast
                  ? 'bg-red-500 ring-red-200'
                  : 'bg-indigo-400 ring-indigo-100';

              const time = formatTimestamp(ts.plannedDepartureTimestamp) || formatDeparture(ts.plannedDepartureMinutes);

              return (
                <div key={`ts-${ts.stopID}-${ts.stopOrder}`} className="flex gap-3 group">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center w-4 flex-shrink-0">
                    {/* Connector line above */}
                    {!isFirst && (
                      <div className="w-0.5 flex-1 bg-indigo-200" />
                    )}
                    {/* Dot */}
                    <div
                      className={`w-2.5 h-2.5 rounded-full ring-2 flex-shrink-0
                                  ${dotColor} ${isFirst || isLast ? 'w-3 h-3' : ''}`}
                    />
                    {/* Connector line below */}
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-indigo-200" />
                    )}
                  </div>

                  {/* Stop info */}
                  <div className={`flex-1 min-w-0 pb-2.5 ${isFirst || isLast ? 'pt-0' : 'pt-0'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className={`text-[12px] leading-tight truncate
                            ${isFirst || isLast ? 'font-semibold text-slate-800' : 'text-slate-700'}`}
                        >
                          {ts.stopName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {ts.platformName && (
                            <span className="text-[10px] text-slate-400">
                              {ts.platformName}
                            </span>
                          )}
                          {!ts.platformName && ts.platformNumber && (
                            <span className="text-[10px] text-slate-400">
                              Platform {ts.platformNumber}
                            </span>
                          )}
                          {ts.zones && (
                            <span className="text-[10px] text-slate-400/70">
                              Z:{ts.zones}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Departure time */}
                      {time && (
                        <span className="flex-shrink-0 text-[11px] font-medium text-blue-600 tabular-nums">
                          {time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="px-3 pb-3 space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex gap-3 animate-pulse">
              <div className="w-4 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
              </div>
              <div className="flex-1">
                <div className="h-3 bg-blue-100 rounded w-3/4" />
                <div className="h-2 bg-blue-50 rounded w-1/2 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
