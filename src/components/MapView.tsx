// ──────────────────────────────────────────────────────────
// MapView — the main Leaflet map with vehicle markers
// ──────────────────────────────────────────────────────────

import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import { type Vehicle, type Stop, type MapStyle, MAP_STYLES, type TripStop } from '../types';
import VehicleMarker from './VehicleMarker';
import RouteSummaryCard from './RouteSummaryCard';
import { useEffect } from 'react';

interface Props {
  vehicles: Vehicle[];
  stops: Stop[];
  center: [number, number];
  focusVehicle: Vehicle | null;
  mapStyle: MapStyle;
  selectedVehicleId: string | null;
  tripStops: TripStop[];
  /** OSRM-routed path in [lng, lat] format */
  routedPath: [number, number][];
  activeTripLine: string | null;
  onVehicleClick: (v: Vehicle) => void;
  onClearTrip: () => void;
}

/**
 * Inner component that reacts to focusVehicle changes
 * by smoothly panning/zooming to that vehicle.
 */
function FocusHandler({ focusVehicle }: { focusVehicle: Vehicle | null }) {
  const map = useMap();

  useEffect(() => {
    if (focusVehicle) {
      map.flyTo([focusVehicle.latitude, focusVehicle.longitude], 16, {
        duration: 1.2,
      });
    }
  }, [focusVehicle, map]);

  return null;
}

export default function MapView({
  vehicles,
  stops,
  center,
  focusVehicle,
  mapStyle,
  selectedVehicleId,
  tripStops,
  routedPath,
  activeTripLine,
  onVehicleClick,
  onClearTrip,
}: Props) {
  const tile = MAP_STYLES[mapStyle] ?? MAP_STYLES.positron;

  // Use OSRM-routed path (convert from [lng,lat] to [lat,lng] for Leaflet)
  const tripLine: [number, number][] = routedPath.length > 1
    ? routedPath.map((c) => [c[1], c[0]])
    : tripStops.map((ts) => [ts.latitude, ts.longitude]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full rounded-2xl"
      zoomControl={false}
    >
      {/* Tile layer — switches based on user-selected mapStyle */}
      <TileLayer
        key={mapStyle} // force remount when style changes
        attribution={tile.attribution}
        url={tile.url}
        subdomains={tile.subdomains ?? 'abc'}
        maxZoom={tile.maxZoom ?? 19}
      />

      <FocusHandler focusVehicle={focusVehicle} />

      {vehicles.map((v) => (
        <VehicleMarker
          key={v.id}
          vehicle={v}
          onClick={onVehicleClick}
          selected={selectedVehicleId === v.id}
        />
      ))}

      {stops.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.latitude, s.longitude]}
          radius={4}
          pathOptions={{
            color: '#94a3b8',
            fillColor: '#3b82f6',
            fillOpacity: 0.7,
            weight: 1,
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{s.name}</div>
              {s.platform && (
                <div className="text-xs text-gray-500">Platform: {s.platform}</div>
              )}
              <div className="text-[10px] text-gray-400">
                {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Trip route polyline (OSRM road-following) */}
      {tripLine.length > 1 && (
        <>
          <Polyline
            positions={tripLine}
            pathOptions={{
              color: '#4f46e5',
              weight: 7,
              opacity: 0.3,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={tripLine}
            pathOptions={{
              color: '#6366f1',
              weight: 4,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </>
      )}

      {/* Trip stop markers */}
      {tripStops.map((ts, i) => (
        <CircleMarker
          key={`trip-${ts.stopID}-${ts.stopOrder}`}
          center={[ts.latitude, ts.longitude]}
          radius={6}
          pathOptions={{
            color: '#6366f1',
            fillColor: i === 0 ? '#22c55e' : i === tripStops.length - 1 ? '#ef4444' : '#818cf8',
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{ts.stopName}</div>
              <div className="text-xs text-gray-500">
                Stop #{ts.stopOrder} · Platform {ts.platformName || ts.platformNumber}
              </div>
              {ts.plannedDepartureMinutes > 0 && (
                <div className="text-xs text-gray-500">
                  Departure: {ts.plannedDepartureMinutes} min
                </div>
              )}
              {ts.zones && (
                <div className="text-[10px] text-gray-400">Zone: {ts.zones}</div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Clear trip button overlay */}
      {tripStops.length > 0 && (
        <div className="leaflet-top leaflet-left" style={{ top: 10, left: 60 }}>
          <div className="leaflet-control">
            <RouteSummaryCard
              activeTripLine={activeTripLine}
              tripStops={tripStops}
              onClearTrip={onClearTrip}
            />
          </div>
        </div>
      )}
    </MapContainer>
  );
}
