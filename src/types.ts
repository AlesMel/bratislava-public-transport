// ──────────────────────────────────────────────────────────
// Types for the IDS BK vehicle nearby endpoint
// ──────────────────────────────────────────────────────────

/** Vehicle types the API returns via ezVehicleType */
export type VehicleType = 'TRAM' | 'BUS' | 'TROLLEY';

/** Normalised, app-internal vehicle record */
export interface Vehicle {
  /** Unique compound key: vehicleID + tripID + lastStopOrder (API can repeat vehicleID for different positions) */
  id: string;
  vehicleID: number;
  latitude: number;
  longitude: number;
  /** Previous position — used for smooth movement animation */
  prevLatitude?: number;
  prevLongitude?: number;
  line: string;
  lineName: string;
  vehicleType: VehicleType | 'UNKNOWN';
  /** "tram" | "bus" | "trolley" — lowercase for CSS classes */
  vehicleTypeClass: string;
  destination: string;
  destinationStop: string;
  delayMinutes: number;
  lowFloor: boolean;
  tooltip: string | null;
  tripDirection: string;
  operatorName: string;
  /** ISO string from API (usually placeholder "0001-01-01T00:00:00") */
  lastCommunication: string;
  lastStopOrder: number;
  isOnStop: boolean;
  /** Timestamp (ms) when this record was last seen in a fetch */
  lastSeen: number;
  /** Trip ID for fetching trip_stops */
  tripID: number;
}

/** Raw API response wrapper */
export interface ApiResponse {
  status: string;
  vehicles: RawVehicle[];
}

/** Shape of one vehicle object from the API */
export interface RawVehicle {
  vehicleID: number;
  delayMinutes: number;
  latitude: number;
  longitude: number;
  licenseNumber: string | null;
  timeTableTrip: {
    tripID: number;
    trip: number;
    destination: string;
    direction: string | null;
    tripDirectionHere: boolean;
    ezTripDirection: string;
    destinationStopName: string;
    destinationCityName: string;
    bicycle: boolean;
    wifi: boolean;
    lowFloor: boolean;
    timeTableLine: {
      lineID: number;
      lineType: number;
      ezLineType: string;
      ezVehicleType: string;
      line: string;
      lineNumber: number;
      lineName: string;
      firmaID: number;
      uniqueID: string;
      ezIsTrain: boolean;
      ezIsUrban: boolean;
      ezIsBus: boolean;
      ezTrainType: string;
      ezTrainLabel: string;
      supervisorName: string;
    };
    operatorID: number;
    operatorName: string;
    messages: string;
  };
  lastCommunication: string;
  lastStopOrder: number;
  isOnStop: boolean;
  tooltip: string | null;
}

/** Normalised, app-internal stop record */
export interface Stop {
  id: string;
  stopID?: number;
  name: string;
  latitude: number;
  longitude: number;
  cityName?: string;
  platform?: string;
}

/** A single trip-stop returned by the trip_stops endpoint */
export interface TripStop {
  stopOrder: number;
  stopID: number;
  stopName: string;
  stopCity: string;
  platformNumber: number;
  platformName: string;
  plannedDepartureMinutes: number;
  plannedDepartureTimestamp: string;
  latitude: number;
  longitude: number;
  zones: string;
  crossing: boolean;
}

/** Raw stop object from stops/nearby endpoint (shape may vary) */
export interface RawStop {
  stopID?: number;
  id?: number | string;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number;
  lng?: number;
  name?: string;
  stopName?: string;
  stopCity?: string;
  cityName?: string;
  platform?: string | number;
  platforms?: RawPlatform[];
  forUrbanPublicTransport?: boolean;
  forBusTransport?: boolean;
  [key: string]: unknown;
}

export interface RawPlatform {
  platformNumber: number;
  platformName: string;
  latitude: number;
  longitude: number;
  tooltip?: string;
}

/** Available map tile styles */
export type MapStyle = 'positron' | 'dark' | 'voyager' | 'osm' | 'watercolor' | 'toner-lite';

export interface MapTileConfig {
  label: string;
  emoji: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom?: number;
}

export const MAP_STYLES: Record<MapStyle, MapTileConfig> = {
  positron: {
    label: 'Light',
    emoji: '☀️',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  dark: {
    label: 'Dark',
    emoji: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  voyager: {
    label: 'Voyager',
    emoji: '🗺️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  osm: {
    label: 'Classic',
    emoji: '🌍',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  watercolor: {
    label: 'Watercolor',
    emoji: '🎨',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a> &copy; <a href="https://stamen.com/">Stamen</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 16,
  },
  'toner-lite': {
    label: 'Toner',
    emoji: '🖋️',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia</a> &copy; <a href="https://stamen.com/">Stamen</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
};

/** Settings persisted in localStorage */
export interface AppSettings {
  lat: number;
  lng: number;
  radius: number;
  pollInterval: number; // seconds
  cozyMode: boolean;
  useProxy: boolean;
  mapStyle: MapStyle;
  use3D: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  lat: 48.153901,
  lng: 17.112606,
  radius: 4,
  pollInterval: 5,
  cozyMode: false,
  useProxy: false,
  mapStyle: 'positron',
  use3D: false,
};
