// ──────────────────────────────────────────────────────────
// App — root component wiring everything together
// ──────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import MapView from './components/MapView';
import MapView3D from './components/MapView3D';
import SidePanel from './components/SidePanel';
import { useSettings } from './hooks/useSettings';
import { useVehicles } from './hooks/useVehicles';
import { useStops } from './hooks/useStops';
import { useTripStops } from './hooks/useTripStops';
import { useRoutedPath } from './hooks/useRoutedPath';
import type { Vehicle } from './types';

export default function App() {
  const { settings, updateSettings } = useSettings();
  const {
    vehicles,
    lastFetch,
    error,
    loading,
    reloadNow,
    reloading,
  } = useVehicles(settings);
  const { stops } = useStops(settings);
  const {
    tripStops,
    loading: tripLoading,
    error: tripError,
    fetchTripStops,
    clearTripStops,
    activeTripID,
  } = useTripStops();
  const { routedPath, loading: routeLoading } = useRoutedPath(tripStops);
  const [focusVehicle, setFocusVehicle] = useState<Vehicle | null>(null);

  // Convert map to array for list + markers
  const vehicleList = useMemo(() => Array.from(vehicles.values()), [vehicles]);
  const activeTripLine = useMemo(
    () => vehicleList.find((v) => v.tripID === activeTripID)?.line ?? null,
    [vehicleList, activeTripID],
  );

  const handleVehicleFocus = useCallback((v: Vehicle) => {
    // Set a new object ref so the effect in FocusHandler fires
    setFocusVehicle({ ...v });
    // Also fetch the trip route when clicking a vehicle
    if (v.tripID) {
      void fetchTripStops(v.tripID);
    }
  }, [fetchTripStops]);

  const handleVehicleLineSelect = useCallback((v: Vehicle) => {
    if (v.tripID) {
      void fetchTripStops(v.tripID);
    }
  }, [fetchTripStops]);

  const center: [number, number] = [settings.lat, settings.lng];

  return (
    <div className="h-screen w-screen flex relative overflow-hidden">
      {/* Side panel (overlays on top of map) */}
      <SidePanel
        vehicles={vehicleList}
        lastFetch={lastFetch}
        error={error}
        settings={settings}
        onSettingsChange={updateSettings}
        onVehicleFocus={handleVehicleFocus}
        selectedVehicleId={focusVehicle?.id ?? null}
        onVehicleLineSelect={handleVehicleLineSelect}
        activeTripLine={activeTripLine}
        tripStops={tripStops}
        tripLoading={tripLoading}
        tripError={tripError}
        onClearTrip={clearTripStops}
        onReload={reloadNow}
        reloading={reloading}
      />

      {/* Full-screen map */}
      <div className="flex-1 p-3">
        {loading && vehicles.size === 0 ? (
          <div className="h-full flex items-center justify-center animate-fade-in">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-pulse">🚊</div>
              <p className="text-lg text-slate-700 font-medium">
                Finding vehicles…
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Connecting to Bratislava MHD
              </p>
            </div>
          </div>
        ) : settings.use3D ? (
          <MapView3D
            vehicles={vehicleList}
            stops={stops}
            center={center}
            focusVehicle={focusVehicle}
            selectedVehicleId={focusVehicle?.id ?? null}
            tripStops={tripStops}
            routedPath={routedPath}
            activeTripLine={activeTripLine}
            onVehicleClick={handleVehicleFocus}
            onClearTrip={clearTripStops}
          />
        ) : (
          <MapView
            vehicles={vehicleList}
            stops={stops}
            center={center}
            focusVehicle={focusVehicle}
            mapStyle={settings.mapStyle}
            selectedVehicleId={focusVehicle?.id ?? null}
            tripStops={tripStops}
            routedPath={routedPath}
            activeTripLine={activeTripLine}
            onVehicleClick={handleVehicleFocus}
            onClearTrip={clearTripStops}
          />
        )}
      </div>
    </div>
  );
}
