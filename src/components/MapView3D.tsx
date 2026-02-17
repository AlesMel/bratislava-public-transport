// ──────────────────────────────────────────────────────────
// MapView3D — MapLibre GL + real Three.js 3D vehicles
// ──────────────────────────────────────────────────────────
//
//   • WebGL vector tiles from OpenFreeMap (no API key)
//   • 3D building extrusions
//   • Actual 3D vehicle meshes (box‑geometry buses/trams/trolleys)
//     rendered in the map's WebGL context via Three.js

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import MapGL, {
  Marker,
  NavigationControl,
  Popup,
  Source,
  Layer,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Stop, Vehicle, TripStop } from '../types';
import type { StyleSpecification } from 'maplibre-gl';
import { VehicleLayer } from '../three/VehicleLayer';
import RouteSummaryCard from './RouteSummaryCard';

/* ── types ─────────────────────────────────────────────── */

interface Props {
  vehicles: Vehicle[];
  stops: Stop[];
  center: [number, number];          // [lat, lng]
  focusVehicle: Vehicle | null;
  selectedVehicleId: string | null;
  tripStops: TripStop[];
  /** OSRM-routed path in [lng, lat] format */
  routedPath: [number, number][];
  activeTripLine: string | null;
  onVehicleClick: (v: Vehicle) => void;
  onClearTrip: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  TRAM: '🚊', BUS: '🚌', TROLLEY: '🚎', UNKNOWN: '🚐',
};

/* ── constants ─────────────────────────────────────────── */

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/* ── helpers ───────────────────────────────────────────── */

function add3DBuildings(map: maplibregl.Map) {
  if (map.getLayer('3d-buildings')) return;
  const sources = map.getStyle()?.sources;
  const srcId =
    sources && 'openmaptiles' in sources
      ? 'openmaptiles'
      : Object.keys(sources || {})[0];
  if (!srcId) return;

  map.addLayer({
    id: '3d-buildings',
    source: srcId,
    'source-layer': 'building',
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': [
        'interpolate', ['linear'], ['get', 'render_height'],
        0, '#e2e8f0', 50, '#cbd5e1', 100, '#94a3b8',
      ],
      'fill-extrusion-height': [
        'interpolate', ['linear'], ['zoom'],
        14, 0, 15.5, ['get', 'render_height'],
      ],
      'fill-extrusion-base': [
        'interpolate', ['linear'], ['zoom'],
        14, 0, 15.5, ['get', 'render_min_height'],
      ],
      'fill-extrusion-opacity': 0.7,
    },
  });
}

/* ── component ─────────────────────────────────────────── */

export default function MapView3D({
  vehicles,
  stops,
  center,
  focusVehicle,
  selectedVehicleId,
  tripStops,
  routedPath,
  activeTripLine,
  onVehicleClick,
  onClearTrip,
}: Props) {
  const mapRef  = useRef<MapRef>(null);
  const layerRef = useRef<VehicleLayer | null>(null);

  const [popup, setPopup] = useState<Vehicle | null>(null);
  const [stopPopup, setStopPopup] = useState<Stop | null>(null);
  const [routePhase, setRoutePhase] = useState(0);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Use OSRM-routed path if available, otherwise fall back to straight lines
  const directRouteCoords = useMemo<[number, number][]>(
    () => routedPath.length > 1
      ? routedPath
      : tripStops.map((ts) => [ts.longitude, ts.latitude]),
    [routedPath, tripStops],
  );

  /* ── create the Three.js layer once ── */
  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Custom Three.js layer math is mercator-based.
    // Some external styles may default to globe projection.
    if (typeof map.setProjection === 'function') {
      map.setProjection({ type: 'mercator' });
    }

    add3DBuildings(map);

    // Three.js vehicle layer
    const vl = new VehicleLayer({
      origin: [center[1], center[0]],           // [lng, lat]
      onVehicleClick: (v) => {
        setPopup(v);
        onVehicleClick(v);
      },
    });
    map.addLayer(vl.getLayer());
    layerRef.current = vl;
    vl.setSelectedVehicle(selectedVehicleId);

    // forward clicks
    map.on('click', (e) => {
      vl.handleClick(e.lngLat.lng, e.lngLat.lat);
    });
  }, [center, onVehicleClick, selectedVehicleId]);

  /* ── push vehicles into layer whenever they change ── */
  useEffect(() => {
    layerRef.current?.updateVehicles(vehicles);
  }, [vehicles]);

  useEffect(() => {
    layerRef.current?.setSelectedVehicle(selectedVehicleId);
  }, [selectedVehicleId]);

  /* ── fly‑to focused vehicle ── */
  useEffect(() => {
    if (focusVehicle && mapRef.current) {
      mapRef.current.flyTo({
        center: [focusVehicle.longitude, focusVehicle.latitude],
        zoom: 17,
        pitch: 55,
        duration: 1500,
      });
    }
  }, [focusVehicle]);

  /* ── clean up layer on unmount ── */
  useEffect(() => {
    return () => layerRef.current?.dispose();
  }, []);

  // Use OSRM-routed coordinates directly (no need for local road-snapping anymore)
  useEffect(() => {
    setRouteCoords(directRouteCoords);
  }, [directRouteCoords]);

  // Animate route phase so highlight appears to move forward.
  useEffect(() => {
    if (routeCoords.length < 2) return;
    let raf = 0;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      setRoutePhase(elapsed % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [routeCoords.length]);

  /* ── render ── */
  return (
    <MapGL
      ref={mapRef}
      initialViewState={{
        longitude: center[1],
        latitude: center[0],
        zoom: 15,
        pitch: 50,
        bearing: -15,
      }}
      style={{ width: '100%', height: '100%', borderRadius: '1rem' }}
      mapStyle={STYLE_URL as unknown as StyleSpecification}
      onLoad={onLoad}
      reuseMaps
    >
      <NavigationControl position="top-right" visualizePitch />

      {stops.map((s) => (
        <Marker
          key={s.id}
          longitude={s.longitude}
          latitude={s.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setStopPopup(s);
          }}
        >
          <div className="stop-marker-3d" title={s.name} />
        </Marker>
      ))}

      {/* Trip route line */}
      {routeCoords.length > 1 && (
        <Source
          id="trip-route"
          type="geojson"
          lineMetrics
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoords,
            },
          }}
        >
          <Layer
            id="trip-route-base"
            type="line"
            paint={{
              'line-color': '#4f46e5',
              'line-width': 7,
              'line-opacity': 0.35,
            }}
          />
          <Layer
            id="trip-route-line"
            type="line"
            paint={{
              'line-color': '#6366f1',
              'line-width': 4.5,
              'line-opacity': 0.95,
              'line-gradient': [
                'interpolate',
                ['linear'],
                ['%', ['+', ['*', ['line-progress'], 3], routePhase], 1],
                0, 'rgba(99,102,241,0.15)',
                0.35, 'rgba(99,102,241,0.95)',
                0.7, 'rgba(99,102,241,0.15)',
                1, 'rgba(99,102,241,0.15)',
              ],
            }}
          />
        </Source>
      )}

      {/* Trip stop markers */}
      {tripStops.map((ts, i) => (
        <Marker
          key={`trip-${ts.stopID}-${ts.stopOrder}`}
          longitude={ts.longitude}
          latitude={ts.latitude}
          anchor="center"
        >
          <div
            className="trip-stop-marker-3d"
            style={{
              background: i === 0 ? '#22c55e' : i === tripStops.length - 1 ? '#ef4444' : '#818cf8',
            }}
            title={`${ts.stopOrder}. ${ts.stopName}`}
          />
        </Marker>
      ))}

      {/* Clear trip button */}
      {tripStops.length > 0 && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <RouteSummaryCard
            activeTripLine={activeTripLine}
            tripStops={tripStops}
            onClearTrip={onClearTrip}
          />
        </div>
      )}

      {/* popup on vehicle click */}
      {popup && (
        <Popup
          longitude={popup.longitude}
          latitude={popup.latitude}
          anchor="bottom"
          offset={[0, -20] as [number, number]}
          closeOnClick={false}
          onClose={() => setPopup(null)}
          className="cozy-popup-3d"
        >
          <div className="vehicle-popup-3d">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {TYPE_EMOJI[popup.vehicleType] ?? '🚐'}
              </span>
              <div>
                <div className="text-base font-bold leading-tight">
                  Line {popup.line}
                </div>
                <div className="text-[11px] text-slate-500 capitalize">
                  {popup.vehicleType.toLowerCase()}
                </div>
              </div>
            </div>

            {popup.destinationStop && (
              <div className="text-sm mb-1">
                <span className="text-slate-400">→ </span>
                {popup.destinationStop}
              </div>
            )}

            {popup.delayMinutes > 0 && (
              <div className="text-sm mb-1">
                <span className="text-slate-400">Delay: </span>
                <span
                  className={
                    popup.delayMinutes > 10
                      ? 'text-red-500'
                      : 'text-amber-500'
                  }
                >
                  {popup.delayMinutes} min
                </span>
              </div>
            )}

            <div className="flex gap-1 mt-1 flex-wrap">
              {popup.lowFloor && (
                <span className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5">
                  ♿ Low floor
                </span>
              )}
              {popup.isOnStop && (
                <span className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5">
                  📍 At stop
                </span>
              )}
            </div>

            <div className="text-[10px] text-slate-400 mt-1.5">
              {popup.latitude.toFixed(5)}, {popup.longitude.toFixed(5)}
            </div>
          </div>
        </Popup>
      )}

      {stopPopup && (
        <Popup
          longitude={stopPopup.longitude}
          latitude={stopPopup.latitude}
          anchor="bottom"
          closeOnClick={false}
          onClose={() => setStopPopup(null)}
          className="cozy-popup-3d"
        >
          <div className="vehicle-popup-3d">
            <div className="text-sm font-semibold">{stopPopup.name}</div>
            {stopPopup.platform && (
              <div className="text-xs text-slate-500 mt-0.5">
                Platform: {stopPopup.platform}
              </div>
            )}
            <div className="text-[10px] text-slate-400 mt-1.5">
              {stopPopup.latitude.toFixed(5)}, {stopPopup.longitude.toFixed(5)}
            </div>
          </div>
        </Popup>
      )}
    </MapGL>
  );
}
