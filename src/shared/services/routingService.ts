import ENV from '../config/env';
import { LatLng } from '../utils/navigationMath';

export interface RouteResult {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
  distanceFormatted: string;
  durationFormatted: string;
}

// Polyline decoder for OSRM fallback
const decodePolyline = (str: string, precision: number = 5): LatLng[] => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: LatLng[] = [],
    shift = 0,
    result = 0,
    byte = null,
    latitude_change,
    longitude_change,
    factor = Math.pow(10, precision);

  while (index < str.length) {
    byte = null;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude_change = result & 1 ? ~(result >> 1) : result >> 1;
    lat += latitude_change;
    lng += longitude_change;
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
};

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours} hr ${remainingMins} min`;
};

/**
 * Fetches a road-following route from Mapbox Directions API (primary)
 * with automatic fallback to OSRM.
 *
 * NOTE: Never returns a straight 2-point line across buildings.
 */
export const fetchRoadRoute = async (
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal
): Promise<RouteResult | null> => {
  // 1. Try Mapbox Directions API v5 (Accurate road network, respects one-ways & drivable roads)
  const mapboxToken = ENV.MAPBOX_ACCESS_TOKEN;
  if (mapboxToken) {
    try {
      const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${destLng},${destLat}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
      const res = await fetch(mapboxUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords: LatLng[] = route.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lon,
            })
          );

          if (coords.length >= 2) {
            return {
              coordinates: coords,
              distanceMeters: route.distance,
              durationSeconds: route.duration,
              distanceFormatted: formatDistance(route.distance),
              durationFormatted: formatDuration(route.duration),
            };
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
      console.warn('Mapbox Directions failed, falling back to OSRM:', e?.message || e);
    }
  }

  // 2. Fallback to OpenStreetMap Routing Machine (OSRM)
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full`;
    const res = await fetch(osrmUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = decodePolyline(route.geometry);
        if (coords.length >= 2) {
          return {
            coordinates: coords,
            distanceMeters: route.distance,
            durationSeconds: route.duration,
            distanceFormatted: formatDistance(route.distance),
            durationFormatted: formatDuration(route.duration),
          };
        }
      }
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    console.warn('OSRM routing request failed:', e?.message || e);
  }

  return null;
};
