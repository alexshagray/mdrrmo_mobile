import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useLocalSearchParams as useExpoSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { MapView } from '@/shared/components/Map';
import MapboxGL from '@rnmapbox/maps';
import { ArrowLeft, Layers, Map as MapIcon, Ambulance, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useLiveDispatchTracking } from '@/shared/hooks';
import { updateDispatchStatus } from '@/shared/api/dispatches';
import {
  getDistance,
  calculateBearing,
  smoothAngle,
  trimRouteProgress,
  LatLng,
} from '@/shared/utils/navigationMath';
import {
  fetchRoadRoute,
  formatDistance,
  formatDuration,
} from '@/shared/services/routingService';
import {
  ResponderNavigationArrow,
  IncidentLocationPin,
} from '@/shared/components/Map/NavigationMarkers';

export default function NavigationScreen() {
  const router = useExpoRouter();
  const params = useExpoSearchParams();
  const mapRef = useRef<MapboxGL.Camera>(null);

  const destination: LatLng = {
    latitude: parseFloat(Array.isArray(params.lat) ? params.lat[0] : (params.lat as string)) || 8.5138,
    longitude: parseFloat(Array.isArray(params.lng) ? params.lng[0] : (params.lng as string)) || 124.5775,
  };

  const dispatchId = Array.isArray(params.dispatchId) ? params.dispatchId[0] : params.dispatchId;
  const driverId = Array.isArray(params.driverId) ? params.driverId[0] : params.driverId;
  const [trackingStatus, setTrackingStatus] = useState('en_route');
  useLiveDispatchTracking(dispatchId, trackingStatus, { driverId });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(responder)');
    }
  };

  // State
  const [displayedLocation, setDisplayedLocation] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [isFpvMode, setIsFpvMode] = useState(false);

  // Refs for navigation stability & smooth tracking
  const isCalculatingRef = useRef(false);
  const lastRecalcTimeRef = useRef(0);
  const lastReliableHeadingRef = useRef(0);
  const lastRawLocationRef = useRef<LatLng | null>(null);
  const deviationCounterRef = useRef(0);
  const isFpvModeRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRouteRef = useRef<LatLng[]>([]);

  // Keep activeRouteRef in sync with state for access in location callback
  useEffect(() => {
    activeRouteRef.current = routeCoords;
  }, [routeCoords]);

  // Proximity to scene: must be within 10 meters of the incident pin
  const distanceToScene = displayedLocation
    ? getDistance(displayedLocation.latitude, displayedLocation.longitude, destination.latitude, destination.longitude)
    : Infinity;
  const isWithinRange = distanceToScene <= 10;

  const handleArrived = async () => {
    if (isArriving) return;
    if (!isWithinRange) {
      Alert.alert(
        'Proximity Requirement',
        `You must be within 10 meters of the incident location pin to mark arrival. You are currently ${Math.round(distanceToScene)}m away.`
      );
      return;
    }
    setIsArriving(true);
    try {
      if (dispatchId) {
        await updateDispatchStatus(dispatchId, 'arrived_on_scene');
      }
      setTrackingStatus('arrived_on_scene');
      setRouteCoords([]);
      setRouteInfo(null);
      router.replace('/(responder)');
    } catch (e: any) {
      console.error('Error updating status to arrived_on_scene:', e);
      router.replace('/(responder)');
    } finally {
      setIsArriving(false);
    }
  };

  // Fetch full road-following route from Mapbox Directions
  const calculateRoute = useCallback(
    async (startLat: number, startLng: number, destLat: number, destLng: number) => {
      if (isCalculatingRef.current) return;
      isCalculatingRef.current = true;
      setIsCalculating(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await fetchRoadRoute(startLat, startLng, destLat, destLng, controller.signal);

        if (result && result.coordinates.length >= 2) {
          setRouteCoords(result.coordinates);
          setRouteInfo({
            distance: result.distanceFormatted,
            duration: result.durationFormatted,
          });
          deviationCounterRef.current = 0;

          if (mapRef.current && !isFpvModeRef.current) {
            const lats = [startLat, ...result.coordinates.map((c) => c.latitude), destLat];
            const lngs = [startLng, ...result.coordinates.map((c) => c.longitude), destLng];
            const ne = [Math.max(...lngs), Math.max(...lats)];
            const sw = [Math.min(...lngs), Math.min(...lats)];
            mapRef.current.fitBounds(ne, sw, [90, 40, 290, 40], 1000);
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          console.warn('Road route calculation error:', e?.message || e);
        }
      } finally {
        isCalculatingRef.current = false;
        setIsCalculating(false);
      }
    },
    []
  );

  // Location Tracking & Dynamic Navigation Engine
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) {
            Alert.alert('Permission Denied', 'Location permission is required for navigation.');
            handleBack();
          }
          return;
        }

        let isInitialFix = true;

        // Try getting cached position first for instantaneous startup
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && isMounted) {
          const initCoords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
          setDisplayedLocation(initCoords);
          lastRawLocationRef.current = initCoords;
          calculateRoute(initCoords.latitude, initCoords.longitude, destination.latitude, destination.longitude);
          isInitialFix = false;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1500,
            distanceInterval: 3,
          },
          (loc) => {
            if (!isMounted) return;

            const currentRaw: LatLng = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            const currentAccuracy = loc.coords.accuracy ?? 15;
            const currentSpeed = loc.coords.speed ?? 0;

            // 1. BEARING / HEADING RESOLUTION & SMOOTHING
            let targetHeading = lastReliableHeadingRef.current;
            const hasGpsHeading =
              typeof loc.coords.heading === 'number' &&
              loc.coords.heading >= 0 &&
              currentSpeed > 0.6;

            if (hasGpsHeading) {
              const validHeading = loc.coords.heading as number;
              targetHeading = validHeading;
              lastReliableHeadingRef.current = validHeading;
            } else if (lastRawLocationRef.current) {
              const distMoved = getDistance(
                lastRawLocationRef.current.latitude,
                lastRawLocationRef.current.longitude,
                currentRaw.latitude,
                currentRaw.longitude
              );

              // Only update bearing if vehicle actually moved forward by at least 2.5m
              if (distMoved >= 2.5) {
                const movementBearing = calculateBearing(
                  lastRawLocationRef.current.latitude,
                  lastRawLocationRef.current.longitude,
                  currentRaw.latitude,
                  currentRaw.longitude
                );
                targetHeading = movementBearing;
                lastReliableHeadingRef.current = movementBearing;
              }
              // If stationary or tiny jitter, KEEP lastReliableHeadingRef.current!
            }

            // Smooth the heading with low-pass angular filter
            setHeading((prev) => smoothAngle(prev, targetHeading, 0.32));
            lastRawLocationRef.current = currentRaw;

            // 2. DYNAMIC ROUTE PROGRESS & ROAD SNAPPING
            const currentActiveRoute = activeRouteRef.current;

            if (currentActiveRoute.length >= 2) {
              // Project onto active road route
              const trimResult = trimRouteProgress(currentActiveRoute, currentRaw, 0, 32);

              if (trimResult.isSnapped) {
                // Snapped cleanly to road segment:
                // Update displayed location on the road
                setDisplayedLocation(trimResult.displayLocation);

                // Dynamically remove completed road segment behind responder
                setRouteCoords(trimResult.remainingRoute);
                deviationCounterRef.current = 0;

                // Dynamically calculate remaining road distance along the active remaining path
                let remainingMeters = 0;
                for (let i = 0; i < trimResult.remainingRoute.length - 1; i++) {
                  remainingMeters += getDistance(
                    trimResult.remainingRoute[i].latitude,
                    trimResult.remainingRoute[i].longitude,
                    trimResult.remainingRoute[i + 1].latitude,
                    trimResult.remainingRoute[i + 1].longitude
                  );
                }

                if (remainingMeters > 0) {
                  const estSeconds = (remainingMeters / 10) * 1.1; // ~36 km/h city average
                  setRouteInfo({
                    distance: formatDistance(remainingMeters),
                    duration: formatDuration(estSeconds),
                  });
                }
              } else {
                // Not snapped (e.g. GPS drifted or user took another street):
                setDisplayedLocation(currentRaw);

                // 3. INTELLIGENT AUTOMATIC REROUTING
                const deviationThreshold = Math.max(38, currentAccuracy + 12);
                const now = Date.now();

                if (
                  trimResult.crossTrackDistance > deviationThreshold &&
                  currentSpeed > 0.8 &&
                  now - lastRecalcTimeRef.current > 6000
                ) {
                  deviationCounterRef.current += 1;

                  if (deviationCounterRef.current >= 2) {
                    console.log('Vehicle deviated from route, recalculating fresh road path...');
                    lastRecalcTimeRef.current = now;
                    deviationCounterRef.current = 0;
                    calculateRoute(currentRaw.latitude, currentRaw.longitude, destination.latitude, destination.longitude);
                  }
                } else {
                  deviationCounterRef.current = 0;
                }
              }
            } else {
              setDisplayedLocation(currentRaw);
            }

            // 4. CAMERA FOLLOWING (FPV MODE)
            if (isFpvModeRef.current && mapRef.current) {
              mapRef.current.setCamera({
                centerCoordinate: [currentRaw.longitude, currentRaw.latitude],
                heading: targetHeading,
                pitch: 62,
                zoomLevel: 19,
                animationDuration: 1800,
              });
            }

            // Initial route fetch if not already done
            if (isInitialFix) {
              isInitialFix = false;
              calculateRoute(currentRaw.latitude, currentRaw.longitude, destination.latitude, destination.longitude);
            }
          }
        );

        if (isMounted) {
          locationSubscription = sub;
        } else {
          sub.remove();
        }
      } catch (err) {
        console.error('Location Tracking Error:', err);
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [calculateRoute, destination.latitude, destination.longitude]);

  const handleOverview = () => {
    isFpvModeRef.current = false;
    setIsFpvMode(false);

    if (mapRef.current && routeCoords.length > 0 && displayedLocation) {
      const lats = [displayedLocation.latitude, ...routeCoords.map((c) => c.latitude), destination.latitude];
      const lngs = [displayedLocation.longitude, ...routeCoords.map((c) => c.longitude), destination.longitude];
      const ne = [Math.max(...lngs), Math.max(...lats)];
      const sw = [Math.min(...lngs), Math.min(...lats)];
      mapRef.current.fitBounds(ne, sw, [90, 40, 290, 40], 1000);
    }
  };

  const toggleFpv = () => {
    const newFpv = !isFpvModeRef.current;
    isFpvModeRef.current = newFpv;
    setIsFpvMode(newFpv);

    if (mapRef.current && displayedLocation) {
      if (newFpv) {
        mapRef.current.setCamera({
          centerCoordinate: [displayedLocation.longitude, displayedLocation.latitude],
          pitch: 62,
          heading: heading || 0,
          zoomLevel: 19,
          animationDuration: 1000,
        });
      } else {
        handleOverview();
      }
    }
  };

  return (
    <View className="flex-1 bg-slate-900 relative">
      <MapView
        ref={mapRef}
        className="absolute inset-0"
        showsUserLocation={false}
        styleURL={MapboxGL.StyleURL.Dark}
      >
        {/* Active Road Route with High-Contrast Casing */}
        {routeCoords.length >= 2 && (
          <MapboxGL.ShapeSource
            id="routeSource"
            shape={{
              type: 'LineString',
              coordinates: routeCoords.map((c) => [c.longitude, c.latitude]),
            }}
          >
            {/* Outer contrasting road border */}
            <MapboxGL.LineLayer
              id="routeCasing"
              style={{
                lineColor: '#064e3b',
                lineWidth: 10,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Vibrant primary navigation stroke */}
            <MapboxGL.LineLayer
              id="routeFill"
              style={{
                lineColor: '#10B981',
                lineWidth: 6,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Clean Incident Destination Marker (No Circular Container) */}
        <MapboxGL.PointAnnotation
          id="incidentDestination"
          coordinate={[destination.longitude, destination.latitude]}
          anchor={{ x: 0.5, y: 1.0 }}
        >
          <IncidentLocationPin size={38} />
        </MapboxGL.PointAnnotation>

        {/* Clean Directional Responder Arrow (Faces Travel Bearing, No Circular Container) */}
        {displayedLocation && (
          <MapboxGL.PointAnnotation
            id="userPuck"
            coordinate={[displayedLocation.longitude, displayedLocation.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <ResponderNavigationArrow heading={heading} size={36} />
          </MapboxGL.PointAnnotation>
        )}
      </MapView>

      <SafeAreaView className="flex-1 justify-between" edges={['top', 'bottom']} pointerEvents="box-none">
        {/* Top Header */}
        <View className="px-4 mt-2 flex-row items-center" pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleBack}
            className="bg-slate-900/90 p-3 rounded-full shadow-xl mr-3 border border-slate-700/50 pointer-events-auto"
          >
            <ArrowLeft size={24} color="#f8fafc" />
          </TouchableOpacity>
          <View className="flex-1 bg-slate-900/90 py-3 px-5 rounded-3xl shadow-xl border border-slate-700/50 flex-row items-center pointer-events-auto">
            <View className="flex-1">
              <Text className="text-white font-bold text-lg tracking-tight">Responding to Scene</Text>
              {isCalculating ? (
                <Text className="text-emerald-400/80 text-sm font-medium">Calculating fastest road route...</Text>
              ) : (
                <Text className="text-emerald-400/80 text-sm font-medium">Follow highlighted road path</Text>
              )}
            </View>
          </View>
        </View>

        {/* Bottom Panel */}
        <View className="px-4 mb-4 flex-col items-end" pointerEvents="box-none">
          <View className="flex-col items-center mb-6 space-y-4" pointerEvents="box-none">
            {/* Overview Map Button */}
            <TouchableOpacity
              onPress={handleOverview}
              className={`w-14 h-14 rounded-full shadow-2xl items-center justify-center border pointer-events-auto mb-3 ${
                !isFpvMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-900/90 border-slate-700/50'
              }`}
            >
              <MapIcon size={24} color={!isFpvMode ? '#ffffff' : '#94A3B8'} />
            </TouchableOpacity>

            {/* FPV Mode Toggle Button */}
            <TouchableOpacity
              onPress={toggleFpv}
              className={`w-14 h-14 rounded-full shadow-2xl items-center justify-center border pointer-events-auto ${
                isFpvMode ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-900/90 border-slate-700/50'
              }`}
            >
              <Layers size={24} color={isFpvMode ? '#ffffff' : '#34d399'} />
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View className="bg-slate-900/95 w-full rounded-[32px] p-6 shadow-2xl border border-slate-700/80 pointer-events-auto">
            {routeInfo ? (
              <View className="flex-row justify-between items-end mb-6">
                <View>
                  <Text className="text-6xl font-black text-emerald-400 tracking-tighter shadow-sm">
                    {routeInfo.duration}
                  </Text>
                  <Text className="text-slate-400 font-bold text-sm tracking-widest uppercase mt-1">
                    {routeInfo.distance} remaining
                  </Text>
                </View>
                <View className="bg-emerald-500/20 px-4 py-2 rounded-full border border-emerald-500/30 flex-row items-center">
                  {isCalculating && <ActivityIndicator color="#34d399" size="small" style={{ marginRight: 6 }} />}
                  <Text className="text-emerald-400 font-black text-xs tracking-widest">
                    {isCalculating ? 'ROUTING' : 'ACTIVE'}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-center py-6 mb-2">
                <ActivityIndicator color="#34d399" size="large" />
                <Text className="ml-4 text-slate-300 font-bold text-lg">
                  {!displayedLocation ? 'Acquiring GPS...' : 'Calculating road route...'}
                </Text>
              </View>
            )}

            {!isWithinRange ? (
              <View className="flex-row items-center justify-center mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={15} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text className="text-amber-400 text-xs font-semibold text-center">
                  {displayedLocation
                    ? `Must be within 10m to mark arrival (${Math.round(distanceToScene)}m away)`
                    : 'Acquiring GPS to verify arrival proximity...'}
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center justify-center mb-3 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle size={15} color="#34d399" style={{ marginRight: 6 }} />
                <Text className="text-emerald-400 text-xs font-bold text-center">
                  Within arrival range ({Math.round(distanceToScene)}m from incident pin)
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleArrived}
              disabled={isArriving || !isWithinRange}
              activeOpacity={0.85}
              style={[styles.btnArrived, (!isWithinRange || isArriving) && styles.btnArrivedDisabled]}
            >
              {isArriving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ambulance size={22} color={isWithinRange ? '#ffffff' : '#64748b'} style={{ marginRight: 10 }} />
                  <Text style={[styles.btnArrivedText, !isWithinRange && styles.btnArrivedTextDisabled]}>
                    {isWithinRange ? 'ARRIVED ON SCENE' : 'ARRIVED ON SCENE (LOCKED)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  btnArrived: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnArrivedDisabled: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnArrivedText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.2,
  },
  btnArrivedTextDisabled: {
    color: '#64748b',
  },
});
