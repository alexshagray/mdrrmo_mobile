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
 * Calculates shortest signed angular difference from angle A to angle B in degrees [-180, +180].
 * Correctly handles wrap-around transitions such as 350° to 10° (+20°) and 10° to 350° (-20°).
 */
export const getShortestAngleDiff = (from: number, to: number): number => {
  return ((to - from + 540) % 360) - 180;
};

/**
 * Smoothly interpolates an angle towards a target angle along the shortest circular path.
 * Avoids 0° <-> 360° boundary snap jitter and respects an optional deadband threshold.
 */
export const smoothAngle = (
  current: number,
  target: number,
  smoothingFactor: number = 0.28,
  deadbandDegrees: number = 0
): number => {
  const diff = getShortestAngleDiff(current, target);
  if (Math.abs(diff) < deadbandDegrees) {
    return current;
  }
  return (current + diff * smoothingFactor + 360) % 360;
};

/**
 * Determines whether a GPS coordinate jump is physically unrealistic (teleport artifact).
 */
export const isGpsJumpUnrealistic = (
  prevPos: LatLng,
  newPos: LatLng,
  dtSeconds: number,
  maxSpeedMps: number = 45, // ~162 km/h
  minJumpMeters: number = 50
): boolean => {
  if (dtSeconds <= 0) return true;
  const dist = getDistance(prevPos.latitude, prevPos.longitude, newPos.latitude, newPos.longitude);
  const speed = dist / dtSeconds;
  return dist > minJumpMeters && speed > maxSpeedMps;
};

/**
 * Looks ahead along the active route by `lookaheadMeters` to compute an anticipatory road bearing.
 * Enables gradual steering rotation when entering turns and curves, rather than abrupt snaps.
 */
export const getLookaheadRouteBearing = (
  routeCoordinates: LatLng[],
  currentSnappedIndex: number,
  currentPosition: LatLng,
  lookaheadMeters: number = 20
): number => {
  if (routeCoordinates.length < 2) return 0;

  const startIdx = Math.max(0, Math.min(currentSnappedIndex, routeCoordinates.length - 2));
  let accumulatedDist = 0;
  let prevPoint = currentPosition;
  let targetPoint: LatLng = routeCoordinates[startIdx + 1] || routeCoordinates[startIdx];

  for (let i = startIdx + 1; i < routeCoordinates.length; i++) {
    const pt = routeCoordinates[i];
    const segDist = getDistance(prevPoint.latitude, prevPoint.longitude, pt.latitude, pt.longitude);
    accumulatedDist += segDist;
    prevPoint = pt;

    if (accumulatedDist >= lookaheadMeters) {
      targetPoint = pt;
      break;
    }
    targetPoint = pt;
  }

  return calculateBearing(
    currentPosition.latitude,
    currentPosition.longitude,
    targetPoint.latitude,
    targetPoint.longitude
  );
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
 * Supports optional startIndex and forward window to prioritize the advancing travel direction.
 */
export const getMinDistanceToRoute = (
  currentLocation: LatLng,
  routeCoordinates: LatLng[],
  startIndex: number = 0,
  windowSize: number = 0
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

  // If startIndex > 0 and windowSize > 0, search in a local forward window around startIndex
  let searchStart = 0;
  let searchEnd = routeCoordinates.length - 1;

  if (windowSize > 0 && startIndex > 0) {
    searchStart = Math.max(0, startIndex - 2);
    searchEnd = Math.min(routeCoordinates.length - 1, startIndex + windowSize);
  }

  let minDistance = Infinity;
  let nearestSegmentIndex = searchStart;
  let nearestPoint: LatLng = routeCoordinates[searchStart];

  for (let i = searchStart; i < searchEnd; i++) {
    const proj = projectPointOnSegment(currentLocation, routeCoordinates[i], routeCoordinates[i + 1]);
    if (proj.distance < minDistance) {
      minDistance = proj.distance;
      nearestSegmentIndex = i;
      nearestPoint = proj.point;
    }
  }

  // If local window search yielded an excessive distance (> 70m), expand to full route
  if (windowSize > 0 && minDistance > 70 && (searchStart > 0 || searchEnd < routeCoordinates.length - 1)) {
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const proj = projectPointOnSegment(currentLocation, routeCoordinates[i], routeCoordinates[i + 1]);
      if (proj.distance < minDistance) {
        minDistance = proj.distance;
        nearestSegmentIndex = i;
        nearestPoint = proj.point;
      }
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
 * Calculates the exact road-aligned navigation bearing along the active route.
 * - Samples ahead along the route for a stable forward window (16m), eliminating micro-segment noise.
 * - Authoritative road alignment: arrow is locked tangent to the route polyline ahead so it always points
 *   cleanly down the road path and never tilts sideways ("naka ta kilid") due to phone compass tilt or vehicle EMF.
 * - Uses shortest-angle math to prevent erratic spins.
 * - Remains rock-solid stable when stopped or moving slowly.
 */
export const calculateSmoothRouteBearing = (
  currentPosition: LatLng,
  routeCoordinates: LatLng[],
  segmentIndex: number,
  rawHeading: number | null = null,
  speedMps: number = 0,
  lastReliableHeading: number = 0
): number => {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return typeof rawHeading === 'number' && rawHeading >= 0 ? rawHeading : lastReliableHeading;
  }

  const clampedIdx = Math.max(0, Math.min(segmentIndex, routeCoordinates.length - 2));

  // Look ahead along route vertices for a cumulative 16-meter forward distance
  // This avoids erratic angles from tiny 1-meter polyline curve segments
  let lookAheadPoint: LatLng = routeCoordinates[clampedIdx + 1];
  let accumulatedDist = getDistance(
    currentPosition.latitude,
    currentPosition.longitude,
    lookAheadPoint.latitude,
    lookAheadPoint.longitude
  );

  let forwardIdx = clampedIdx + 1;
  while (accumulatedDist < 16 && forwardIdx < routeCoordinates.length - 1) {
    const nextPt = routeCoordinates[forwardIdx + 1];
    accumulatedDist += getDistance(
      routeCoordinates[forwardIdx].latitude,
      routeCoordinates[forwardIdx].longitude,
      nextPt.latitude,
      nextPt.longitude
    );
    lookAheadPoint = nextPt;
    forwardIdx++;
  }

  // Calculate stable forward road bearing
  let roadBearing: number;
  if (accumulatedDist >= 0.5) {
    roadBearing = calculateBearing(
      currentPosition.latitude,
      currentPosition.longitude,
      lookAheadPoint.latitude,
      lookAheadPoint.longitude
    );
  } else {
    // If vehicle is right on top of lookahead point (e.g. at end of segment or route),
    // use the bearing of the segment itself
    const p1 = routeCoordinates[clampedIdx];
    const p2 = routeCoordinates[clampedIdx + 1];
    roadBearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
  }

  // Route-following guarantee:
  // When snapped to an active road route, the navigation puck MUST always face along
  // the road polyline forward direction. This completely eliminates sideways tilting
  // caused by device compass orientation or in-vehicle magnetic interference.
  return (roadBearing + 360) % 360;
};

/**
 * Offsets the start of the visible route line by `leadMeters` ahead of the vehicle
 * along the active route line. This prevents the route line from overlapping or
 * passing through the center, body, or front tip of the navigation arrow.
 */
export const getVisuallyOffsetRemainingRoute = (
  remainingRoute: LatLng[],
  leadMeters: number = 5.5
): LatLng[] => {
  if (!remainingRoute || remainingRoute.length <= 1) return remainingRoute || [];

  const start = remainingRoute[0];
  const next = remainingRoute[1];
  const segDist = getDistance(start.latitude, start.longitude, next.latitude, next.longitude);

  if (segDist > leadMeters) {
    const fraction = leadMeters / segDist;
    const offsetStart: LatLng = {
      latitude: start.latitude + (next.latitude - start.latitude) * fraction,
      longitude: start.longitude + (next.longitude - start.longitude) * fraction,
    };
    return [offsetStart, ...remainingRoute.slice(1)];
  } else if (remainingRoute.length > 2) {
    // If first segment is shorter than leadMeters, skip to second segment
    return remainingRoute.slice(1);
  }

  return remainingRoute;
};

/**
 * Computes visual screen rotation by synchronizing geographic travel heading with map camera bearing.
 * Formula: (geographicHeading - cameraBearing)
 * Correctly accounts for 2D vs 3D FPV perspective and user-rotated map cameras.
 */
export const computeVisualScreenRotation = (
  geographicHeading: number,
  cameraBearing: number = 0
): number => {
  return ((geographicHeading - cameraBearing) % 360 + 360) % 360;
};

/**
 * Trims completed road segments behind the vehicle and returns the active remaining route.
 * Guarantees that segments already traveled behind the vehicle are never drawn,
 * keeping the route cleanly ahead of the vehicle at all times.
 */
export const trimRouteProgress = (
  routeCoordinates: LatLng[],
  currentLocation: LatLng,
  lastSegmentIndex: number = 0,
  snapThresholdMeters: number = 35
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

  // Prioritize forward search starting from lastSegmentIndex
  const { minDistance, nearestSegmentIndex, nearestPoint } = getMinDistanceToRoute(
    currentLocation,
    routeCoordinates,
    lastSegmentIndex,
    35
  );

  const isSnapped = minDistance <= snapThresholdMeters;
  const displayLocation = isSnapped ? nearestPoint : currentLocation;

  const p1 = routeCoordinates[nearestSegmentIndex];
  const p2 = routeCoordinates[nearestSegmentIndex + 1] || p1;
  const segmentBearing = calculateBearing(p1.latitude, p1.longitude, p2.latitude, p2.longitude);

  // ALWAYS TRIM COMPLETED SEGMENTS BEHIND THE VEHICLE!
  // The forward active route starts cleanly from the vehicle projection to destination.
  const remainingRoute: LatLng[] = [
    nearestPoint,
    ...routeCoordinates.slice(nearestSegmentIndex + 1),
  ];

  return {
    remainingRoute,
    displayLocation,
    segmentIndex: nearestSegmentIndex,
    crossTrackDistance: minDistance,
    isSnapped,
    segmentBearing,
  };
};
