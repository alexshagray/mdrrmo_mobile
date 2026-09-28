export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Calculates Haversine distance between two coordinates in meters.
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates forward azimuth / bearing in degrees [0, 360) from point 1 to point 2.
 */
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * 180 / Math.PI + 360) % 360;
};

/**
 * Smoothly interpolates an angle towards a target angle along the shortest circular path.
 * Avoids 0° <-> 360° boundary snap jitter.
 */
export const smoothAngle = (current: number, target: number, smoothingFactor: number = 0.28): number => {
  let diff = (target - current + 180) % 360 - 180;
  if (diff < -180) diff += 360;
  return (current + diff * smoothingFactor + 360) % 360;
};

/**
 * Projects a point onto a line segment [a, b] in local planar coordinates.
 * Returns the projected coordinate on the segment, distance in meters, and interpolation factor t.
 */
export const projectPointOnSegment = (
  p: LatLng,
  a: LatLng,
  b: LatLng
): { point: LatLng; distance: number; t: number } => {
  const midLat = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
  const metersPerDegLat = 111132.95;
  const metersPerDegLon = 111412.84 * Math.cos(midLat);

  // Convert to local meter space relative to a
  const bx = (b.longitude - a.longitude) * metersPerDegLon;
  const by = (b.latitude - a.latitude) * metersPerDegLat;
  const px = (p.longitude - a.longitude) * metersPerDegLon;
  const py = (p.latitude - a.latitude) * metersPerDegLat;

  const segLengthSq = bx * bx + by * by;

  if (segLengthSq === 0) {
    const dist = Math.hypot(px, py);
    return { point: { latitude: a.latitude, longitude: a.longitude }, distance: dist, t: 0 };
  }

  // Parameter t clamped between 0 (at A) and 1 (at B)
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLengthSq));

  const projLat = a.latitude + t * (b.latitude - a.latitude);
  const projLon = a.longitude + t * (b.longitude - a.longitude);

  const projX = t * bx;
  const projY = t * by;
  const dist = Math.hypot(px - projX, py - projY);

  return {
    point: { latitude: projLat, longitude: projLon },
    distance: dist,
    t,
  };
};

/**
 * Calculates the exact minimum perpendicular distance from a location to any segment along the route.
 */
export const getMinDistanceToRoute = (
  currentLocation: LatLng,
  routeCoordinates: LatLng[]
): { minDistance: number; nearestSegmentIndex: number; nearestPoint: LatLng } => {
  if (routeCoordinates.length < 2) {
    if (routeCoordinates.length === 1) {
      const dist = getDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        routeCoordinates[0].latitude,
        routeCoordinates[0].longitude
      );
      return { minDistance: dist, nearestSegmentIndex: 0, nearestPoint: routeCoordinates[0] };
    }
    return { minDistance: Infinity, nearestSegmentIndex: -1, nearestPoint: currentLocation };
  }

  let minDistance = Infinity;
  let nearestSegmentIndex = 0;
  let nearestPoint: LatLng = routeCoordinates[0];

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const proj = projectPointOnSegment(currentLocation, routeCoordinates[i], routeCoordinates[i + 1]);
    if (proj.distance < minDistance) {
      minDistance = proj.distance;
      nearestSegmentIndex = i;
      nearestPoint = proj.point;
    }
  }

  return { minDistance, nearestSegmentIndex, nearestPoint };
};

/**
 * Finds the nearest road segment on the route ahead of the responder.
 * Searches with full route coverage for accurate off-route tracking.
 */
export const findNearestRoadSegment = (
  currentLocation: LatLng,
  routeCoordinates: LatLng[],
  startIndex: number = 0,
  lookAheadCount: number = 0
): {
  segmentIndex: number;
  snappedPoint: LatLng;
  crossTrackDistance: number;
  segmentBearing: number;
} | null => {
  if (routeCoordinates.length < 2) return null;

  const start = Math.max(0, Math.min(startIndex, routeCoordinates.length - 2));
  const end = lookAheadCount > 0
    ? Math.min(routeCoordinates.length - 1, start + lookAheadCount)
    : routeCoordinates.length - 1;

  let bestDist = Infinity;
  let bestIndex = start;
  let bestPoint: LatLng = routeCoordinates[start];

  for (let i = start; i < end; i++) {
    const p1 = routeCoordinates[i];
    const p2 = routeCoordinates[i + 1];
    const proj = projectPointOnSegment(currentLocation, p1, p2);

    if (proj.distance < bestDist) {
      bestDist = proj.distance;
      bestIndex = i;
      bestPoint = proj.point;
    }
  }

  const p1 = routeCoordinates[bestIndex];
  const p2 = routeCoordinates[bestIndex + 1] || p1;
  const segBearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

  return {
    segmentIndex: bestIndex,
    snappedPoint: bestPoint,
    crossTrackDistance: bestDist,
    segmentBearing: segBearing,
  };
};

/**
 * Trims completed road segments behind the vehicle and returns the active remaining route.
 */
export const trimRouteProgress = (
  routeCoordinates: LatLng[],
  currentLocation: LatLng,
  lastSegmentIndex: number = 0,
  snapThresholdMeters: number = 25
): {
  remainingRoute: LatLng[];
  displayLocation: LatLng;
  segmentIndex: number;
  crossTrackDistance: number;
  isSnapped: boolean;
  segmentBearing: number;
} => {
  if (routeCoordinates.length === 0) {
    return {
      remainingRoute: [],
      displayLocation: currentLocation,
      segmentIndex: 0,
      crossTrackDistance: 0,
      isSnapped: false,
      segmentBearing: 0,
    };
  }

  if (routeCoordinates.length === 1) {
    const dist = getDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      routeCoordinates[0].latitude,
      routeCoordinates[0].longitude
    );
    return {
      remainingRoute: routeCoordinates,
      displayLocation: currentLocation,
      segmentIndex: 0,
      crossTrackDistance: dist,
      isSnapped: dist <= snapThresholdMeters,
      segmentBearing: 0,
    };
  }

  const { minDistance, nearestSegmentIndex, nearestPoint } = getMinDistanceToRoute(currentLocation, routeCoordinates);

  const isSnapped = minDistance <= snapThresholdMeters;
  // If within snap threshold, map-match the displayed location to the road
  const displayLocation = isSnapped ? nearestPoint : currentLocation;

  const p1 = routeCoordinates[nearestSegmentIndex];
  const p2 = routeCoordinates[nearestSegmentIndex + 1] || p1;
  const segmentBearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

  // Build remaining forward route: if snapped, starts at snapped point and continues forward
  const remainingRoute: LatLng[] = isSnapped
    ? [displayLocation, ...routeCoordinates.slice(nearestSegmentIndex + 1)]
    : routeCoordinates;

  return {
    remainingRoute,
    displayLocation,
    segmentIndex: nearestSegmentIndex,
    crossTrackDistance: minDistance,
    isSnapped,
    segmentBearing,
  };
};
