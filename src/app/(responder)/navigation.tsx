import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Linking,
  StatusBar,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter, useLocalSearchParams as useExpoSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { MapView } from '@/shared/components/Map';
import MapboxGL from '@rnmapbox/maps';
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  Map as MapIcon,
  Layers,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Ambulance,
  X,
  ExternalLink,
  MapPin,
  Navigation,
} from 'lucide-react-native';
import { useLiveDispatchTracking, useNetworkStatus } from '@/shared/hooks';
import { updateDispatchStatus, reportUnfoundedDispatch } from '@/shared/api/dispatches';
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
  IncidentLocationPin,
} from '@/shared/components/Map/NavigationMarkers';
import { SmoothResponderMarker } from '@/shared/components/Map/SmoothResponderMarker';

const ARRIVAL_RADIUS_METERS = 50;
const MAX_ACCURACY_THRESHOLD_METERS = 40; // Reject GPS fixes worse than 40m
const MAX_REALISTIC_SPEED_MPS = 45; // ~162 km/h - filter out GPS coordinate jumps / teleports

export default function NavigationScreen() {
  const router = useExpoRouter();
  const params = useExpoSearchParams();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapboxGL.Camera>(null);
  const { isOffline } = useNetworkStatus();

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
      router.replace('/(responder)/dispatch');
    }
  };

  // Navigation State
  const [displayedLocation, setDisplayedLocation] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [isFpvMode, setIsFpvMode] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true); // Smooth auto-follow camera state
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Refs for tracking, filtering, and animation stability
  const isCalculatingRef = useRef(false);
  const lastRecalcTimeRef = useRef(0);
  const lastReliableHeadingRef = useRef(0);
  const lastRawLocationRef = useRef<LatLng | null>(null);
  const lastRawTimestampRef = useRef<number>(0);
  const deviationCounterRef = useRef(0);
  const isFpvModeRef = useRef(false);
  const isFollowingRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRouteRef = useRef<LatLng[]>([]);
  const latestSnappedLocationRef = useRef<LatLng | null>(null);

  useEffect(() => {
    isFpvModeRef.current = isFpvMode;
  }, [isFpvMode]);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    activeRouteRef.current = routeCoords;
  }, [routeCoords]);

  // Proximity to scene: must be within 50 meters of the incident pin based on real GPS
  const distanceToScene = displayedLocation
    ? getDistance(displayedLocation.latitude, displayedLocation.longitude, destination.latitude, destination.longitude)
    : Infinity;
  const isWithinRange = distanceToScene <= ARRIVAL_RADIUS_METERS;

  // External Navigation App launcher
  const handleOpenExternalNav = () => {
    const destLat = destination.latitude;
    const destLng = destination.longitude;

    const url = Platform.select({
      ios: `maps:0,0?q=${destLat},${destLng}`,
      android: `google.navigation:q=${destLat},${destLng}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`,
    });

    Linking.canOpenURL(url as string)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url as string);
        } else {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`);
      });
  };

  const navigateBackSafe = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(responder)/dispatch');
    }
  };

  const executeArrival = async () => {
    setIsArriving(true);
    try {
      if (dispatchId) {
        const res = await updateDispatchStatus(dispatchId, 'arrived_on_scene', displayedLocation || null);
        if (res?.is_offline_queued) {
          Alert.alert(
            'Scene Arrival Recorded (Offline)',
            'You are offline. Scene arrival was recorded locally with GPS coordinates and will sync automatically when connection returns.'
          );
        }
      }
      setTrackingStatus('arrived_on_scene');
      setRouteCoords([]);
      setRouteInfo(null);
      navigateBackSafe();
    } catch (e: any) {
      console.error('Error updating status to arrived_on_scene:', e);
      navigateBackSafe();
    } finally {
      setIsArriving(false);
    }
  };

  const confirmManualArrival = () => {
    Alert.alert(
      'Manual Arrival Override',
      `GPS reports your unit is ${Math.round(distanceToScene)}m away from the incident pin (limit: ${ARRIVAL_RADIUS_METERS}m).\n\nIf you have physically reached the scene or satellite reception has drifted, confirm your arrival below:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Arrived',
          style: 'default',
          onPress: () => executeArrival(),
        },
      ]
    );
  };

  const handleArrived = async () => {
    if (isArriving) return;
    if (!isWithinRange) {
      confirmManualArrival();
      return;
    }
    await executeArrival();
  };

  // Report No Incident Found / False Alarm on Scene
  const [showUnfoundedModal, setShowUnfoundedModal] = useState(false);
  const [unfoundedCategory, setUnfoundedCategory] = useState<'false_alarm' | 'prank'>('false_alarm');
  const [unfoundedReason, setUnfoundedReason] = useState('');
  const [isSubmittingUnfounded, setIsSubmittingUnfounded] = useState(false);

  const handleConfirmUnfounded = async () => {
    if (!dispatchId || isSubmittingUnfounded) return;
    const finalReason =
      unfoundedReason.trim() || 'Responders arrived on scene. Conducted area sweep; zero patients or incident found.';
    setIsSubmittingUnfounded(true);
    try {
      await reportUnfoundedDispatch(dispatchId, {
        reason: finalReason,
        category: unfoundedCategory,
      });
      setShowUnfoundedModal(false);
      Alert.alert(
        'Mission Closed',
        'Negative result reported. Your unit and crew have been released back to Available.',
        [
          {
            text: 'OK',
            onPress: () => navigateBackSafe(),
          },
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit report. Please check your connection and try again.');
    } finally {
      setIsSubmittingUnfounded(false);
    }
  };

  // Fetch full road-following route from Mapbox Directions with debounce/abort
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
          activeRouteRef.current = result.coordinates;
          setRouteCoords(result.coordinates);
          setRouteInfo({
            distance: result.distanceFormatted,
            duration: result.durationFormatted,
          });
          deviationCounterRef.current = 0;

          if (mapRef.current && !isFpvModeRef.current && !isFollowingRef.current) {
            const lats = [startLat, ...result.coordinates.map((c) => c.latitude), destLat];
            const lngs = [startLng, ...result.coordinates.map((c) => c.longitude), destLng];
            const ne = [Math.max(...lngs), Math.max(...lats)];
            const sw = [Math.min(...lngs), Math.min(...lats)];
            mapRef.current.fitBounds(ne, sw, [110, 40, 310, 40], 1000);
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

  // Recenter Camera on Responder Location
  const handleRecenter = useCallback(() => {
    setIsFollowing(true);
    isFollowingRef.current = true;

    const loc = latestSnappedLocationRef.current || displayedLocation;
    if (mapRef.current && loc) {
      mapRef.current.setCamera({
        centerCoordinate: [loc.longitude, loc.latitude],
        heading: isFpvMode ? lastReliableHeadingRef.current : 0,
        zoomLevel: isFpvMode ? 18.5 : 17,
        pitch: isFpvMode ? 58 : 28,
        animationDuration: 900,
        animationMode: 'easeTo',
      });
    }
  }, [displayedLocation, isFpvMode]);

  // User touched or moved the map manually -> pause auto-follow
  const handleMapTouch = useCallback(() => {
    if (isFollowingRef.current) {
      setIsFollowing(false);
      isFollowingRef.current = false;
    }
  }, []);

  // Location Tracking & High-Performance Dynamic Navigation Engine
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

        // Instant startup with cached position
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && isMounted) {
          const initCoords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
          setDisplayedLocation(initCoords);
          latestSnappedLocationRef.current = initCoords;
          lastRawLocationRef.current = initCoords;
          lastRawTimestampRef.current = Date.now();
          calculateRoute(initCoords.latitude, initCoords.longitude, destination.latitude, destination.longitude);
          isInitialFix = false;

          // Initial camera framing
          if (mapRef.current) {
            mapRef.current.setCamera({
              centerCoordinate: [initCoords.longitude, initCoords.latitude],
              zoomLevel: 17,
              pitch: 28,
              heading: 0,
              animationDuration: 800,
              animationMode: 'easeTo',
            });
          }
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1.5,
          },
          (loc) => {
            if (!isMounted) return;

            const now = Date.now();
            const currentAccuracy = loc.coords.accuracy ?? 15;
            const currentSpeed = loc.coords.speed ?? 0;

            // 1. ACCURACY & OUTLIER FILTERING
            if (currentAccuracy > MAX_ACCURACY_THRESHOLD_METERS) {
              setGpsAccuracyWarning(Math.round(currentAccuracy));
              // If accuracy is very poor and we have a previous location, treat as low-confidence
              if (lastRawLocationRef.current) {
                return;
              }
            } else {
              setGpsAccuracyWarning(null);
            }

            const currentRaw: LatLng = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };

            // Teleport jump rejection (unrealistic speed spikes > 162 km/h)
            if (lastRawLocationRef.current && lastRawTimestampRef.current > 0) {
              const dtSeconds = Math.max((now - lastRawTimestampRef.current) / 1000, 0.2);
              const distJump = getDistance(
                lastRawLocationRef.current.latitude,
                lastRawLocationRef.current.longitude,
                currentRaw.latitude,
                currentRaw.longitude
              );
              const speedJump = distJump / dtSeconds;

              if (speedJump > MAX_REALISTIC_SPEED_MPS && distJump > 60) {
                console.warn(`[Navigation] Rejected GPS coordinate jump of ${Math.round(distJump)}m (${Math.round(speedJump * 3.6)} km/h)`);
                return;
              }
            }

            // 2. STABLE BEARING & ROTATION SMOOTHING
            let targetHeading = lastReliableHeadingRef.current;
            const isMoving = currentSpeed > 0.6; // ~2.1 km/h threshold for movement
            const hasGpsHeading =
              typeof loc.coords.heading === 'number' &&
              loc.coords.heading >= 0 &&
              isMoving;

            if (hasGpsHeading) {
              targetHeading = loc.coords.heading as number;
              lastReliableHeadingRef.current = targetHeading;
            } else if (lastRawLocationRef.current && isMoving) {
              const distMoved = getDistance(
                lastRawLocationRef.current.latitude,
                lastRawLocationRef.current.longitude,
                currentRaw.latitude,
                currentRaw.longitude
              );

              // Update bearing from vector if vehicle moved at least 2 meters
              if (distMoved >= 2.0) {
                targetHeading = calculateBearing(
                  lastRawLocationRef.current.latitude,
                  lastRawLocationRef.current.longitude,
                  currentRaw.latitude,
                  currentRaw.longitude
                );
                lastReliableHeadingRef.current = targetHeading;
              }
            }

            // 3. DYNAMIC ROAD SNAPPING & PROGRESS TRIMMING
            const currentActiveRoute = activeRouteRef.current;
            let finalLocation = currentRaw;

            if (currentActiveRoute.length >= 2) {
              // Project onto route with 25m threshold
              const trimResult = trimRouteProgress(currentActiveRoute, currentRaw, 0, 25);

              if (trimResult.isSnapped) {
                finalLocation = trimResult.displayLocation;
                latestSnappedLocationRef.current = trimResult.displayLocation;
                setDisplayedLocation(trimResult.displayLocation);

                // Smoothly align vehicle heading with the road segment bearing if aligned within 40°
                const angleDiffToRoad = Math.abs(((trimResult.segmentBearing - targetHeading + 540) % 360) - 180);
                if (angleDiffToRoad < 40) {
                  targetHeading = smoothAngle(targetHeading, trimResult.segmentBearing, 0.45);
                  lastReliableHeadingRef.current = targetHeading;
                }

                // Trim route behind the vehicle
                setRouteCoords(trimResult.remainingRoute);
                activeRouteRef.current = trimResult.remainingRoute;
                deviationCounterRef.current = 0;

                // Update remaining route distance and ETA along road path
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
                  const estSeconds = (remainingMeters / 10) * 1.1; // ~36 km/h emergency response city pace
                  setRouteInfo({
                    distance: formatDistance(remainingMeters),
                    duration: formatDuration(estSeconds),
                  });
                }
              } else {
                // Not snapped (deviated from route)
                finalLocation = currentRaw;
                latestSnappedLocationRef.current = currentRaw;
                setDisplayedLocation(currentRaw);

                // 4. INTELLIGENT REROUTING HYSTERESIS
                const isOffRoute = trimResult.crossTrackDistance > 32;
                const canRecalculate = now - lastRecalcTimeRef.current > 4000 && !isCalculatingRef.current;

                if (isOffRoute) {
                  deviationCounterRef.current += 1;

                  // Trigger recalculation if off-route for 2 fixes (>32m) or immediately if far off (>50m)
                  if ((deviationCounterRef.current >= 2 || trimResult.crossTrackDistance > 50) && canRecalculate) {
                    console.log(`[Navigation] Off-route by ${Math.round(trimResult.crossTrackDistance)}m. Recalculating path...`);
                    lastRecalcTimeRef.current = now;
                    deviationCounterRef.current = 0;
                    calculateRoute(currentRaw.latitude, currentRaw.longitude, destination.latitude, destination.longitude);
                  }
                } else {
                  deviationCounterRef.current = 0;
                }
              }
            } else {
              finalLocation = currentRaw;
              latestSnappedLocationRef.current = currentRaw;
              setDisplayedLocation(currentRaw);

              if (!isCalculatingRef.current && now - lastRecalcTimeRef.current > 4000) {
                lastRecalcTimeRef.current = now;
                calculateRoute(currentRaw.latitude, currentRaw.longitude, destination.latitude, destination.longitude);
              }
            }

            // Update smooth heading state
            setHeading(targetHeading);
            lastRawLocationRef.current = currentRaw;
            lastRawTimestampRef.current = now;

            // 5. SMOOTH CAMERA FOLLOWING (GPU-Accelerated EaseTo)
            if (isFollowingRef.current && mapRef.current) {
              mapRef.current.setCamera({
                centerCoordinate: [finalLocation.longitude, finalLocation.latitude],
                heading: isFpvModeRef.current ? targetHeading : 0,
                zoomLevel: isFpvModeRef.current ? 18.5 : 17,
                pitch: isFpvModeRef.current ? 58 : 28,
                animationDuration: 1200,
                animationMode: 'easeTo',
              });
            }

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

    // AppState lifecycle listener: handle backgrounding/foregrounding
    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App resumed to foreground: re-check immediate GPS position
        Location.getLastKnownPositionAsync().then((pos) => {
          if (pos && isMounted) {
            const freshCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setDisplayedLocation(freshCoords);
            latestSnappedLocationRef.current = freshCoords;
            lastRawLocationRef.current = freshCoords;
          }
        }).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      appStateSubscription.remove();
    };
  }, [calculateRoute, destination.latitude, destination.longitude]);

  // Overview Fit Bounds (displays complete path from vehicle to incident)
  const handleOverview = useCallback(() => {
    setIsFollowing(false);
    isFollowingRef.current = false;
    setIsFpvMode(false);
    isFpvModeRef.current = false;

    if (mapRef.current && routeCoords.length > 0 && displayedLocation) {
      const lats = [displayedLocation.latitude, ...routeCoords.map((c) => c.latitude), destination.latitude];
      const lngs = [displayedLocation.longitude, ...routeCoords.map((c) => c.longitude), destination.longitude];
      const ne = [Math.max(...lngs), Math.max(...lats)];
      const sw = [Math.min(...lngs), Math.min(...lats)];
      mapRef.current.fitBounds(ne, sw, [110, 40, 310, 40], 1000);
    }
  }, [displayedLocation, routeCoords, destination]);

  // Toggle First-Person Perspective (FPV 3D Mode)
  const toggleFpv = useCallback(() => {
    const nextFpv = !isFpvMode;
    setIsFpvMode(nextFpv);
    isFpvModeRef.current = nextFpv;

    // Resuming following on FPV toggle
    setIsFollowing(true);
    isFollowingRef.current = true;

    if (mapRef.current && displayedLocation) {
      mapRef.current.setCamera({
        centerCoordinate: [displayedLocation.longitude, displayedLocation.latitude],
        pitch: nextFpv ? 58 : 28,
        heading: nextFpv ? lastReliableHeadingRef.current : 0,
        zoomLevel: nextFpv ? 18.5 : 17,
        animationDuration: 1000,
        animationMode: 'easeTo',
      });
    }
  }, [isFpvMode, displayedLocation]);

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Map Engine with Touch Listener to Pause Follow on User Pan */}
      <View style={StyleSheet.absoluteFill} onTouchStart={handleMapTouch}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          showsUserLocation={false}
          scaleBarEnabled={false}
          scaleBarPosition={{ top: -9999, left: -9999 }}
          attributionEnabled={false}
          compassEnabled={false}
          styleURL={mapStyle === 'satellite' ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Dark}
        >
          {/* Active Navigation Route Line matching Screenshot 2 */}
          {routeCoords.length >= 2 && (
            <MapboxGL.ShapeSource
              id="routeSource"
              shape={{
                type: 'LineString',
                coordinates: routeCoords.map((c) => [c.longitude, c.latitude]),
              }}
            >
              {/* Outer contrasting casing */}
              <MapboxGL.LineLayer
                id="routeCasing"
                style={{
                  lineColor: '#064E3B',
                  lineWidth: 10,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Vivid emerald navigation line */}
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

          {/* Incident Destination Pin (Red emergency pin) */}
          <MapboxGL.PointAnnotation
            id="incidentDestination"
            coordinate={[destination.longitude, destination.latitude]}
            anchor={{ x: 0.5, y: 1.0 }}
          >
            <IncidentLocationPin size={38} />
          </MapboxGL.PointAnnotation>

          {/* 60 FPS Smoothly Interpolated Responder Navigation Marker */}
          {displayedLocation && (
            <SmoothResponderMarker
              targetLocation={displayedLocation}
              targetHeading={heading}
              size={36}
            />
          )}
        </MapView>
      </View>

      {/* Floating Top Navigation Header */}
      <View
        style={[styles.headerContainer, { top: insets.top + (Platform.OS === 'android' ? 8 : 4) }]}
        pointerEvents="box-none"
      >
        {/* Back Navigation Button */}
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.8}
          style={styles.headerIconButton}
          accessibilityLabel="Back to dispatch overview"
        >
          <ArrowLeft size={22} color="#F8FAFC" />
        </TouchableOpacity>

        {/* Current Navigation Status Card */}
        <View style={styles.headerStatusCard}>
          <Text style={styles.headerStatusTitle} numberOfLines={1}>
            Responding to Scene
          </Text>
          {isCalculating ? (
            <Text style={styles.headerStatusSubtitleCalculating} numberOfLines={1}>
              Calculating fastest road route...
            </Text>
          ) : gpsAccuracyWarning ? (
            <Text style={styles.headerStatusSubtitleWarning} numberOfLines={1}>
              Weak GPS signal (±{gpsAccuracyWarning}m)
            </Text>
          ) : isOffline ? (
            <Text style={styles.headerStatusSubtitleOffline} numberOfLines={1}>
              Offline: Direct compass bearing
            </Text>
          ) : (
            <Text style={styles.headerStatusSubtitle} numberOfLines={1}>
              Follow highlighted road path
            </Text>
          )}
        </View>

        {/* Settings Button */}
        <TouchableOpacity
          onPress={() => setShowSettingsModal(true)}
          activeOpacity={0.8}
          style={styles.headerIconButton}
          accessibilityLabel="Navigation settings"
        >
          <Settings size={22} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* Floating Recenter Button (Appears when user explores/pans map) */}
      {!isFollowing && (
        <View style={[styles.recenterContainer, { bottom: 260 }]} pointerEvents="box-none">
          <TouchableOpacity
            onPress={handleRecenter}
            activeOpacity={0.85}
            style={styles.recenterButton}
            accessibilityLabel="Recenter map on responder"
          >
            <Navigation size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.recenterButtonText}>RECENTER</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Map Controls on the Right */}
      <View style={styles.floatingControlsContainer} pointerEvents="box-none">
        {/* Recalculate / Refresh Route */}
        <TouchableOpacity
          onPress={() => {
            if (displayedLocation && !isCalculating) {
              lastRecalcTimeRef.current = Date.now();
              calculateRoute(displayedLocation.latitude, displayedLocation.longitude, destination.latitude, destination.longitude);
            }
          }}
          disabled={isCalculating}
          activeOpacity={0.8}
          style={styles.floatingButton}
          accessibilityLabel="Recalculate route"
        >
          {isCalculating ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <RefreshCw size={20} color="#10B981" />
          )}
        </TouchableOpacity>

        {/* Overview Fit Bounds Button */}
        <TouchableOpacity
          onPress={handleOverview}
          activeOpacity={0.8}
          style={[styles.floatingButton, !isFpvMode && !isFollowing ? styles.floatingButtonActive : null]}
          accessibilityLabel="Fit route overview"
        >
          <MapIcon size={20} color={!isFpvMode && !isFollowing ? '#FFFFFF' : '#CBD5E1'} />
        </TouchableOpacity>

        {/* 3D FPV Perspective Mode Button */}
        <TouchableOpacity
          onPress={toggleFpv}
          activeOpacity={0.8}
          style={[styles.floatingButton, isFpvMode ? styles.floatingButtonActive : null]}
          accessibilityLabel="Toggle 3D tracking perspective"
        >
          <Layers size={20} color={isFpvMode ? '#FFFFFF' : '#CBD5E1'} />
        </TouchableOpacity>

        {/* External Map Application (Google Maps / Waze) */}
        <TouchableOpacity
          onPress={handleOpenExternalNav}
          activeOpacity={0.8}
          style={styles.floatingButton}
          accessibilityLabel="Open in external Google Maps"
        >
          <Compass size={20} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation Information Panel */}
      <View
        style={[styles.bottomPanelWrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}
        pointerEvents="box-none"
      >
        <View style={styles.bottomCard}>
          {/* Row 1: ETA & Distance with Green ACTIVE Status Indicator */}
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.etaText}>
                {routeInfo?.duration || (displayedLocation ? `${Math.max(1, Math.ceil((distanceToScene / 1000) * 2))} min` : '-- min')}
              </Text>
              <Text style={styles.distanceText}>
                {routeInfo?.distance
                  ? `${routeInfo.distance} REMAINING`
                  : displayedLocation
                  ? `${(distanceToScene / 1000).toFixed(1)} KM REMAINING`
                  : 'CALCULATING REMAINING...'}
              </Text>
            </View>

            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>
                {isCalculating ? 'ROUTING' : isOffline ? 'OFFLINE' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          {/* Row 2: GPS Distance & Manual Override Warning Container */}
          {!isWithinRange ? (
            <View style={styles.warningContainer}>
              <View style={styles.warningLeft}>
                <AlertTriangle size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.warningText} numberOfLines={1}>
                  {displayedLocation
                    ? `${Math.round(distanceToScene)}m away (Limit: ${ARRIVAL_RADIUS_METERS}m)`
                    : 'Acquiring GPS proximity...'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={confirmManualArrival}
                disabled={isArriving}
                activeOpacity={0.8}
                style={styles.overrideButton}
              >
                <Text style={styles.overrideButtonText}>Override GPS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successContainer}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.successText}>
                Within arrival range ({Math.round(distanceToScene)}m from incident pin)
              </Text>
            </View>
          )}

          {/* Row 3: Prominent Arrived Button */}
          <TouchableOpacity
            onPress={handleArrived}
            disabled={isArriving}
            activeOpacity={0.88}
            style={[
              styles.btnArrived,
              !isWithinRange ? styles.btnArrivedOverride : styles.btnArrivedNormal,
            ]}
          >
            {isArriving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                {!isWithinRange ? (
                  <ShieldAlert size={21} color="#FEF3C7" style={{ marginRight: 8 }} />
                ) : (
                  <ShieldCheck size={21} color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={styles.btnArrivedText}>
                  {!isWithinRange ? 'ARRIVED (MANUAL OVERRIDE)' : 'ARRIVED ON SCENE'}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Row 4: Secondary False Alarm / No Incident Found Button */}
          <TouchableOpacity
            onPress={() => setShowUnfoundedModal(true)}
            activeOpacity={0.8}
            style={styles.btnUnfounded}
          >
            <AlertTriangle size={15} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.btnUnfoundedText}>
              No Incident Found / False Alarm
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Settings & Map Options Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentDark}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <Settings size={20} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitleDark}>Navigation Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Map View Mode Toggle */}
            <Text style={styles.modalSectionLabel}>Map Display Style</Text>
            <View style={styles.settingToggleRow}>
              <TouchableOpacity
                onPress={() => setMapStyle('dark')}
                style={[
                  styles.settingToggleOption,
                  mapStyle === 'dark' ? styles.settingToggleOptionActive : null,
                ]}
              >
                <Text style={[styles.settingToggleText, mapStyle === 'dark' ? styles.settingToggleTextActive : null]}>
                  Dark Tactical Map
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMapStyle('satellite')}
                style={[
                  styles.settingToggleOption,
                  mapStyle === 'satellite' ? styles.settingToggleOptionActive : null,
                ]}
              >
                <Text style={[styles.settingToggleText, mapStyle === 'satellite' ? styles.settingToggleTextActive : null]}>
                  Satellite Aerial
                </Text>
              </TouchableOpacity>
            </View>

            {/* External Navigation Link */}
            <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>External Navigation</Text>
            <TouchableOpacity
              onPress={() => {
                setShowSettingsModal(false);
                handleOpenExternalNav();
              }}
              style={styles.externalNavRow}
            >
              <Compass size={18} color="#38BDF8" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.externalNavTitle}>Open in Google Maps / Waze</Text>
                <Text style={styles.externalNavSubtitle}>Launch external turn-by-turn spoken directions</Text>
              </View>
              <ExternalLink size={16} color="#64748B" />
            </TouchableOpacity>

            {/* Incident Destination Info */}
            <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Target Coordinates</Text>
            <View style={styles.coordBox}>
              <MapPin size={16} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.coordText}>
                {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowSettingsModal(false)}
              style={styles.modalDoneButton}
            >
              <Text style={styles.modalDoneButtonText}>Close Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal to report Negative on Scene / False Alarm / Prank */}
      <Modal
        visible={showUnfoundedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isSubmittingUnfounded && setShowUnfoundedModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentDark}>
            <View style={styles.modalHeaderCenter}>
              <View style={styles.amberWarningCircle}>
                <AlertTriangle size={28} color="#F59E0B" />
              </View>
              <Text style={styles.unfoundedModalTitle}>
                Report Negative on Scene
              </Text>
              <Text style={styles.unfoundedModalSubtitle}>
                If there is zero incident or no patient found at this location, report it to close this mission and release your crew.
              </Text>
            </View>

            {/* Selection Category */}
            <View style={styles.unfoundedCategoryRow}>
              <TouchableOpacity
                onPress={() => setUnfoundedCategory('false_alarm')}
                style={[
                  styles.categoryCard,
                  unfoundedCategory === 'false_alarm' ? styles.categoryCardActiveAmber : null,
                ]}
              >
                <Text
                  style={[
                    styles.categoryCardTitle,
                    unfoundedCategory === 'false_alarm' ? styles.categoryCardTitleActiveAmber : null,
                  ]}
                >
                  ⚠️ False Alarm
                </Text>
                <Text style={styles.categoryCardSubtitle}>Good faith / Left scene</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setUnfoundedCategory('prank')}
                style={[
                  styles.categoryCard,
                  unfoundedCategory === 'prank' ? styles.categoryCardActiveRed : null,
                ]}
              >
                <Text
                  style={[
                    styles.categoryCardTitle,
                    unfoundedCategory === 'prank' ? styles.categoryCardTitleActiveRed : null,
                  ]}
                >
                  🚨 Intentional Prank
                </Text>
                <Text style={styles.categoryCardSubtitle}>Fabricated hoax</Text>
              </TouchableOpacity>
            </View>

            {/* Reason text input */}
            <TextInput
              value={unfoundedReason}
              onChangeText={setUnfoundedReason}
              placeholder="Enter area sweep details (e.g. Conducted 360 survey, zero patients found, caller unreachable)..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              style={styles.unfoundedTextInput}
            />

            <View style={styles.unfoundedActionsRow}>
              <TouchableOpacity
                disabled={isSubmittingUnfounded}
                onPress={() => setShowUnfoundedModal(false)}
                style={styles.unfoundedCancelBtn}
              >
                <Text style={styles.unfoundedCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isSubmittingUnfounded}
                onPress={handleConfirmUnfounded}
                style={styles.unfoundedSubmitBtn}
              >
                {isSubmittingUnfounded ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.unfoundedSubmitBtnText}>Submit & Free Unit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },

  // Floating Navigation Header
  headerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#172235',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerStatusCard: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#172235',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  headerStatusTitle: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  headerStatusSubtitle: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  headerStatusSubtitleCalculating: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  headerStatusSubtitleWarning: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  headerStatusSubtitleOffline: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },

  // Floating Recenter Button
  recenterContainer: {
    position: 'absolute',
    left: 16,
    zIndex: 42,
  },
  recenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
    borderColor: '#60A5FA',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  recenterButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.1,
  },

  // Floating Controls on Right
  floatingControlsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 255,
    zIndex: 40,
    alignItems: 'center',
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#172235',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },

  // Bottom Navigation Panel
  bottomPanelWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 45,
  },
  bottomCard: {
    backgroundColor: '#172235',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metricLeft: {
    flex: 1,
  },
  etaText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: -1,
    lineHeight: 42,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeBadgeText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Warnings
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  warningLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
  },
  overrideButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  overrideButtonText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '800',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },

  // Arrived Button
  btnArrived: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  btnArrivedNormal: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    borderWidth: 1,
    shadowColor: '#10B981',
  },
  btnArrivedOverride: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
    borderWidth: 1,
    shadowColor: '#D97706',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnArrivedText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.1,
  },

  // False Alarm Secondary Button
  btnUnfounded: {
    marginTop: 10,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnUnfoundedText: {
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 13,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentDark: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#172235',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleDark: {
    color: '#F8FAFC',
    fontWeight: '800',
    fontSize: 17,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingToggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  settingToggleOptionActive: {
    backgroundColor: '#10B981',
  },
  settingToggleText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
  settingToggleTextActive: {
    color: '#FFFFFF',
  },
  externalNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  externalNavTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  externalNavSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  coordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
  },
  coordText: {
    color: '#CBD5E1',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    fontSize: 12,
  },
  modalDoneButton: {
    marginTop: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 14,
  },

  // Unfounded modal styles
  modalHeaderCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  amberWarningCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  unfoundedModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  unfoundedModalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  unfoundedCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  categoryCardActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  categoryCardActiveRed: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: '#DC2626',
  },
  categoryCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  categoryCardTitleActiveAmber: {
    color: '#FBBF24',
  },
  categoryCardTitleActiveRed: {
    color: '#F87171',
  },
  categoryCardSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  unfoundedTextInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 12,
    fontSize: 12,
    color: '#F8FAFC',
    height: 75,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  unfoundedActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  unfoundedCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfoundedCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  unfoundedSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unfoundedSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
