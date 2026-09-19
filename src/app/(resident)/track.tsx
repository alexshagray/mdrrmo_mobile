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
  Vibration,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import MapboxGL from '@rnmapbox/maps';
import { MapView, Avatar, LocationPermissionModal } from '@/shared/components';
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
  ArrowRight,
  CheckCircle2,
  XCircle,
  Ambulance,
  Radio,
  Check,
} from 'lucide-react-native';
import { getMyReports, callResponderApi } from '@/shared/api/incidents';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';
import { useRealtime, useAuth } from '@/shared/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom navigation bar height (tab bar sits at bottom: 20 with height: 64)
const BOTTOM_NAV_HEIGHT = 84;
const SHEET_COLLAPSED_HEIGHT = 126;
const SHEET_EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.72, 560);

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
          className={`w-20 h-20 rounded-3xl items-center justify-center mb-5 ${
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
          className={`px-3.5 py-1.5 rounded-xl mb-3 ${
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

        <View className="w-full">
          <TouchableOpacity
            className="w-full bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md shadow-indigo-500/20"
            onPress={onNavigateToReport}
            activeOpacity={0.85}
          >
            <Text className="text-white font-bold text-sm mr-2">View Incident Progress</Text>
            <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
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

  // Arrival Alarm & Notification State
  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const arrivalAudioPlayer = useRef<AudioPlayer | null>(null);
  const hasTriggeredArrivalRef = useRef(false);

  const dismissArrivalAlert = useCallback(() => {
    Vibration.cancel();
    if (arrivalAudioPlayer.current) {
      try {
        arrivalAudioPlayer.current.pause();
        if (typeof arrivalAudioPlayer.current.remove === 'function') {
          arrivalAudioPlayer.current.remove();
        }
      } catch (e) {}
      arrivalAudioPlayer.current = null;
    }
    setShowArrivalModal(false);
  }, []);

  const triggerArrivalAlarm = useCallback(async (unitLabel: string) => {
    if (hasTriggeredArrivalRef.current) return;
    hasTriggeredArrivalRef.current = true;
    setShowArrivalModal(true);

    try {
      // 1. Multi-pulse emergency vibration
      Vibration.vibrate([0, 600, 200, 600, 200, 1000]);

      // 2. Schedule immediate system notification
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Responders Arrived on Scene!',
          body: `${unitLabel} has arrived at your reported emergency location.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      }).catch(() => {});

      // 3. Play alarm audio chime
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      const player = createAudioPlayer(require('../../../assets/sounds/alarm.mp3'));
      player.loop = false;
      player.volume = 0.9;
      player.play();
      arrivalAudioPlayer.current = player;
    } catch (e) {
      console.log('Error playing arrival alarm:', e);
    }
  }, []);

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

  // Strict Rule Check: Live tracking unlocks when en_route and stays active on arrival
  const activeDispatch = activeIncident?.active_dispatch;
  const dispatchStatus = activeDispatch?.dispatch_status || activeIncident?.incident_status;
  const isArrived = dispatchStatus === 'arrived_on_scene';
  const isEnRoute = dispatchStatus === 'en_route' && !isArrived;
  const isLiveTracking = isEnRoute || isArrived;

  // Trigger Arrival Alarm and Notification when responder arrives
  useEffect(() => {
    if (isArrived && activeDispatch) {
      const label = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
      triggerArrivalAlarm(label);
    }
  }, [isArrived, activeDispatch?.id, triggerArrivalAlarm]);

  // When arrived or not en_route, clear route polyline immediately
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

  // Unit & Assigned Ambulance Driver Details
  const unitName = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
  const ambulanceDesc =
    activeDispatch?.ambulance?.vehicle_name ||
    activeDispatch?.ambulance?.plate_number ||
    'MDRRMO Vehicle';
  const driverUser = activeDispatch?.driver;
  const driverName = driverUser
    ? `${driverUser.first_name || ''} ${driverUser.last_name || ''}`.trim()
    : 'Ambulance Driver';
  const driverPhone =
    driverUser?.phone_number ||
    activeDispatch?.ambulance?.driver?.phone_number ||
    activeDispatch?.team_leader?.phone_number ||
    '';
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

  // Dial Driver Helper
  const dialDriverNumber = () => {
    if (driverPhone) {
      const cleanNumber = driverPhone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanNumber}`);
    } else {
      Linking.openURL('tel:911');
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
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await callResponderApi(activeIncident.id, location.coords.latitude, location.coords.longitude);
      }
    } catch (error) {
      // ignore
    } finally {
      dialDriverNumber();
    }
  };

  const onDenyLocation = () => {
    setIsLocationModalVisible(false);
    dialDriverNumber();
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
            {/* Ambient Glow Route Layer */}
            <MapboxGL.LineLayer
              id="routeGlow"
              style={{
                lineColor: isArrived ? '#10B981' : '#3B82F6',
                lineWidth: 11,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.28,
              }}
            />
            {/* Outer Route Border / Casing for High Contrast */}
            <MapboxGL.LineLayer
              id="routeCasing"
              style={{
                lineColor: isArrived ? '#064E3B' : '#1E3A8A',
                lineWidth: 7,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.85,
              }}
            />
            {/* Inner Vibrant Navigation Core */}
            <MapboxGL.LineLayer
              id="routeCore"
              style={{
                lineColor: isArrived ? '#34D399' : '#60A5FA',
                lineWidth: 4.5,
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
              <MapPin size={34} color="#DC2626" fill="#DC2626" strokeWidth={1.5} />
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
              {ambulanceCoords?.heading !== undefined && !isArrived ? (
                <View
                  style={{
                    transform: [{ rotate: `${ambulanceCoords.heading}deg` }],
                  }}
                >
                  <Navigation
                    size={32}
                    color={isArrived ? '#059669' : '#2563EB'}
                    fill={isArrived ? '#059669' : '#2563EB'}
                  />
                </View>
              ) : (
                <Ambulance
                  size={34}
                  color={isArrived ? '#059669' : '#2563EB'}
                  strokeWidth={2.4}
                />
              )}

              {/* Floating Unit Name Label */}
              <View style={styles.responderLabelPill}>
                <View style={styles.responderLiveDot} />
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
            <View style={{ flex: 1 }}>
              <View style={styles.topReportTagRow}>
                <Text style={styles.topReportTag}>
                  REPORT #{activeIncident.id}
                </Text>
                <View style={styles.topTypeBadge}>
                  <Text style={styles.topTypeText}>
                    {activeIncident.incident_type?.name?.toUpperCase() || 'EMERGENCY'}
                  </Text>
                </View>
              </View>
              <Text style={styles.topStatusMain} numberOfLines={1}>
                {isArrived ? 'Responders on Scene' : `${unitName} is on the way`}
              </Text>
            </View>
          </View>

          {/* Compact Status Chip (Live GPS Status, No Inaccurate Duration) */}
          <View style={[styles.compactEtaChip, isArrived ? styles.etaChipArrived : styles.etaChipEnRoute]}>
            {isArrived ? (
              <CheckCircle2 size={12} color="#047857" strokeWidth={2.5} />
            ) : (
              <Navigation size={12} color="#1D4ED8" strokeWidth={2.5} />
            )}
            <Text style={[styles.compactEtaText, isArrived ? styles.etaTextArrived : styles.etaTextEnRoute]}>
              {isArrived ? 'ON SCENE' : 'EN ROUTE'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ─── 5. FLOATING ACTION CONTROLS (RIGHT SIDE) ─── */}
      <View
        style={[
          styles.floatingActionGroup,
          { bottom: BOTTOM_NAV_HEIGHT + SHEET_COLLAPSED_HEIGHT + 16 },
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

      {/* ─── 6. DRAGGABLE BOTTOM SHEET (MAP-FIRST DETAIL DRAWER & MESSAGE MODAL) ─── */}
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
                <Ambulance size={22} color="#2563EB" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.collapsedUnitTitle} numberOfLines={1}>
                  {unitName}
                </Text>
                <Text style={styles.collapsedUnitSub} numberOfLines={1}>
                  {isArrived ? 'Arrived on scene' : `${ambulanceDesc} • En Route`}
                </Text>
              </View>
            </View>

            <View style={styles.collapsedActions}>
              {/* Live Status & Distance Badge (No Inaccurate Duration) */}
              <View style={styles.collapsedEtaBadge}>
                <Text style={styles.collapsedEtaDuration}>{isArrived ? 'ON SCENE' : 'EN ROUTE'}</Text>
                <Text style={styles.collapsedEtaDistance}>
                  {isArrived ? 'Responders Here' : etaDistance ? `${etaDistance} away` : 'Live GPS'}
                </Text>
              </View>

              {/* Expand Toggle Button */}
              <TouchableOpacity
                onPress={() => toggleSheet()}
                style={styles.toggleExpandBtn}
                activeOpacity={0.7}
              >
                {isSheetExpanded ? (
                  <ChevronDown size={18} color="#475569" strokeWidth={2.4} />
                ) : (
                  <ChevronUp size={18} color="#475569" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Expanded Drawer Details (Revealed on Swipe Up or Tap) */}
        {isSheetExpanded && (
          <ScrollView
            style={styles.expandedContentScroll}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* 1. ASSIGNED AMBULANCE DRIVER & DIRECT CALL ACTION */}
            <View style={styles.crewCardRow}>
              <View style={styles.crewAvatarBox}>
                <Avatar name={driverName} size="md" />
              </View>
              <View style={styles.crewInfoText}>
                <Text style={styles.crewName} numberOfLines={1}>
                  {driverName}
                </Text>
                <Text style={styles.crewRole} numberOfLines={1}>
                  Ambulance Driver • {activeDispatch?.ambulance?.plate_number || unitName}
                </Text>
                {driverPhone ? (
                  <Text style={styles.driverPhoneText} numberOfLines={1}>
                    {driverPhone}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.callResponderBtn}
                onPress={handleCallResponder}
                activeOpacity={0.85}
              >
                <Phone size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.callResponderBtnText}>Call Driver</Text>
              </TouchableOpacity>
            </View>

            {/* 2. QUICK MISSION META TILES (Expanded space, all text clearly visible) */}
            <View style={styles.missionGrid}>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>INCIDENT TYPE</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {activeIncident.incident_type?.name || 'Emergency'}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>ASSIGNED UNIT</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {unitName}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>VEHICLE / PLATE</Text>
                <Text style={styles.metaValue} numberOfLines={2}>
                  {activeDispatch?.ambulance?.vehicle_name || 'Ambulance'}
                  {activeDispatch?.ambulance?.plate_number ? ` (${activeDispatch.ambulance.plate_number})` : ''}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Text style={styles.metaLabel}>MISSION STATUS</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: isArrived ? '#059669' : '#2563EB' },
                  ]}
                  numberOfLines={2}
                >
                  {isArrived ? 'Arrived on Scene' : 'Traveling En Route'}
                </Text>
              </View>
            </View>

            {/* 4. MISSION PROGRESS MILESTONES (Sleek Connected Milestone Cards, NO generic circles) */}
            <View style={styles.milestonesSection}>
              <View style={styles.milestonesSectionHeader}>
                <Text style={styles.milestonesSectionTitle}>MISSION PROGRESS</Text>
                <Text style={styles.milestonesSectionSub}>
                  {isArrived ? '4 of 4 Steps Complete' : isEnRoute ? '3 of 4 Steps Complete' : '2 of 4 Steps Complete'}
                </Text>
              </View>

              <View style={styles.milestonesList}>
                {[
                  {
                    step: 1,
                    title: 'Incident Verified & Approved',
                    desc: 'Command Center reviewed and verified report',
                    status: 'Completed',
                    done: true,
                    active: false,
                    icon: ShieldCheck,
                  },
                  {
                    step: 2,
                    title: `${unitName} Dispatched`,
                    desc: 'Emergency response vehicle assigned with crew',
                    status: 'Completed',
                    done: true,
                    active: false,
                    icon: Ambulance,
                  },
                  {
                    step: 3,
                    title: 'En Route to Location',
                    desc: isArrived ? 'Transit completed' : 'Responders traveling to scene with sirens',
                    status: isArrived ? 'Completed' : 'Live Now',
                    done: isArrived,
                    active: isEnRoute,
                    icon: Navigation,
                  },
                  {
                    step: 4,
                    title: 'Arrival on Scene',
                    desc: isArrived ? 'Responders arrived on scene providing assistance' : 'Approaching destination',
                    status: isArrived ? 'Completed' : 'Pending',
                    done: isArrived,
                    active: isArrived,
                    icon: CheckCircle2,
                  },
                ].map((item, idx, arr) => {
                  const IconComp = item.icon;
                  const isLast = idx === arr.length - 1;
                  const isCurrent = item.active;
                  const isDone = item.done;

                  return (
                    <View key={item.step} style={styles.milestoneRow}>
                      <View style={styles.milestoneLeftCol}>
                        <View
                          style={[
                            styles.milestoneIconBox,
                            isDone
                              ? styles.milestoneBoxDone
                              : isCurrent
                              ? styles.milestoneBoxCurrent
                              : styles.milestoneBoxPending,
                          ]}
                        >
                          <IconComp
                            size={14}
                            color={isDone ? '#FFFFFF' : isCurrent ? '#2563EB' : '#94A3B8'}
                            strokeWidth={2.4}
                          />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.milestoneLine,
                              isDone ? styles.milestoneLineDone : styles.milestoneLinePending,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.milestoneContent}>
                        <View style={styles.milestoneTitleRow}>
                          <Text
                            style={[
                              styles.milestoneTitle,
                              isDone || isCurrent ? styles.milestoneTitleActive : styles.milestoneTitleMuted,
                            ]}
                          >
                            {item.title}
                          </Text>
                          <View
                            style={[
                              styles.milestoneTag,
                              isDone
                                ? styles.milestoneTagDone
                                : isCurrent
                                ? styles.milestoneTagCurrent
                                : styles.milestoneTagPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.milestoneTagText,
                                isDone
                                  ? styles.milestoneTagTextDone
                                  : isCurrent
                                  ? styles.milestoneTagTextCurrent
                                  : styles.milestoneTagTextPending,
                              ]}
                            >
                              {item.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.milestoneDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {/* ─── 7. RESPONDER ARRIVAL ALARM & NOTIFICATION MODAL ─── */}
      {showArrivalModal && (
        <View style={styles.arrivalAlertOverlay}>
          <View style={styles.arrivalAlertCard}>
            <View style={styles.arrivalAlertIconBox}>
              <Ambulance size={34} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <Text style={styles.arrivalAlertTitle}>RESPONDERS ON SCENE!</Text>
            <Text style={styles.arrivalAlertSubtitle}>
              {unitName} has arrived at your reported emergency location. Medical personnel are on site providing assistance.
            </Text>
            <TouchableOpacity
              style={styles.arrivalAlertActionBtn}
              onPress={dismissArrivalAlert}
              activeOpacity={0.85}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.arrivalAlertActionBtnText}>I See Them / Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    borderRadius: 16,
    backgroundColor: '#EF444425',
    borderWidth: 1.5,
    borderColor: '#EF444455',
  },
  incidentPinIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 7,
  },
  incidentPinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#DC2626',
    marginTop: -1,
  },
  incidentLabelBadge: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
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
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#3B82F633',
    borderWidth: 1.5,
    borderColor: '#3B82F688',
  },
  responderCorePuck: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172AF0',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 5,
  },
  responderLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
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
    backgroundColor: '#FFFFFFFA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
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
  topReportTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  topReportTag: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  topTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  topTypeText: {
    color: '#1E40AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 12,
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
    borderRadius: 14,
    backgroundColor: '#FFFFFFF2',
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
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
    zIndex: 30,
    overflow: 'hidden',
  },
  sheetHeaderTouchZone: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetGrabberWrapper: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  sheetGrabberPill: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  unitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collapsedUnitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  unitLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  unitBadgeEnRoute: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  unitBadgeArrived: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  unitBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  badgeDotEnRoute: {
    backgroundColor: '#2563EB',
  },
  badgeDotArrived: {
    backgroundColor: '#059669',
  },
  unitBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeTextEnRoute: {
    color: '#1D4ED8',
  },
  badgeTextArrived: {
    color: '#047857',
  },
  collapsedUnitSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  collapsedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedEtaBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedEtaDuration: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  collapsedEtaDistance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleExpandBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Expanded Content Scroll
  expandedContentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // 1. Crew Card Row
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
  crewAvatarBox: {
    borderRadius: 14,
    overflow: 'hidden',
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
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  driverPhoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  callResponderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 13,
    gap: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  callResponderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // 2. Mission Meta Grid
  missionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaBox: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 70,
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    lineHeight: 16,
  },

  // 4. Milestones Section
  milestonesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  milestonesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  milestonesSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  milestonesSectionSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  milestonesList: {
    gap: 0,
  },
  milestoneRow: {
    flexDirection: 'row',
  },
  milestoneLeftCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 32,
  },
  milestoneIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneBoxDone: {
    backgroundColor: '#059669',
  },
  milestoneBoxCurrent: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  milestoneBoxPending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  milestoneLine: {
    width: 2,
    height: 28,
    marginVertical: 2,
  },
  milestoneLineDone: {
    backgroundColor: '#059669',
  },
  milestoneLinePending: {
    backgroundColor: '#E2E8F0',
  },
  milestoneContent: {
    flex: 1,
    paddingBottom: 16,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  milestoneTitleActive: {
    color: '#0F172A',
  },
  milestoneTitleMuted: {
    color: '#94A3B8',
  },
  milestoneTag: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  milestoneTagDone: {
    backgroundColor: '#ECFDF5',
  },
  milestoneTagCurrent: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  milestoneTagPending: {
    backgroundColor: '#F8FAFC',
  },
  milestoneTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  milestoneTagTextDone: {
    color: '#059669',
  },
  milestoneTagTextCurrent: {
    color: '#2563EB',
  },
  milestoneTagTextPending: {
    color: '#94A3B8',
  },
  milestoneDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },

  // 6. Arrival Alert Modal
  arrivalAlertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    paddingHorizontal: 24,
  },
  arrivalAlertCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  arrivalAlertIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  arrivalAlertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  arrivalAlertSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  arrivalAlertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  arrivalAlertActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
