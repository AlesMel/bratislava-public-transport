// ──────────────────────────────────────────────────────────
// SettingsPanel — radius, polling, center, cozy mode, proxy
// ──────────────────────────────────────────────────────────

import { type AppSettings, type MapStyle, MAP_STYLES } from '../types';

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export default function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
        Settings
      </h3>

      {/* Map style (only shown in 2D mode) */}
      {!settings.use3D && (
        <div>
          <span className="text-xs text-slate-500 block mb-1.5">Map style</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(MAP_STYLES) as [MapStyle, typeof MAP_STYLES[MapStyle]][]).map(
              ([key, tile]) => (
                <button
                  key={key}
                  onClick={() => onChange({ mapStyle: key })}
                  className={`text-xs px-2 py-1.5 rounded-lg transition-colors duration-300 text-center
                    ${settings.mapStyle === key
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'
                    }`}
                >
                  <div className="text-base leading-none mb-0.5">{tile.emoji}</div>
                  {tile.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* 3D mode toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.use3D}
          onChange={(e) => onChange({ use3D: e.target.checked })}
          className="accent-blue-500 rounded"
        />
        <span className="text-sm text-slate-700">🏙️ 3D mode</span>
        <span className="text-[10px] text-slate-400">(buildings + 3D vehicles)</span>
      </label>

      {/* Radius */}
      <label className="block">
        <span className="text-xs text-slate-500">Radius (km): {settings.radius}</span>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={settings.radius}
          onChange={(e) => onChange({ radius: parseFloat(e.target.value) })}
          className="w-full mt-1 accent-blue-500"
        />
      </label>

      {/* Poll interval */}
      <label className="block">
        <span className="text-xs text-slate-500">Poll interval (s): {settings.pollInterval}</span>
        <input
          type="range"
          min={3}
          max={15}
          step={1}
          value={settings.pollInterval}
          onChange={(e) => onChange({ pollInterval: parseInt(e.target.value) })}
          className="w-full mt-1 accent-blue-500"
        />
      </label>

      {/* Center point */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-slate-500">Lat</span>
          <input
            type="number"
            step={0.001}
            value={settings.lat}
            onChange={(e) => onChange({ lat: parseFloat(e.target.value) || 48.153901 })}
            className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2 py-1
                       text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500">Lng</span>
          <input
            type="number"
            step={0.001}
            value={settings.lng}
            onChange={(e) => onChange({ lng: parseFloat(e.target.value) || 17.112606 })}
            className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2 py-1
                       text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </label>
      </div>

      {/* Cozy mode */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.cozyMode}
          onChange={(e) => onChange({ cozyMode: e.target.checked })}
          className="accent-blue-500 rounded"
        />
        <span className="text-sm text-slate-700">☕ Cozy mode</span>
        <span className="text-[10px] text-slate-400">(softer colors, less motion)</span>
      </label>

      {/* Proxy toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.useProxy}
          onChange={(e) => onChange({ useProxy: e.target.checked })}
          className="accent-blue-500 rounded"
        />
        <span className="text-sm text-slate-700">🌐 Direct fetch</span>
        <span className="text-[10px] text-slate-400">(skip proxy, may hit CORS)</span>
      </label>
    </div>
  );
}
