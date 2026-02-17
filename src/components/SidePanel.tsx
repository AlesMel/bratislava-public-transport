// ──────────────────────────────────────────────────────────
// SidePanel — collapsible left panel with search, filter,
//             vehicle list, and settings
// ──────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { Vehicle, AppSettings, VehicleType, TripStop } from '../types';
import VehicleListItem from './VehicleListItem';
import SettingsPanel from './SettingsPanel';
import StatusIndicator from './StatusIndicator';
import RouteInfoPanel from './RouteInfoPanel';

interface Props {
  vehicles: Vehicle[];
  lastFetch: number | null;
  error: string | null;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onVehicleFocus: (v: Vehicle) => void;
  selectedVehicleId: string | null;
  onVehicleLineSelect: (v: Vehicle) => void;
  activeTripLine: string | null;
  tripStops: TripStop[];
  tripLoading: boolean;
  tripError: string | null;
  onClearTrip: () => void;
  onReload: () => void | Promise<void>;
  reloading: boolean;
}

const VEHICLE_TYPES: { value: '' | VehicleType; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'TRAM', label: '🚊 Tram' },
  { value: 'BUS', label: '🚌 Bus' },
  { value: 'TROLLEY', label: '🚎 Trolley' },
];

export default function SidePanel({
  vehicles,
  lastFetch,
  error,
  settings,
  onSettingsChange,
  onVehicleFocus,
  selectedVehicleId,
  onVehicleLineSelect,
  activeTripLine,
  tripStops,
  tripLoading,
  tripError,
  onClearTrip,
  onReload,
  reloading,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | VehicleType>('');
  const [showSettings, setShowSettings] = useState(false);

  // Filter + search vehicles
  const filtered = useMemo(() => {
    let list = vehicles;

    if (typeFilter) {
      list = list.filter((v) => v.vehicleType === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (v) =>
          v.line.toLowerCase().includes(q) ||
          v.lineName.toLowerCase().includes(q) ||
          v.destinationStop.toLowerCase().includes(q) ||
          v.destination.toLowerCase().includes(q),
      );
    }

    // Sort by line number (natural sort)
    return list.sort((a, b) => {
      const na = parseInt(a.line);
      const nb = parseInt(b.line);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.line.localeCompare(b.line);
    });
  }, [vehicles, typeFilter, search]);

  return (
    <>
      {/* Collapse / expand toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-[1000] glass rounded-xl p-2
                   hover:bg-slate-100 transition-colors duration-300 text-slate-700"
        title={collapsed ? 'Open panel' : 'Close panel'}
      >
        {collapsed ? '☰' : '✕'}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-0 left-0 h-full z-[999] transition-all duration-500 ease-in-out
                    ${collapsed ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
                    w-80 glass flex flex-col`}
      >
        {/* Header */}
        <div className="px-4 pt-14 pb-3">
          <h1 className="text-xl font-bold text-slate-800 mb-1">
            🚊 Bratislava MHD
          </h1>
          <StatusIndicator lastFetch={lastFetch} vehicleCount={vehicles.length} />
          <button
            onClick={() => { void onReload(); }}
            disabled={reloading}
            className="mt-2 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700
                       border border-slate-200 hover:bg-slate-200 transition-colors duration-300
                       disabled:opacity-60 disabled:cursor-not-allowed"
            title="Fetch latest vehicle positions now"
          >
            {reloading ? 'Reloading…' : '↻ Reload now'}
          </button>

          {error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 border border-red-100">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            type="text"
            placeholder="Search line or destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2
                       text-sm text-slate-800 placeholder-slate-400
                       focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors duration-300"
          />
        </div>

        {/* Type filter chips */}
        <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
          {VEHICLE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors duration-300
                ${
                  typeFilter === t.value
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-2 text-[11px] text-slate-500">
          Tip: click a <span className="font-semibold text-blue-700">line number</span> to show full route.
        </div>

        {(tripLoading || activeTripLine || tripError) && (
          <RouteInfoPanel
            tripStops={tripStops}
            activeTripLine={activeTripLine}
            loading={tripLoading}
            error={tripError}
            onClear={onClearTrip}
          />
        )}

        {/* Vehicle list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1.5">
          {filtered.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-slate-500">
                No vehicles in range.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try increasing the radius.
              </p>
            </div>
          )}

          {filtered.map((v) => (
            <VehicleListItem
              key={v.id}
              vehicle={v}
              onClick={onVehicleFocus}
              onLineClick={onVehicleLineSelect}
              selected={selectedVehicleId === v.id}
            />
          ))}
        </div>

        {/* Settings toggle */}
        <div className="border-t border-slate-200">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-2 text-xs text-slate-500 hover:text-slate-700
                       transition-colors duration-300 flex items-center gap-1"
          >
            ⚙ {showSettings ? 'Hide settings' : 'Settings'}
          </button>

          {showSettings && (
            <div className="px-4 pb-4">
              <SettingsPanel settings={settings} onChange={onSettingsChange} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
          Data source: IDS BK map endpoint (unofficial). May change.
        </div>
      </div>
    </>
  );
}
