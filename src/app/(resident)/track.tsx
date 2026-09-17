import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  ScrollView,
  Dimensions,
  PanResponder,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapboxGL from '@rnmapbox/maps';
import { MapView, Avatar, LocationPermissionModal } from '@/shared/components';
import { TimelineCard } from '@/responder/components/common/TimelineCard';
import {
  Clock,
  MapPin,
  Activity,
  Phone,
  ShieldCheck,
  Lock,
  Navigation,
  AlertTriangle,
  Crosshair,
  Maximize2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  XCircle,
} from 'lucide-react-native';
import { getMyReports, callResponderApi } from '@/shared/api/incidents';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';
import { useRealtime, useAuth } from '@/shared/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom navigation bar height (tab bar sits at bottom: 20 with height: 64)
const BOTTOM_NAV_HEIGHT = 84;
const SHEET_COLLAPSED_HEIGHT = 118;
const SHEET_EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.52, 420);

// Helper: Haversine distance between two coordinates in metres
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
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

// Helper: Decode OSRM polyline
const decodePolyline = (str: string, precision: number = 5) => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: { latitude: number; longitude: number }[] = [],
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

// ─── All Clear Screen ─────────────────────────────────────────────────────────
const AllClearState = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim]);

  return (
    <View className="flex-1 bg-slate-50 justify-center items-center px-8">
      <Animated.View className="w-40 h-40 justify-center items-center mb-6">
        <Animated.View
          className="absolute inset-0 bg-indigo-50/70 rounded-full"
          style={{ transform: [{ scale: pulseAnim }] }}
        />
        <Animated.View
          className="absolute inset-4 bg-indigo-100/60 rounded-full"
          style={{ transform: [{ scale: pulseAnim }] }}
        />
        <Animated.View
          className="w-20 h-20 bg-white rounded-full justify-center items-center shadow-lg shadow-indigo-200/50 border border-slate-100"
          style={{ transform: [{ translateY: floatAnim }] }}
        >
          <ShieldCheck size={38} color="#4F46E5" strokeWidth={2.25} />
        </Animated.View>
      </Animated.View>

      <Text className="text-2xl font-black text-slate-800 text-center tracking-tight mb-2">
        You're All Clear
      </Text>
      <Text className="text-slate-500 text-center text-[15px] leading-relaxed max-w-[280px]">
        There are no active emergency reports in your area.
      </Text>
    </View>
  );
};

// ─── Tracking Locked Screen ───────────────────────────────────────────────────
const TrackingLockedState = ({
  incident,
  onNavigateToReport,
  onRefresh,
}: {
  incident: any;
  onNavigateToReport: () => void;
  onRefresh: () => void;
}) => {
  const status = incident.incident_status;
  const dispatchStatus = incident.active_dispatch?.dispatch_status;
  const isRejected = status === 'rejected';
  const isPending = status === 'pending';
  const isVerified = status === 'verified';
  const isArrived = dispatchStatus === 'arrived_on_scene';
  const unitName = incident.active_dispatch?.team
    ? `Unit ${incident.active_dispatch.team}`
    : 'Response Unit';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 justify-center" edges={['top', 'bottom']}>
      <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/60 items-center">
        <View
          className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${
            isRejected
              ? 'bg-red-50 border-2 border-red-200'
              : isArrived
              ? 'bg-emerald-50 border-2 border-emerald-200'
              : isPending
              ? 'bg-amber-50 border-2 border-amber-200'
              : isVerified
              ? 'bg-blue-50 border-2 border-blue-200'
              : 'bg-indigo-50 border-2 border-indigo-200'
          }`}
        >
          {isRejected ? (
            <XCircle size={36} color="#DC2626" strokeWidth={2.2} />
          ) : isArrived ? (
            <CheckCircle2 size={36} color="#059669" strokeWidth={2.2} />
          ) : isPending ? (
            <Clock size={36} color="#D97706" strokeWidth={2.2} />
          ) : isVerified ? (
            <ShieldCheck size={36} color="#2563EB" strokeWidth={2.2} />
          ) : (
            <Navigation size={36} color="#4F46E5" strokeWidth={2.2} />
          )}
        </View>

        <View
          className={`px-3.5 py-1.5 rounded-full mb-3 ${
            isRejected
              ? 'bg-red-100'
              : isArrived
              ? 'bg-emerald-100'
              : isPending
              ? 'bg-amber-100'
              : isVerified
              ? 'bg-blue-100'
              : 'bg-indigo-100'
          }`}
        >
          <Text
            className={`text-xs font-extrabold uppercase tracking-wider ${
              isRejected
                ? 'text-red-700'
                : isArrived
                ? 'text-emerald-700'
                : isPending
                ? 'text-amber-700'
                : isVerified
                ? 'text-blue-700'
                : 'text-indigo-700'
            }`}
          >
            {isRejected
              ? 'Report Not Approved'
              : isArrived
              ? 'Responders on Scene'
              : isPending
              ? 'Verification in Progress'
              : isVerified
              ? 'Incident Approved'
              : 'Responder Assigned'}
          </Text>
        </View>

        <Text className="text-xl font-black text-slate-900 text-center mb-2">
          {isRejected
            ? 'Tracking Unavailable'
            : isArrived
            ? 'Responders Have Arrived'
            : isPending
            ? 'Waiting for Dispatcher'
            : isVerified
            ? 'Assigning Emergency Unit'
            : 'Preparing for Departure'}
        </Text>

        <Text className="text-sm text-slate-500 text-center leading-relaxed mb-6 px-2">
          {isRejected
            ? incident.rejection_reason
              ? `The dispatcher did not approve this report: "${incident.rejection_reason}".`
              : 'Your report was reviewed by the Dispatcher and not approved for dispatch.'
            : isArrived
            ? `${unitName} has arrived at your reported emergency location. Medical emergency personnel are on site providing assistance.`
            : isPending
            ? 'Your emergency report is currently being reviewed by the Dispatcher. Live GPS tracking unlocks once a team is assigned and en route.'
            : isVerified
            ? 'Your report has been verified and approved by the Dispatcher! Live tracking will unlock the moment the assigned responder departs.'
            : `${unitName} has been assigned and is preparing vehicles and gear. Live tracking activates once they depart.`}
        </Text>

        <View className="w-full bg-slate-50 rounded-2xl p-3.5 flex-row items-center mb-6 border border-slate-100">
          <View className="w-8 h-8 rounded-xl bg-slate-200/70 items-center justify-center mr-3">
            {isArrived ? (
              <CheckCircle2 size={16} color="#059669" />
            ) : (
              <Lock size={16} color="#64748B" />
            )}
          </View>
          <Text className="text-xs text-slate-600 font-medium flex-1 leading-4">
            {isArrived ? (
              <Text>Responders are at your location. Live GPS route tracking has completed.</Text>
            ) : (
              <Text>Live GPS route tracking unlocks automatically when the responder is marked <Text className="font-bold text-slate-800">En Route</Text>.</Text>
            )}
          </Text>
        </View>

        <View className="w-full gap-3">
          <TouchableOpacity
            className="w-full bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-indigo-500/20"
            onPress={onNavigateToReport}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm mr-2">View Incident Progress</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full bg-red-50 border border-red-200 py-3.5 rounded-2xl flex-row items-center justify-center"
            onPress={() => Linking.openURL('tel:+639123456789')}
            activeOpacity={0.85}
          >
            <PhoneCall size={16} color="#DC2626" />
            <Text className="text-red-700 font-bold text-sm ml-2">Call Hotline (911)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full py-2.5 items-center justify-center"
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <RotateCcw size={14} color="#64748B" />
              <Text className="text-slate-500 font-semibold text-xs ml-1.5">Check for updates</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Main Map-First Track Screen ───────────────────────────────────────────────
export default function TrackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const { residentRefreshTrigger } = useResidentAlert();
  const { echo } = useRealtime() as { echo: any };

  // Map & Live Navigation State
  const mapRef = useRef<MapboxGL.Camera>(null);
  const [ambulanceCoords, setAmbulanceCoords] = useState<{
    latitude: number;
    longitude: number;
    heading?: number;
  } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Live Responder Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const haloOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 2.2,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, haloOpacity]);

  // Draggable Bottom Sheet Animation
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const sheetHeightAnim = useRef(new Animated.Value(SHEET_COLLAPSED_HEIGHT)).current;

  const toggleSheet = (expand?: boolean) => {
    const shouldExpand = expand !== undefined ? expand : !isSheetExpanded;
    setIsSheetExpanded(shouldExpand);
    Animated.spring(sheetHeightAnim, {
      toValue: shouldExpand ? SHEET_EXPANDED_HEIGHT : SHEET_COLLAPSED_HEIGHT,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40) {
          toggleSheet(true);
        } else if (gestureState.dy > 40) {
          toggleSheet(false);
        }
      },
    })
  ).current;

  // Fetch Incident Reports
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      const active = incidents.find((inc: any) =>
        ['pending', 'verified', 'assigned', 'responding'].includes(inc.incident_status)
      );
      setActiveIncident(active || null);

      if (active?.active_dispatch?.last_latitude && active?.active_dispatch?.last_longitude) {
        const lat = parseFloat(active.active_dispatch.last_latitude);
        const lng = parseFloat(active.active_dispatch.last_longitude);
        const heading = active.active_dispatch.last_heading
          ? parseFloat(active.active_dispatch.last_heading)
          : undefined;
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          setAmbulanceCoords({ latitude: lat, longitude: lng, heading });
        }
      }
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchIncidents();
    }, [fetchIncidents])
  );

  useEffect(() => {
    fetchIncidents();
  }, [residentRefreshTrigger, fetchIncidents]);

  // Fetch OSRM Route
  const fetchRoute = useCallback(
    async (startLat: number, startLng: number, destLat: number, destLng: number) => {
      try {
        setIsCalculatingRoute(true);
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = decodePolyline(route.geometry);
          setRouteCoords(coords);
          setRouteInfo({
            distance: (route.distance / 1000).toFixed(1) + ' km',
            duration: Math.ceil(route.duration / 60) + ' min',
          });

          // Fit route within camera viewport with generous margins
          if (mapRef.current) {
            const lats = [startLat, ...coords.map((c) => c.latitude), destLat];
            const lngs = [startLng, ...coords.map((c) => c.longitude), destLng];
            const ne = [Math.max(...lngs), Math.max(...lats)];
            const sw = [Math.min(...lngs), Math.min(...lats)];
            mapRef.current.fitBounds(ne, sw, [110, 60, SHEET_COLLAPSED_HEIGHT + BOTTOM_NAV_HEIGHT + 40, 60], 1200);
          }
        }
      } catch (e) {
        console.warn('OSRM Routing Error:', e);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    []
  );

  // Real-time WebSocket Listeners
  useEffect(() => {
    if (!echo || !activeIncident?.id) return;

    const incidentChan = echo.private(`incident.${activeIncident.id}`);
    const residentChan = user?.id ? echo.private(`resident.${user.id}`) : null;
    const dispatchId = activeIncident?.active_dispatch?.id;
    const dispatchChan = dispatchId ? echo.private(`dispatch.${dispatchId}`) : null;

    const handleLocationUpdate = (data: any) => {
      const lat = parseFloat(data.latitude || data.last_latitude);
      const lng = parseFloat(data.longitude || data.last_longitude);
      const heading = data.heading ? parseFloat(data.heading) : undefined;

      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        setAmbulanceCoords((prev) => {
          if (!prev) return { latitude: lat, longitude: lng, heading };
          const dist = getDistance(prev.latitude, prev.longitude, lat, lng);
          const incLat = parseFloat(activeIncident.incident_latitude);
          const incLng = parseFloat(activeIncident.incident_longitude);

          if (dist > 25 && !isNaN(incLat) && !isNaN(incLng)) {
            fetchRoute(lat, lng, incLat, incLng);
          }
          return { latitude: lat, longitude: lng, heading: heading ?? prev.heading };
        });
      }
    };

    const handleLifecycleUpdate = () => {
      fetchIncidents();
    };

    incidentChan.listen('AmbulanceLocationUpdated', handleLocationUpdate);
    incidentChan.listen('.AmbulanceLocationUpdated', handleLocationUpdate);
    incidentChan.listen('DispatchStatusUpdated', handleLifecycleUpdate);
    incidentChan.listen('.DispatchStatusUpdated', handleLifecycleUpdate);
    incidentChan.listen('DispatchCompleted', handleLifecycleUpdate);
    incidentChan.listen('.DispatchCompleted', handleLifecycleUpdate);
    incidentChan.listen('IncidentVerified', handleLifecycleUpdate);
    incidentChan.listen('.IncidentVerified', handleLifecycleUpdate);
    incidentChan.listen('IncidentRejected', handleLifecycleUpdate);
    incidentChan.listen('.IncidentRejected', handleLifecycleUpdate);

    if (residentChan) {
      residentChan.listen('AmbulanceLocationUpdated', handleLocationUpdate);
      residentChan.listen('.AmbulanceLocationUpdated', handleLocationUpdate);
      residentChan.listen('DispatchStatusUpdated', handleLifecycleUpdate);
      residentChan.listen('.DispatchStatusUpdated', handleLifecycleUpdate);
      residentChan.listen('DispatchCompleted', handleLifecycleUpdate);
      residentChan.listen('.DispatchCompleted', handleLifecycleUpdate);
      residentChan.listen('IncidentVerified', handleLifecycleUpdate);
      residentChan.listen('.IncidentVerified', handleLifecycleUpdate);
      residentChan.listen('IncidentRejected', handleLifecycleUpdate);
      residentChan.listen('.IncidentRejected', handleLifecycleUpdate);
    }

    if (dispatchChan) {
      dispatchChan.listen('AmbulanceLocationUpdated', handleLocationUpdate);
      dispatchChan.listen('.AmbulanceLocationUpdated', handleLocationUpdate);
    }

    return () => {
      incidentChan.stopListening('AmbulanceLocationUpdated');
      incidentChan.stopListening('.AmbulanceLocationUpdated');
      incidentChan.stopListening('DispatchStatusUpdated');
      incidentChan.stopListening('.DispatchStatusUpdated');
      incidentChan.stopListening('DispatchCompleted');
      incidentChan.stopListening('.DispatchCompleted');
      incidentChan.stopListening('IncidentVerified');
      incidentChan.stopListening('.IncidentVerified');
      incidentChan.stopListening('IncidentRejected');
      incidentChan.stopListening('.IncidentRejected');

      if (residentChan) {
        residentChan.stopListening('AmbulanceLocationUpdated');
        residentChan.stopListening('.AmbulanceLocationUpdated');
        residentChan.stopListening('DispatchStatusUpdated');
        residentChan.stopListening('.DispatchStatusUpdated');
        residentChan.stopListening('DispatchCompleted');
        residentChan.stopListening('.DispatchCompleted');
        residentChan.stopListening('IncidentVerified');
        residentChan.stopListening('.IncidentVerified');
        residentChan.stopListening('IncidentRejected');
        residentChan.stopListening('.IncidentRejected');
      }

      if (dispatchChan) {
        dispatchChan.stopListening('AmbulanceLocationUpdated');
        dispatchChan.stopListening('.AmbulanceLocationUpdated');
      }
    };
  }, [echo, activeIncident?.id, user?.id, activeIncident?.active_dispatch?.id, fetchIncidents, fetchRoute]);

  // Trigger initial route calculation (only when en_route)
  useEffect(() => {
    if (!activeIncident) return;
    const dispatchStatus =
      activeIncident?.active_dispatch?.dispatch_status || activeIncident?.incident_status;
    const isLive = dispatchStatus === 'en_route';
    if (!isLive) return;

    const incLat = parseFloat(activeIncident.incident_latitude);
    const incLng = parseFloat(activeIncident.incident_longitude);

    if (ambulanceCoords && !isNaN(incLat) && !isNaN(incLng) && incLat !== 0 && incLng !== 0) {
      fetchRoute(ambulanceCoords.latitude, ambulanceCoords.longitude, incLat, incLng);
    }
  }, [
    activeIncident?.id,
    activeIncident?.active_dispatch?.dispatch_status,
    ambulanceCoords?.latitude,
    ambulanceCoords?.longitude,
    fetchRoute,
  ]);

  // Strict Rule Check: Live tracking unlocks ONLY when en_route (Option A: stops completely when arrived)
  const activeDispatch = activeIncident?.active_dispatch;
  const dispatchStatus = activeDispatch?.dispatch_status || activeIncident?.incident_status;
  const isArrived = dispatchStatus === 'arrived_on_scene';
  const isEnRoute = dispatchStatus === 'en_route' && !isArrived;
  const isLiveTracking = isEnRoute;

  // When arrived or not en_route, clear route line and travel ETA immediately
  useEffect(() => {
    if (isArrived || !isEnRoute) {
      setRouteCoords([]);
      setRouteInfo(null);
    }
  }, [isArrived, isEnRoute]);

  // Loading State
  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-slate-500 font-medium">Loading status...</Text>
      </View>
    );
  }

  // All Clear State
  if (!activeIncident) {
    return <AllClearState />;
  }

  if (!isLiveTracking) {
    return (
      <TrackingLockedState
        incident={activeIncident}
        onNavigateToReport={() => router.navigate('/(resident)/report')}
        onRefresh={fetchIncidents}
      />
    );
  }

  // Coordinates
  const incidentLat = parseFloat(activeIncident.incident_latitude);
  const incidentLng = parseFloat(activeIncident.incident_longitude);
  const hasIncidentCoords =
    !isNaN(incidentLat) && !isNaN(incidentLng) && incidentLat !== 0 && incidentLng !== 0;

  const ambLat =
    ambulanceCoords?.latitude ||
    (activeDispatch?.last_latitude ? parseFloat(activeDispatch.last_latitude) : null);
  const ambLng =
    ambulanceCoords?.longitude ||
    (activeDispatch?.last_longitude ? parseFloat(activeDispatch.last_longitude) : null);
  const hasAmbulanceCoords = ambLat !== null && ambLng !== null && !isNaN(ambLat) && !isNaN(ambLng);

  // Unit & Crew Details
  const unitName = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
  const ambulanceDesc =
    activeDispatch?.ambulance?.vehicle_name ||
    activeDispatch?.ambulance?.plate_number ||
    'MDRRMO Vehicle';
  const leaderName = activeDispatch?.team_leader
    ? `${activeDispatch.team_leader.first_name} ${activeDispatch.team_leader.last_name}`
    : activeDispatch?.driver
    ? `${activeDispatch.driver.first_name} ${activeDispatch.driver.last_name}`
    : 'MDRRMO Crew';
  const leaderRole = activeDispatch?.team_leader ? 'Team Leader' : 'Crew Responder';
  const etaDuration = routeInfo?.duration || (isArrived ? 'On Scene' : 'Calculating...');
  const etaDistance = routeInfo?.distance || '';

  // Camera Actions
  const handleRecenterOnResponder = () => {
    if (mapRef.current && hasAmbulanceCoords) {
      mapRef.current.setCamera({
        centerCoordinate: [ambLng!, ambLat!],
        zoomLevel: 16.5,
        animationDuration: 900,
      });
    }
  };

  const handleFitRouteOverview = () => {
    if (mapRef.current && hasIncidentCoords && hasAmbulanceCoords) {
      const lats = [incidentLat, ambLat!];
      const lngs = [incidentLng, ambLng!];
      const ne = [Math.max(...lngs), Math.max(...lats)];
      const sw = [Math.min(...lngs), Math.min(...lats)];
      mapRef.current.fitBounds(
        ne,
        sw,
        [110, 60, SHEET_COLLAPSED_HEIGHT + BOTTOM_NAV_HEIGHT + 40, 60],
        1000
      );
    }
  };

  // Call Responder Flow
  const handleCallResponder = () => {
    setIsLocationModalVisible(true);
  };

  const onAllowLocation = async () => {
    setIsLocationModalVisible(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Linking.openURL('tel:+639123456789');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await callResponderApi(activeIncident.id, location.coords.latitude, location.coords.longitude);
      Linking.openURL('tel:+639123456789');
    } catch (error) {
      Linking.openURL('tel:+639123456789');
    }
  };

  const onDenyLocation = () => {
    setIsLocationModalVisible(false);
    Linking.openURL('tel:+639123456789');
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. FULLSCREEN MAP (PRIMARY FOCUS) ─── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={hasIncidentCoords ? { latitude: incidentLat, longitude: incidentLng } : undefined}
      >
        {/* Dual-Layer Navigation Route Line */}
        {routeCoords.length > 0 && (
          <MapboxGL.ShapeSource
            id="routeSource"
            shape={{
              type: 'LineString',
              coordinates: routeCoords.map((c) => [c.longitude, c.latitude]),
            }}
          >
            {/* Outer Route Border / Casing for High Visibility */}
            <MapboxGL.LineLayer
              id="routeCasing"
              style={{
                lineColor: '#1E40AF',
                lineWidth: 8.5,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.35,
              }}
            />
            {/* Inner Vibrant Navigation Core */}
            <MapboxGL.LineLayer
              id="routeCore"
              style={{
                lineColor: isArrived ? '#059669' : '#2563EB',
                lineWidth: 5.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* ─── 2. EMERGENCY / INCIDENT LOCATION MARKER ─── */}
        {hasIncidentCoords && (
          <MapboxGL.PointAnnotation
            id="incident-marker"
            coordinate={[incidentLng, incidentLat]}
            title="Emergency Location"
          >
            <View style={styles.incidentMarkerContainer}>
              {/* Outer soft ping ring */}
              <View style={styles.incidentPulseRing} />
              {/* Pin Icon */}
              <View style={styles.incidentPinIcon}>
                <AlertTriangle size={17} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              {/* Floating Emergency Badge */}
              <View style={styles.incidentLabelBadge}>
                <Text style={styles.incidentLabelText}>Emergency Scene</Text>
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* ─── 3. HIGH-VISIBILITY RESPONDER PUCK WITH HEADING & PULSE ─── */}
        {hasAmbulanceCoords && (
          <MapboxGL.PointAnnotation
            id="responder-marker"
            coordinate={[ambLng!, ambLat!]}
            title={unitName}
          >
            <View style={styles.responderMarkerContainer}>
              {/* Animated Live Signal Radar Halo */}
              {!isArrived && (
                <Animated.View
                  style={[
                    styles.radarHalo,
                    {
                      transform: [{ scale: pulseAnim }],
                      opacity: haloOpacity,
                    },
                  ]}
                />
              )}

              {/* Main Ambulance Badge */}
              <View
                style={[
                  styles.responderCorePuck,
                  isArrived ? styles.responderPuckArrived : styles.responderPuckEnRoute,
                ]}
              >
                {/* Heading indicator if heading available and en route */}
                {ambulanceCoords?.heading !== undefined && !isArrived ? (
                  <View
                    style={{
                      transform: [{ rotate: `${ambulanceCoords.heading}deg` }],
                    }}
                  >
                    <Navigation size={22} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                ) : (
                  <Text style={{ fontSize: 20 }}>🚑</Text>
                )}
              </View>

              {/* Floating Unit Name Label */}
              <View style={styles.responderLabelPill}>
                <Text style={styles.responderLabelText}>{unitName}</Text>
              </View>
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapView>

      {/* ─── 4. COMPACT TOP STATUS PILL (MINIMAL MAP OVERLAY) ─── */}
      <SafeAreaView
        edges={['top']}
        style={[styles.topOverlayWrapper, { top: Math.max(insets.top, 12) }]}
        pointerEvents="box-none"
      >
        <View style={styles.compactTopPill}>
          <View style={styles.topPillLeft}>
            <View
              style={[
                styles.liveStatusDot,
                isArrived ? styles.dotArrived : styles.dotEnRoute,
              ]}
            />
            <View>
              <Text style={styles.topReportTag}>
                REPORT #{activeIncident.id} • {activeIncident.incident_type?.name?.toUpperCase() || 'EMERGENCY'}
              </Text>
              <Text style={styles.topStatusMain}>
                {isArrived ? 'Responders on Scene' : `${unitName} is on the way`}
              </Text>
            </View>
          </View>

          {/* Compact ETA Chip */}
          <View style={[styles.compactEtaChip, isArrived ? styles.etaChipArrived : styles.etaChipEnRoute]}>
            <Clock size={12} color={isArrived ? '#047857' : '#1D4ED8'} strokeWidth={2.5} />
            <Text style={[styles.compactEtaText, isArrived ? styles.etaTextArrived : styles.etaTextEnRoute]}>
              {etaDuration}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ─── 5. FLOATING ACTION CONTROLS (RIGHT SIDE) ─── */}
      <View
        style={[
          styles.floatingActionGroup,
          { bottom: BOTTOM_NAV_HEIGHT + SHEET_COLLAPSED_HEIGHT + 14 },
        ]}
      >
        {/* Overview Button (Fit Bounds) */}
        <TouchableOpacity
          style={styles.floatingActionBtn}
          onPress={handleFitRouteOverview}
          activeOpacity={0.85}
        >
          <Maximize2 size={18} color="#1E293B" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Re-center on Responder */}
        <TouchableOpacity
          style={[styles.floatingActionBtn, styles.floatingActionBtnPrimary]}
          onPress={handleRecenterOnResponder}
          activeOpacity={0.85}
        >
          <Crosshair size={19} color="#2563EB" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      {/* ─── 6. DRAGGABLE BOTTOM SHEET (MAP-FIRST DETAIL DRAWER) ─── */}
      <Animated.View
        style={[
          styles.bottomSheetContainer,
          {
            height: sheetHeightAnim,
            bottom: BOTTOM_NAV_HEIGHT + 8,
          },
        ]}
      >
        {/* Grabber Handle & Drag Bar */}
        <View {...panResponder.panHandlers} style={styles.sheetHeaderTouchZone}>
          <TouchableOpacity
            style={styles.sheetGrabberWrapper}
            onPress={() => toggleSheet()}
            activeOpacity={0.7}
          >
            <View style={styles.sheetGrabberPill} />
          </TouchableOpacity>

          {/* Collapsed Header Info (Always Visible) */}
          <View style={styles.collapsedHeaderRow}>
            <View style={styles.collapsedUnitInfo}>
              <View style={styles.collapsedIconBox}>
                <Text style={{ fontSize: 18 }}>🚑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collapsedUnitTitle} numberOfLines={1}>
                  {unitName}
                </Text>
                <Text style={styles.collapsedUnitSub} numberOfLines={1}>
                  {isArrived ? 'Arrived on scene' : ambulanceDesc}
                </Text>
              </View>
            </View>

            <View style={styles.collapsedActions}>
              {/* ETA Badge */}
              <View style={styles.collapsedEtaBadge}>
                <Text style={styles.collapsedEtaDuration}>{etaDuration}</Text>
                {etaDistance ? (
                  <Text style={styles.collapsedEtaDistance}>{etaDistance}</Text>
                ) : null}
              </View>

              {/* Expand Toggle Button */}
              <TouchableOpacity
                onPress={() => toggleSheet()}
                style={styles.toggleExpandBtn}
                activeOpacity={0.7}
              >
                {isSheetExpanded ? (
                  <ChevronDown size={18} color="#64748B" />
                ) : (
                  <ChevronUp size={18} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Expanded Drawer Details (Revealed on Swipe Up) */}
        {isSheetExpanded && (
          <ScrollView
            style={styles.expandedContentScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Responder Crew & Direct Call Action */}
            <View style={styles.crewCardRow}>
              <Avatar name={leaderName} size="md" />
              <View style={styles.crewInfoText}>
                <Text style={styles.crewName} numberOfLines={1}>
                  {leaderName}
                </Text>
                <Text style={styles.crewRole}>{leaderRole} • MDRRMO</Text>
              </View>
              <TouchableOpacity
                style={styles.callResponderBtn}
                onPress={handleCallResponder}
                activeOpacity={0.8}
              >
                <Phone size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.callResponderBtnText}>Call</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Mission Meta Grid */}
            <View style={styles.missionGrid}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>INCIDENT TYPE</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {activeIncident.incident_type?.name || 'Emergency'}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>VEHICLE</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {activeDispatch?.ambulance?.vehicle_name || 'Ambulance'}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>PLATE NUMBER</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {activeDispatch?.ambulance?.plate_number || 'Official MDRRMO'}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>STATUS</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: isArrived ? '#059669' : '#2563EB' },
                  ]}
                >
                  {isArrived ? 'ARRIVED ON SCENE' : 'TRAVELING EN ROUTE'}
                </Text>
              </View>
            </View>

            {/* Timeline Component */}
            <View style={styles.timelineSection}>
              <Text style={styles.timelineSectionTitle}>MISSION PROGRESS</Text>
              <TimelineCard
                events={[
                  {
                    time: 'Verified',
                    title: 'Incident Approved',
                    description: 'Dispatcher verified report',
                    active: true,
                  },
                  {
                    time: 'Dispatched',
                    title: 'Unit Assigned',
                    description: `${unitName} assigned to mission`,
                    active: true,
                  },
                  {
                    time: 'En Route',
                    title: 'En Route to Location',
                    description: 'Responders traveling to scene',
                    active: isEnRoute || isArrived,
                  },
                  {
                    time: isArrived ? 'On Scene' : '--:--',
                    title: 'Arrival on Scene',
                    description: isArrived ? 'Responders arrived on scene' : 'Pending arrival',
                    active: isArrived,
                  },
                ]}
              />
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        visible={isLocationModalVisible}
        onAllow={onAllowLocation}
        onDeny={onDenyLocation}
      />
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Incident Marker Styles
  incidentMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentPulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF444433',
    borderWidth: 1.5,
    borderColor: '#EF444466',
  },
  incidentPinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  incidentLabelBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  incidentLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Responder Marker Styles
  responderMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarHalo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F633',
    borderWidth: 1.5,
    borderColor: '#3B82F688',
  },
  responderCorePuck: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  responderPuckEnRoute: {
    backgroundColor: '#2563EB',
  },
  responderPuckArrived: {
    backgroundColor: '#059669',
  },
  responderLabelPill: {
    backgroundColor: '#0F172AEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  responderLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Top Compact Status Pill
  topOverlayWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  compactTopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFFEE',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  liveStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginRight: 10,
  },
  dotEnRoute: {
    backgroundColor: '#2563EB',
  },
  dotArrived: {
    backgroundColor: '#059669',
  },
  topReportTag: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  topStatusMain: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  compactEtaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  etaChipEnRoute: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  etaChipArrived: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  compactEtaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  etaTextEnRoute: {
    color: '#1D4ED8',
  },
  etaTextArrived: {
    color: '#047857',
  },

  // Floating Action Controls
  floatingActionGroup: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 25,
  },
  floatingActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  floatingActionBtnPrimary: {
    backgroundColor: '#F8FAFC',
    borderColor: '#BFDBFE',
  },

  // Draggable Bottom Sheet
  bottomSheetContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 30,
    overflow: 'hidden',
  },
  sheetHeaderTouchZone: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetGrabberWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  sheetGrabberPill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  collapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  collapsedUnitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  collapsedIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  collapsedUnitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  collapsedUnitSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  collapsedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedEtaBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  collapsedEtaDuration: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  collapsedEtaDistance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleExpandBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded Sheet Content
  expandedContentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  crewCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  crewInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  crewName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  crewRole: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  callResponderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  callResponderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Mission Grid
  missionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaBox: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Timeline Section
  timelineSection: {
    marginBottom: 24,
  },
  timelineSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
});
