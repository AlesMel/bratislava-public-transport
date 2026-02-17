// ──────────────────────────────────────────────────────────
// VehicleMarker — a single vehicle on the map
// ──────────────────────────────────────────────────────────
//
// Each marker shows an inline SVG icon of the vehicle type
// (bus / tram / trolleybus) plus the line number underneath.
// The icon pulses gently via CSS animation.

import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '../types';
import VehiclePopup from './VehiclePopup';

/* ── Inline SVG icons for each vehicle type ─────────────── */

// Tram / streetcar icon
const TRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="6" y="6" width="20" height="20" rx="4" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>
  <rect x="10" y="9" width="12" height="6" rx="1.5" fill="#fca5a5"/>
  <circle cx="12" cy="22" r="1.5" fill="#fff"/>
  <circle cx="20" cy="22" r="1.5" fill="#fff"/>
  <line x1="16" y1="3" x2="16" y2="6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="12" y1="2" x2="20" y2="2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

// Bus icon
const BUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="6" y="5" width="20" height="22" rx="4" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>
  <rect x="9" y="8" width="14" height="7" rx="2" fill="#93c5fd"/>
  <circle cx="11" cy="23" r="1.5" fill="#fff"/>
  <circle cx="21" cy="23" r="1.5" fill="#fff"/>
  <rect x="6" y="17" width="20" height="1.5" fill="#1d4ed8"/>
</svg>`;

// Trolleybus icon
const TROLLEY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="6" y="7" width="20" height="20" rx="4" fill="#16a34a" stroke="#fff" stroke-width="1.5"/>
  <rect x="9" y="10" width="14" height="6" rx="2" fill="#86efac"/>
  <circle cx="11" cy="23" r="1.5" fill="#fff"/>
  <circle cx="21" cy="23" r="1.5" fill="#fff"/>
  <line x1="12" y1="7" x2="10" y2="2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="20" y1="7" x2="22" y2="2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

// Generic / unknown vehicle
const UNKNOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="6" y="6" width="20" height="20" rx="4" fill="#6b7280" stroke="#fff" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="5" fill="#d1d5db"/>
</svg>`;

const ICON_MAP: Record<string, string> = {
  TRAM: TRAM_SVG,
  BUS: BUS_SVG,
  TROLLEY: TROLLEY_SVG,
  UNKNOWN: UNKNOWN_SVG,
};

interface Props {
  vehicle: Vehicle;
  onClick?: (v: Vehicle) => void;
  selected?: boolean;
}

export default function VehicleMarker({ vehicle, onClick, selected = false }: Props) {
  const icon = useMemo(() => {
    const svg = ICON_MAP[vehicle.vehicleType] ?? UNKNOWN_SVG;
    const w = 36;
    const h = 48; // taller to include label below icon

    const html = `
      <div class="vehicle-icon-wrap ${vehicle.vehicleTypeClass} ${selected ? 'vehicle-selected' : ''}" style="width:${w}px;height:${h}px;position:relative;">
        <div style="width:${w}px;height:${w}px;">${svg}</div>
        <div class="vehicle-label">${vehicle.line}</div>
      </div>
    `;

    return L.divIcon({
      className: '',
      html,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
      popupAnchor: [0, -h / 2],
    });
  }, [selected, vehicle.line, vehicle.vehicleType, vehicle.vehicleTypeClass]);

  return (
    <Marker
      position={[vehicle.latitude, vehicle.longitude]}
      icon={icon}
      eventHandlers={onClick ? { click: () => onClick(vehicle) } : undefined}
    >
      <Popup>
        <VehiclePopup vehicle={vehicle} />
      </Popup>
    </Marker>
  );
}
