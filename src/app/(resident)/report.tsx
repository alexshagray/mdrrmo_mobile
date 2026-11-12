import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header, BrandBackground, CancelConfirmationModal } from '@/shared/components';
import * as Location from 'expo-location';
import { resolveAddressFromCoords } from '@/shared/utils/location';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Image,
  Modal,
  Linking,
} from 'react-native';
import {
  AlertCircle,
  Camera,
  MapPin,
  Clock,
  Stethoscope,
  Flame,
  Car,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  CircleCheck,
  Send,
  XCircle,
  RotateCcw,
  Ambulance,
  Lock,
  PhoneCall,
  AlertTriangle,
  Timer,
  Settings,
  Check,
  LifeBuoy,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  submitEmergencyReport,
  getMyReports,
  cancelEmergencyReport,
  updateReporterLocation,
  getIncidentTypesApi,
} from '@/shared/api/incidents';
import { locationService } from '@/shared/services/locationService';
import { useAuth } from '@/shared/auth/authContext';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';
import { useRealtime } from '@/shared/hooks';

// ─── Emergency type config ────────────────────────────────────────────────────
export interface EmergencyTypeItem {
  id: number;
  label: string;
  icon: any;
  color: string;
  bg: string;
  activeBg: string;
  description?: string;
}

const DEFAULT_TYPES: EmergencyTypeItem[] = [
  {
    id: 1,
    label: 'Medical',
    icon: Stethoscope,
    color: '#059669',
    bg: '#ECFDF5',
    activeBg: '#059669',
  },
  {
    id: 2,
    label: 'Fire',
    icon: Flame,
    color: '#EA580C',
    bg: '#FFF7ED',
    activeBg: '#EA580C',
  },
  {
    id: 3,
    label: 'Accident',
    icon: Car,
    color: '#D97706',
    bg: '#FFFBEB',
    activeBg: '#D97706',
  },
  {
    id: 4,
    label: 'Crime',
    icon: ShieldAlert,
    color: '#7C3AED',
    bg: '#F5F3FF',
    activeBg: '#7C3AED',
  },
  {
    id: 5,
    label: 'Search & Rescue',
    icon: LifeBuoy,
    color: '#2563EB',
    bg: '#EFF6FF',
    activeBg: '#2563EB',
  },
];

const resolveTypeVisual = (name: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('medic') || lower.includes('health') || lower.includes('trauma')) {
    return { icon: Stethoscope, color: '#059669', bg: '#ECFDF5', activeBg: '#059669', defaultLabel: 'Medical' };
  }
  if (lower.includes('fire')) {
    return { icon: Flame, color: '#EA580C', bg: '#FFF7ED', activeBg: '#EA580C', defaultLabel: 'Fire' };
  }
  if (lower.includes('accident') || lower.includes('vehic') || lower.includes('crash') || lower.includes('traffic')) {
    return { icon: Car, color: '#D97706', bg: '#FFFBEB', activeBg: '#D97706', defaultLabel: 'Accident' };
  }
  if (lower.includes('crime') || lower.includes('violen') || lower.includes('assault')) {
    return { icon: ShieldAlert, color: '#7C3AED', bg: '#F5F3FF', activeBg: '#7C3AED', defaultLabel: 'Crime' };
  }
  if (lower.includes('search') || lower.includes('rescue') || lower.includes('drown') || lower.includes('water')) {
    return { icon: LifeBuoy, color: '#2563EB', bg: '#EFF6FF', activeBg: '#2563EB', defaultLabel: 'Search & Rescue' };
  }
  return { icon: AlertTriangle, color: '#0284C7', bg: '#F0F9FF', activeBg: '#0284C7', defaultLabel: name };
};

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {required && <Text style={styles.requiredDot}> *</Text>}
    </View>
  );
}

// ─── Type Card (Responsive 2-column Grid) ─────────────────────────────────────
function TypeCard({
  type,
  selected,
  onPress,
}: {
  type: EmergencyTypeItem;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const IconComponent = type.icon;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 35 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25 }).start();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.typeCard,
          selected
            ? {
                backgroundColor: type.activeBg,
                borderColor: type.activeBg,
                shadowColor: type.activeBg,
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }
            : {
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              },
        ]}
      >
        <View
          style={[
            styles.typeCardIconContainer,
            { backgroundColor: selected ? 'rgba(255, 255, 255, 0.22)' : type.bg },
          ]}
        >
          <IconComponent
            size={20}
            color={selected ? '#FFFFFF' : type.color}
            strokeWidth={2.4}
          />
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.typeCardLabel,
            { color: selected ? '#FFFFFF' : '#0F172A' },
          ]}
        >
          {type.label}
        </Text>

        {selected && (
          <View style={styles.typeCardCheck}>
            <Check size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const TypeChip = TypeCard;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState(1);
  const [emergencyTypes, setEmergencyTypes] = useState<EmergencyTypeItem[]>(DEFAULT_TYPES);
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMetadata, setPhotoMetadata] = useState<{
    latitude: number;
    longitude: number;
    locationName: string;
    capturedAt: string;
    formattedDateTime: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingReport, setIsCancellingReport] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { residentRefreshTrigger } = useResidentAlert();
  const { echo } = useRealtime() as { echo: any };

  const handleConfirmCancel = async () => {
    if (!activeIncident?.id) return;
    try {
      setIsCancellingReport(true);
      await cancelEmergencyReport(activeIncident.id);
      setShowCancelModal(false);
      Alert.alert('Request Cancelled', 'Your emergency request has been cancelled.');
      setActiveIncident(null);
      fetchIncidents();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setIsCancellingReport(false);
    }
  };

  const [dismissedRejectedIds, setDismissedRejectedIds] = useState<number[]>([]);
  const [isDismissedLoaded, setIsDismissedLoaded] = useState(false);
  const [suspension, setSuspension] = useState<{
    is_suspended: boolean;
    suspended_until: string | null;
    prank_count: number;
    total_rejected_count?: number;
  } | null>(null);
  const [verification, setVerification] = useState<{
    verification_status: string;
    is_verified: boolean;
    missing_fields: string[];
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  const isUnverified = verification
    ? !verification.is_verified
    : user?.verification_status === 'Pending';

  const allIncidentsRef = useRef<any[]>([]);
  const dismissedRejectedIdsRef = useRef<number[]>([]);
  const userDismissedRejectionInSessionRef = useRef<boolean>(false);

  const DISMISSED_KEY = `@mdrrmo_dismissed_rejected_${user?.id || 'guest'}`;

  // Load persisted dismissed rejection IDs on mount / user change
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(DISMISSED_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const numericList = parsed.map(Number);
            dismissedRejectedIdsRef.current = numericList;
            setDismissedRejectedIds(numericList);
          }
        }
      } catch (err) {
        console.warn('Failed to load dismissed rejected incidents:', err);
      } finally {
        if (isMounted) setIsDismissedLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.id, DISMISSED_KEY]);

  // Fetch incident types dynamically from server
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const types = await getIncidentTypesApi();
        if (isMounted && Array.isArray(types) && types.length > 0) {
          const mapped: EmergencyTypeItem[] = types.map((t: any) => {
            const visual = resolveTypeVisual(t.incident_type_name);
            return {
              id: t.id,
              label: t.incident_type_name?.length > 18 ? visual.defaultLabel : t.incident_type_name,
              icon: visual.icon,
              color: visual.color,
              bg: visual.bg,
              activeBg: visual.activeBg,
              description: t.type_description,
            };
          });
          setEmergencyTypes(mapped);
        }
      } catch (err) {
        console.warn('Failed to fetch emergency types, using defaults:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismissRejection = async () => {
    // 1. Immediately dismiss from view so the emergency report form renders instantly
    userDismissedRejectionInSessionRef.current = true;
    setActiveIncident(null);

    // 2. Collect ALL rejected incidents currently in the resident's history and persist them
    try {
      const historyRejectedIds = allIncidentsRef.current
        .filter((inc: any) => inc.incident_status === 'rejected')
        .map((inc: any) => Number(inc.id));

      if (activeIncident?.id) {
        historyRejectedIds.push(Number(activeIncident.id));
      }

      const updated = Array.from(new Set([
        ...dismissedRejectedIdsRef.current,
        ...historyRejectedIds,
      ]));

      dismissedRejectedIdsRef.current = updated;
      setDismissedRejectedIds(updated);
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save dismissed rejection:', e);
    }
  };

  const handleCallHotline = (number: string, serviceName: string) => {
    Alert.alert(
      `Call ${serviceName}`,
      `Dial ${number} to speak directly with MDRRMO emergency command center?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'default',
          onPress: () => Linking.openURL(`tel:${number}`),
        },
      ]
    );
  };

  const fetchIncidents = useCallback(async () => {
    if (!user || user.role !== 'resident') return;
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      allIncidentsRef.current = incidents;

      // Update suspension state from API
      if (res?.suspension) {
        setSuspension(res.suspension);
      } else {
        setSuspension(null);
      }

      // Update verification state from API
      if (res?.verification) {
        setVerification(res.verification);
      }

      // 1. Look for active ongoing missions (pending, verified, assigned, responding)
      const ongoingActive = incidents.find((inc: any) => {
        if (['resolved', 'cancelled', 'rejected'].includes(inc.incident_status)) {
          return false;
        }

        if (Array.isArray(inc.dispatches) && inc.dispatches.length > 0) {
          const hasLiveDispatch = inc.dispatches.some((d: any) =>
            ['assigned', 'accepted', 'en_route', 'arrived_on_scene'].includes(d.dispatch_status)
          );
          const hasCancelledDispatch = inc.dispatches.some((d: any) => d.dispatch_status === 'cancelled');

          if (hasCancelledDispatch && !hasLiveDispatch) {
            return false;
          }
        }

        if (['assigned', 'responding'].includes(inc.incident_status)) {
          if (
            inc.active_dispatch &&
            ['assigned', 'accepted', 'en_route', 'arrived_on_scene'].includes(
              inc.active_dispatch.dispatch_status
            )
          ) {
            return true;
          }
          return false;
        }

        return ['pending', 'verified'].includes(inc.incident_status);
      });

      if (ongoingActive) {
        userDismissedRejectionInSessionRef.current = false;
        setActiveIncident(ongoingActive);
        return;
      }

      // 2. If the resident explicitly dismissed rejection in this session, keep report form visible
      if (userDismissedRejectionInSessionRef.current) {
        setActiveIncident(null);
        return;
      }

      // 3. Only check if the latest report (incidents[0]) was rejected AND was not yet dismissed
      // Older rejected reports in history are logs and MUST NEVER block the report form
      const latestIncident = incidents[0];
      const isLatestRejected = latestIncident?.incident_status === 'rejected';
      const isAlreadyDismissed = latestIncident && dismissedRejectedIdsRef.current.includes(Number(latestIncident.id));

      if (isLatestRejected && !isAlreadyDismissed) {
        setActiveIncident(latestIncident);
      } else {
        setActiveIncident(null);
      }
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Countdown timer for 24-hour suspension
  useEffect(() => {
    if (!suspension?.is_suspended || !suspension?.suspended_until) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const targetTime = new Date(suspension.suspended_until!).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        fetchIncidents();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    };

    calculateRemaining();
    const timer = setInterval(calculateRemaining, 1000);

    return () => clearInterval(timer);
  }, [suspension?.is_suspended, suspension?.suspended_until, fetchIncidents]);

  // Location Tracking for Active Incident
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (activeIncident?.id && ['pending', 'verified', 'assigned', 'responding'].includes(activeIncident.incident_status)) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted' || !isMounted) return;

          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 20, // update every 20 meters
              timeInterval: 15000, // or every 15 seconds
            },
            async (loc) => {
              if (!isMounted) return;
              try {
                await updateReporterLocation(
                  activeIncident.id,
                  loc.coords.latitude,
                  loc.coords.longitude
                );
              } catch (err) {
                console.warn('Failed to update live location', err);
              }
            }
          );

          if (isMounted) {
            locationSubscription = sub;
          } else {
            sub.remove();
          }
        } catch (err) {
          console.warn('Error starting incident location tracking:', err);
        }
      })();
    }

    return () => {
      isMounted = false;
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [activeIncident?.id, activeIncident?.incident_status]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchIncidents();
    }, [fetchIncidents])
  );

  // Auto-refresh when WebSocket alerts arrive
  useEffect(() => {
    fetchIncidents();
  }, [residentRefreshTrigger, fetchIncidents]);

  // Real-time Echo listeners for all lifecycle changes (verified, rejected, assigned, en_route, completed)
  useEffect(() => {
    if (!echo) return;

    const handleRefresh = () => {
      console.log('ReportScreen received real-time event, refreshing incidents...');
      fetchIncidents();
    };

    let residentChannel: any = null;
    if (user?.id) {
      residentChannel = echo.private(`resident.${user.id}`);
      residentChannel.listen('IncidentVerified', handleRefresh);
      residentChannel.listen('.IncidentVerified', handleRefresh);
      residentChannel.listen('IncidentRejected', handleRefresh);
      residentChannel.listen('.IncidentRejected', handleRefresh);
      residentChannel.listen('DispatchCreated', handleRefresh);
      residentChannel.listen('.DispatchCreated', handleRefresh);
      residentChannel.listen('DispatchAccepted', handleRefresh);
      residentChannel.listen('.DispatchAccepted', handleRefresh);
      residentChannel.listen('DispatchStatusUpdated', handleRefresh);
      residentChannel.listen('.DispatchStatusUpdated', handleRefresh);
      residentChannel.listen('DispatchCompleted', handleRefresh);
      residentChannel.listen('.DispatchCompleted', handleRefresh);
    }

    let incidentChannel: any = null;
    if (activeIncident?.id) {
      incidentChannel = echo.private(`incident.${activeIncident.id}`);
      incidentChannel.listen('IncidentVerified', handleRefresh);
      incidentChannel.listen('.IncidentVerified', handleRefresh);
      incidentChannel.listen('IncidentRejected', handleRefresh);
      incidentChannel.listen('.IncidentRejected', handleRefresh);
      incidentChannel.listen('DispatchCreated', handleRefresh);
      incidentChannel.listen('.DispatchCreated', handleRefresh);
      incidentChannel.listen('DispatchAccepted', handleRefresh);
      incidentChannel.listen('.DispatchAccepted', handleRefresh);
      incidentChannel.listen('DispatchStatusUpdated', handleRefresh);
      incidentChannel.listen('.DispatchStatusUpdated', handleRefresh);
      incidentChannel.listen('DispatchCompleted', handleRefresh);
      incidentChannel.listen('.DispatchCompleted', handleRefresh);
    }

    return () => {
      if (residentChannel) {
        residentChannel.stopListening('IncidentVerified');
        residentChannel.stopListening('.IncidentVerified');
        residentChannel.stopListening('IncidentRejected');
        residentChannel.stopListening('.IncidentRejected');
        residentChannel.stopListening('DispatchCreated');
        residentChannel.stopListening('.DispatchCreated');
        residentChannel.stopListening('DispatchAccepted');
        residentChannel.stopListening('.DispatchAccepted');
        residentChannel.stopListening('DispatchStatusUpdated');
        residentChannel.stopListening('.DispatchStatusUpdated');
        residentChannel.stopListening('DispatchCompleted');
        residentChannel.stopListening('.DispatchCompleted');
      }
      if (incidentChannel) {
        incidentChannel.stopListening('IncidentVerified');
        incidentChannel.stopListening('.IncidentVerified');
        incidentChannel.stopListening('IncidentRejected');
        incidentChannel.stopListening('.IncidentRejected');
        incidentChannel.stopListening('DispatchCreated');
        incidentChannel.stopListening('.DispatchCreated');
        incidentChannel.stopListening('DispatchAccepted');
        incidentChannel.stopListening('.DispatchAccepted');
        incidentChannel.stopListening('DispatchStatusUpdated');
        incidentChannel.stopListening('.DispatchStatusUpdated');
        incidentChannel.stopListening('DispatchCompleted');
        incidentChannel.stopListening('.DispatchCompleted');
      }
    };
  }, [echo, user?.id, activeIncident?.id, fetchIncidents]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.65,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);

      // Immediately capture location and timestamp when photo is taken
      const captureTime = new Date();
      const capturedAtIso = captureTime.toISOString();
      const formattedDateTime = captureTime.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Default fallback coordinates from locationService
      let photoLat = 0;
      let photoLng = 0;
      let locationName = 'Resolving location...';

      try {
        const loc = await locationService.getCurrentLocation();
        if (loc?.coords) {
          photoLat = loc.coords.latitude;
          photoLng = loc.coords.longitude;
          try {
            locationName = await resolveAddressFromCoords(photoLat, photoLng);
          } catch (geocodingErr) {
            console.warn('Geocoding error for photo:', geocodingErr);
            locationName = `Location (${photoLat.toFixed(4)}, ${photoLng.toFixed(4)})`;
          }
        }
      } catch (locErr) {
        console.warn('Error fetching location for photo:', locErr);
      }

      setPhotoMetadata({
        latitude: photoLat,
        longitude: photoLng,
        locationName: locationName || 'Current Location',
        capturedAt: capturedAtIso,
        formattedDateTime,
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setPhotoMetadata(null);
  };

  const handleSubmit = async () => {
    if (suspension?.is_suspended && timeRemaining) {
      Alert.alert(
        'Reporting Privileges Suspended',
        'Your reporting privileges are temporarily suspended due to 3 rejected reports. In an immediate life-threatening emergency, call the hotline directly.'
      );
      return;
    }

    if (isUnverified) {
      Alert.alert(
        'Profile Verification Required',
        'Complete your personal information to unlock the accident reporting feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => router.push('/(resident)/personal-info') },
        ]
      );
      return;
    }

    if (!photoUri) {
      Alert.alert(
        'Photo Required',
        'Please provide a photo of the emergency situation before submitting your report.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get current location exactly at submission time
      const currentLoc = await locationService.getCurrentLocation();
      if (!currentLoc) {
        Alert.alert(
          'Location Required',
          'We could not determine your location. Please ensure location services are enabled.'
        );
        setIsSubmitting(false);
        return;
      }

      const { latitude, longitude } = currentLoc.coords;

      // Automatically resolve real address/place name from coordinates
      let resolvedAddress = '';
      try {
        resolvedAddress = await resolveAddressFromCoords(latitude, longitude);
      } catch (err) {
        console.log('Error resolving address in report:', err);
      }

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('incident_type_id', selectedType.toString());
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('reporter_latitude', latitude.toString());
      formData.append('reporter_longitude', longitude.toString());
      formData.append('reported_at', new Date().toISOString());
      if (resolvedAddress) {
        formData.append('address', resolvedAddress);
      }
      if (description.trim()) {
        formData.append('description', description);
      }
      
      // Append photo
      const filename = photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type,
      } as any);

      // Append photo metadata (exact coordinates, reverse geocoded address, capture timestamp)
      if (photoMetadata) {
        if (photoMetadata.latitude) {
          formData.append('photo_latitude', photoMetadata.latitude.toString());
        }
        if (photoMetadata.longitude) {
          formData.append('photo_longitude', photoMetadata.longitude.toString());
        }
        if (photoMetadata.locationName) {
          formData.append('photo_location_name', photoMetadata.locationName);
        }
        if (photoMetadata.capturedAt) {
          formData.append('photo_captured_at', photoMetadata.capturedAt);
        }
      }

      // 3. Submit
      await submitEmergencyReport(formData);
      
      setShowSuccessModal(true);
    } catch (e: any) {
      console.error(e);
      if (e?.response?.status === 403 && (e?.response?.data?.verification_status === 'Pending' || e?.response?.data?.message?.includes('personal information'))) {
        Alert.alert(
          'Profile Verification Required',
          e?.response?.data?.message || 'Complete your personal information to unlock the accident reporting feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Complete Profile', onPress: () => router.push('/(resident)/personal-info') },
          ]
        );
      } else {
        Alert.alert(
          'Submission Failed',
          e?.response?.data?.message || 'Make sure you have an active internet connection to submit the photo and report.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state
  if (isLoading || !isDismissedLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // ── Standby / active incident state
  if (activeIncident) {
    const incidentStatus = activeIncident.incident_status;
    const activeDispatch = activeIncident.active_dispatch;
    const dispatchStatus = activeDispatch?.dispatch_status || incidentStatus;

    const isPending = incidentStatus === 'pending';
    const isVerified = incidentStatus === 'verified';
    const isCancelled = incidentStatus === 'cancelled';
    const isAssigned = incidentStatus === 'assigned' || dispatchStatus === 'assigned' || dispatchStatus === 'accepted';
    const isArrived = dispatchStatus === 'arrived_on_scene';
    const isEnRoute = dispatchStatus === 'en_route';
    const isRejected = incidentStatus === 'rejected';
    const canCancel = (isPending || isVerified) && !isAssigned && !isEnRoute && !isArrived && !isCancelled && !isRejected;

    const unitName = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
    const vehicleDesc = activeDispatch?.ambulance?.vehicle_name || activeDispatch?.ambulance?.plate_number || 'MDRRMO Vehicle';
    const crewLeaderUser = activeDispatch?.team_leader || activeDispatch?.driver;
    const crewLeaderBadge = crewLeaderUser?.badge_number || crewLeaderUser?.badge_id || crewLeaderUser?.responder_profile?.badge_number || (crewLeaderUser?.id ? `RSP-${String(crewLeaderUser.id).padStart(4, '0')}` : null);
    const crewLeaderDisplayId = crewLeaderBadge || (crewLeaderUser?.id ? `Responder #${crewLeaderUser.id}` : null);

    return (
      <View className="flex-1 bg-slate-50">
        <BrandBackground variant="subpage" />
        <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
          <Header
            title="Incident Status"
            subtitle="OPOL RESQ • LIVE MISSION MONITOR"
            className="bg-transparent"
            titleClassName="text-white font-black"
            subtitleClassName="text-blue-100 font-bold"
            rightElement={
              <TouchableOpacity
                onPress={() => router.push('/(resident)/account-security')}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 items-center justify-center active:bg-white/30 shadow-sm"
                accessibilityRole="button"
                accessibilityLabel="Account Settings & Security"
              >
                <Settings size={18} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            }
          />
        <ScrollView contentContainerStyle={styles.standbyScrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Status Header Card */}
          <View style={[
            styles.statusHeroCard,
            isRejected ? styles.statusHeroCardRejected : (isPending ? styles.statusHeroCardPending : styles.statusHeroCardActive)
          ]}>
            <View style={[
              styles.statusHeroIconRing,
              isRejected ? styles.iconRingRejected : (isPending ? styles.iconRingPending : styles.iconRingActive)
            ]}>
              {isRejected ? (
                <XCircle size={38} color="#DC2626" strokeWidth={2.25} />
              ) : isPending ? (
                <Clock size={38} color="#D97706" strokeWidth={2.25} />
              ) : isVerified ? (
                <ShieldCheck size={38} color="#2563EB" strokeWidth={2.25} />
              ) : isAssigned ? (
                <Ambulance size={38} color="#4F46E5" strokeWidth={2.25} />
              ) : (
                <Navigation size={38} color="#059669" strokeWidth={2.25} />
              )}
            </View>

            <View style={styles.statusBadgeRow}>
              <View style={[
                styles.pillBadge,
                isRejected ? styles.pillBadgeRed : (isPending ? styles.pillBadgeAmber : (isEnRoute || isArrived ? styles.pillBadgeGreen : styles.pillBadgeBlue))
              ]}>
                <Text style={[
                  styles.pillBadgeText,
                  isRejected ? styles.pillTextRed : (isPending ? styles.pillTextAmber : (isEnRoute || isArrived ? styles.pillTextGreen : styles.pillTextBlue))
                ]}>
                  {isRejected ? 'NOT APPROVED' : (isPending ? 'PENDING VERIFICATION' : (isVerified ? 'VERIFIED • ASSIGNING' : (isAssigned ? 'RESPONDER ASSIGNED' : (isArrived ? 'ON SCENE' : 'EN ROUTE'))))}
                </Text>
              </View>
            </View>

            <Text style={[styles.statusHeroTitle, isRejected && { color: '#B91C1C' }]}>
              {isRejected 
                ? 'Incident Report Not Approved' 
                : isPending 
                ? 'Waiting for Dispatcher' 
                : isVerified 
                ? 'Incident Approved' 
                : isAssigned 
                ? 'Responder Assigned' 
                : isArrived 
                ? 'Responders on Scene' 
                : 'Responder is on the way'}
            </Text>

            <Text style={styles.statusHeroSubtitle}>
              {isRejected
                ? 'Your emergency report was reviewed by the Dispatcher and was not approved for dispatch.'
                : isPending
                ? 'Your emergency report has been submitted and is currently being reviewed by the Dispatcher. Please keep your phone accessible.'
                : isVerified
                ? 'Your emergency report has been verified by the Dispatcher. A responder is being assigned to your incident.'
                : isAssigned
                ? 'A response team has been assigned to your emergency report and is preparing for departure.'
                : isArrived
                ? 'The emergency medical responders have arrived at your reported location.'
                : 'Your assigned responder is currently traveling to your location. Live tracking is active.'}
            </Text>
          </View>

          {/* Rejection Details Box */}
          {isRejected && (
            <View style={styles.rejectionDetailCard}>
              <View style={styles.rejectionHeaderRow}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.rejectionHeaderTitle}>REJECTION REASON</Text>
              </View>
              <Text style={styles.rejectionReasonText}>
                {activeIncident.rejection_reason || 'No specific reason provided by the dispatcher.'}
              </Text>
              <Text style={styles.rejectionHelpText}>
                If your condition is an immediate life-threatening emergency, please call the emergency hotline directly.
              </Text>
            </View>
          )}

          {/* Assigned Unit Card */}
          {(isAssigned || isEnRoute || isArrived) && activeDispatch && (
            <View style={styles.assignedUnitCard}>
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center mr-3 border border-indigo-100">
                    <Ambulance size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text className="text-slate-900 font-bold text-base">{unitName}</Text>
                    <Text className="text-slate-500 text-xs font-medium">{vehicleDesc}</Text>
                  </View>
                </View>
                <View className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                  <Text className="text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                    {dispatchStatus === 'arrived_on_scene' ? 'On Scene' : (dispatchStatus === 'en_route' ? 'En Route' : 'Assigned')}
                  </Text>
                </View>
              </View>
              {crewLeaderDisplayId && (
                <Text className="text-slate-600 text-xs font-medium">
                  Assigned Responder ID: <Text className="font-bold font-mono text-blue-700">{crewLeaderDisplayId}</Text>
                </Text>
              )}
            </View>
          )}

          {/* Lifecycle Stepper Card */}
          {!isRejected && (
            <View className="bg-white rounded-3xl p-5 border border-slate-200/80 mb-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                  INCIDENT PROGRESS
                </Text>
                <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  <Text className="text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider">
                    {isArrived ? 'On Scene' : isEnRoute ? 'Live Dispatched' : isAssigned ? 'Crew Assigned' : 'Under Review'}
                  </Text>
                </View>
              </View>
              
              {/* Step 1: Submitted */}
              <View className="flex-row items-start mb-3.5">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center mr-3 mt-0.5">
                  <CircleCheck size={16} color="#059669" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-slate-900 font-bold text-sm">Report Submitted</Text>
                    <Text className="text-emerald-600 font-bold text-[10px] uppercase">Logged</Text>
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5">Report #{activeIncident.id} recorded with GPS & photo</Text>
                </View>
              </View>

              {/* Step 2: Verification */}
              <View className="flex-row items-start mb-3.5">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 mt-0.5 border ${
                  (isVerified || isAssigned || isEnRoute || isArrived)
                    ? 'bg-emerald-50 border-emerald-200/60'
                    : 'bg-amber-50 border-amber-200/60'
                }`}>
                  {(isVerified || isAssigned || isEnRoute || isArrived) ? (
                    <CircleCheck size={16} color="#059669" strokeWidth={2.5} />
                  ) : (
                    <Clock size={16} color="#D97706" strokeWidth={2.5} />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${
                      (isVerified || isAssigned || isEnRoute || isArrived) ? 'text-slate-900' : 'text-amber-700'
                    }`}>
                      Dispatcher Review
                    </Text>
                    <Text className={`text-[10px] font-bold uppercase ${
                      (isVerified || isAssigned || isEnRoute || isArrived) ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {(isVerified || isAssigned || isEnRoute || isArrived) ? 'Approved' : 'In Review'}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {(isVerified || isAssigned || isEnRoute || isArrived) ? 'Report verified by command center' : 'Dispatcher verifying incident validity'}
                  </Text>
                </View>
              </View>

              {/* Step 3: Assignment */}
              <View className="flex-row items-start mb-3.5">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 mt-0.5 border ${
                  (isAssigned || isEnRoute || isArrived)
                    ? 'bg-emerald-50 border-emerald-200/60'
                    : isVerified
                    ? 'bg-blue-50 border-blue-200/60'
                    : 'bg-slate-50 border-slate-200/60'
                }`}>
                  {(isAssigned || isEnRoute || isArrived) ? (
                    <CircleCheck size={16} color="#059669" strokeWidth={2.5} />
                  ) : isVerified ? (
                    <ActivityIndicator size={13} color="#2563EB" />
                  ) : (
                    <Lock size={14} color="#94A3B8" />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${
                      (isAssigned || isEnRoute || isArrived) ? 'text-slate-900' : isVerified ? 'text-blue-700' : 'text-slate-400'
                    }`}>
                      Responder Assignment
                    </Text>
                    <Text className={`text-[10px] font-bold uppercase ${
                      (isAssigned || isEnRoute || isArrived) ? 'text-emerald-600' : isVerified ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {(isAssigned || isEnRoute || isArrived) ? 'Assigned' : isVerified ? 'Matching' : 'Waiting'}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {(isAssigned || isEnRoute || isArrived) ? `${unitName} assigned to mission` : 'Awaiting team assignment'}
                  </Text>
                </View>
              </View>

              {/* Step 4: Live Responder Tracking */}
              <View className="flex-row items-start">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 mt-0.5 border ${
                  isArrived
                    ? 'bg-emerald-50 border-emerald-200/60'
                    : isEnRoute
                    ? 'bg-sky-50 border-sky-200/60'
                    : 'bg-slate-50 border-slate-200/60'
                }`}>
                  {isArrived ? (
                    <CircleCheck size={16} color="#059669" strokeWidth={2.5} />
                  ) : isEnRoute ? (
                    <Navigation size={15} color="#0284C7" strokeWidth={2.5} />
                  ) : (
                    <Lock size={14} color="#94A3B8" />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${
                      (isEnRoute || isArrived) ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      Live Responder Tracking
                    </Text>
                    <Text className={`text-[10px] font-bold uppercase ${
                      isArrived ? 'text-emerald-600' : isEnRoute ? 'text-sky-600' : 'text-slate-400'
                    }`}>
                      {isArrived ? 'Arrived' : isEnRoute ? 'En Route' : 'Standby'}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {isArrived ? 'Responder arrived on scene' : isEnRoute ? 'Live GPS tracking active on map' : 'Activates when responder departs'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {/* Live tracking button ONLY when En Route */}
            {isEnRoute && (
              <TouchableOpacity
                style={styles.trackBtnActive}
                onPress={() => router.navigate('/track')}
                activeOpacity={0.85}
              >
                <Navigation size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.trackBtnActiveText}>TRACK RESPONDER LIVE</Text>
              </TouchableOpacity>
            )}

            {/* Responders on scene banner when Arrived */}
            {isArrived && (
              <View style={[styles.trackingLockedBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <CircleCheck size={18} color="#059669" />
                <Text style={[styles.trackingLockedText, { color: '#065F46', fontWeight: '700' }]}>
                  Responders have arrived on scene — Care in progress
                </Text>
              </View>
            )}

            {/* Tracking Locked Notice when not En Route or Arrived */}
            {!isRejected && !isEnRoute && !isArrived && (
              <View style={styles.trackingLockedBanner}>
                <Lock size={16} color="#64748B" />
                <Text style={styles.trackingLockedText}>
                  {isPending ? 'Tracking unlocks once approved & responder is en route' : 'Tracking unlocks when responder departs'}
                </Text>
              </View>
            )}

            {/* If Rejected: Return to form */}
            {isRejected && (
              <TouchableOpacity
                style={styles.returnFormBtn}
                onPress={handleDismissRejection}
                activeOpacity={0.85}
              >
                <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.returnFormBtnText}>Return to Report Form</Text>
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                style={styles.cancelIncidentBtn}
                onPress={() => setShowCancelModal(true)}
                activeOpacity={0.85}
              >
                <XCircle size={16} color="#DC2626" strokeWidth={2.2} />
                <Text style={styles.cancelIncidentBtnText}>Cancel Emergency Request</Text>
              </TouchableOpacity>
            )}

            {!isRejected && (isAssigned || isEnRoute || isArrived) && (
              <View style={styles.lockedCancelNotice}>
                <Lock size={14} color="#64748B" />
                <Text style={styles.lockedCancelNoticeText}>
                  Responders are assigned and en route. Direct cancellation is disabled. Please call the 911 hotline for urgent requests.
                </Text>
              </View>
            )}

            {!isRejected && (
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => {
                  Alert.alert(
                    'Report New Emergency',
                    'If this emergency mission concluded or was handled, you can return to the emergency report form.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Return to Report Form', onPress: () => setActiveIncident(null) }
                    ]
                  );
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.dismissBtnText}>Dismiss / Report New Emergency</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <CancelConfirmationModal
        visible={showCancelModal}
        isLoading={isCancellingReport}
        incidentCode={activeIncident ? `INC-2026-${String(activeIncident.id).padStart(5, '0')}` : undefined}
        onConfirm={handleConfirmCancel}
        onClose={() => !isCancellingReport && setShowCancelModal(false)}
      />
    </View>
  );
}

  // ── Suspended / Cooldown state (3 strikes rule)
  if (suspension?.is_suspended && timeRemaining) {
    return (
      <View className="flex-1 bg-slate-50">
        <BrandBackground variant="subpage" />
        <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
          <Header
            title="Report Emergency"
            subtitle="OPOL RESQ • EMERGENCY PORTAL"
            className="bg-transparent"
            titleClassName="text-white font-black"
            subtitleClassName="text-blue-100 font-bold"
            rightElement={
              <TouchableOpacity
                onPress={() => router.push('/(resident)/account-security')}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 items-center justify-center active:bg-white/30 shadow-sm"
                accessibilityRole="button"
                accessibilityLabel="Account Settings & Security"
              >
                <Settings size={18} color="#FFFFFF" strokeWidth={2.2} />
              </TouchableOpacity>
            }
          />
        <ScrollView contentContainerStyle={styles.standbyScrollContent} showsVerticalScrollIndicator={false}>
          {/* Suspension Hero Alert Card */}
          <View style={[styles.statusHeroCard, styles.statusHeroCardRejected]}>
            <View style={[styles.statusHeroIconRing, styles.iconRingRejected]}>
              <ShieldAlert size={40} color="#DC2626" strokeWidth={2.25} />
            </View>

            <View style={styles.statusBadgeRow}>
              <View style={[styles.pillBadge, styles.pillBadgeRed]}>
                <Text style={[styles.pillBadgeText, styles.pillTextRed]}>
                  24-HOUR COOLDOWN ACTIVE
                </Text>
              </View>
            </View>

            <Text style={[styles.statusHeroTitle, { color: '#B91C1C' }]}>
              Reporting Temporarily Suspended
            </Text>

            <Text style={styles.statusHeroSubtitle}>
              Your account has reached 3 rejected emergency reports flagged by the Dispatcher. Emergency form submissions are locked for 24 hours to prevent command center disruption.
            </Text>
          </View>

          {/* Countdown Clock Card */}
          <View style={styles.countdownCard}>
            <View style={styles.countdownHeaderRow}>
              <Timer size={18} color="#B91C1C" />
              <Text style={styles.countdownHeaderTitle}>UNLOCK COUNTDOWN</Text>
            </View>

            <View style={styles.countdownGrid}>
              <View style={styles.countdownBox}>
                <Text style={styles.countdownDigit}>
                  {String(timeRemaining.hours).padStart(2, '0')}
                </Text>
                <Text style={styles.countdownUnit}>HOURS</Text>
              </View>

              <Text style={styles.countdownColon}>:</Text>

              <View style={styles.countdownBox}>
                <Text style={styles.countdownDigit}>
                  {String(timeRemaining.minutes).padStart(2, '0')}
                </Text>
                <Text style={styles.countdownUnit}>MINUTES</Text>
              </View>

              <Text style={styles.countdownColon}>:</Text>

              <View style={styles.countdownBox}>
                <Text style={styles.countdownDigit}>
                  {String(timeRemaining.seconds).padStart(2, '0')}
                </Text>
                <Text style={styles.countdownUnit}>SECONDS</Text>
              </View>
            </View>

            <Text style={styles.countdownFooterText}>
              Cooldown unlocks automatically on{' '}
              <Text style={{ fontWeight: '700', color: '#1E293B' }}>
                {suspension.suspended_until ? new Date(suspension.suspended_until).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  month: 'short',
                  day: 'numeric'
                }) : 'in 24 hours'}
              </Text>
            </Text>
          </View>

          {/* Life-Saving Emergency Hotline Box */}
          <View style={styles.hotlineHelpCard}>
            <View style={styles.hotlineHelpHeader}>
              <PhoneCall size={20} color="#DC2626" />
              <Text style={styles.hotlineHelpTitle}>Immediate Life Threatening Emergency?</Text>
            </View>
            <Text style={styles.hotlineHelpDesc}>
              Emergency telephone hotlines are never blocked. If you or someone nearby is experiencing an immediate life-threatening emergency, call the MDRRMO Command Center directly.
            </Text>

            <TouchableOpacity
              style={styles.hotlineCallBtnPrimary}
              onPress={() => handleCallHotline('09177076765', 'MDRRMO Command Center')}
              activeOpacity={0.85}
            >
              <PhoneCall size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.hotlineCallBtnPrimaryText}>CALL MDRRMO HOTLINE (09177076765)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hotlineCallBtnSecondary}
              onPress={() => handleCallHotline('911', 'National Emergency Hotline (911)')}
              activeOpacity={0.85}
            >
              <ShieldAlert size={16} color="#DC2626" strokeWidth={2.2} />
              <Text style={styles.hotlineCallBtnSecondaryText}>Dial National Hotline (911)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

  // ── Main report form
  return (
    <View className="flex-1 bg-slate-50">
      <BrandBackground variant="subpage" />
      <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
        <Header
          title="Report Emergency"
          subtitle="OPOL RESQ • CITIZEN DISPATCH"
          className="bg-transparent"
          titleClassName="text-white font-black"
          subtitleClassName="text-blue-100 font-bold"
          rightElement={
            <TouchableOpacity
              onPress={() => router.push('/(resident)/account-security')}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 items-center justify-center active:bg-white/30 shadow-sm"
              accessibilityRole="button"
              accessibilityLabel="Account Settings & Security"
            >
              <Settings size={18} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>
          }
        />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Life-Threatening Warning Banner ── */}
        <View style={styles.banner}>
          <View style={styles.bannerIconContainer}>
            <AlertCircle size={20} color="#DC2626" strokeWidth={2.4} />
          </View>
          <Text style={styles.bannerText}>
            For life-threatening situations, call the emergency hotline immediately.
          </Text>
        </View>

        {/* ── Profile Verification Required Banner ── */}
        {isUnverified && (
          <View style={styles.verificationBannerCard}>
            <View style={styles.verificationBannerHeader}>
              <View style={styles.verificationIconBox}>
                <ShieldAlert size={22} color="#D97706" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={styles.verificationBannerTitle}>Profile Verification Required</Text>
                  <View style={styles.verificationStatusPill}>
                    <Text style={styles.verificationStatusPillText}>Pending</Text>
                  </View>
                </View>
                <Text style={styles.verificationBannerDesc}>
                  Complete your personal information to unlock the accident reporting feature.
                </Text>
              </View>
            </View>

            {verification?.missing_fields && verification.missing_fields.length > 0 && (
              <View style={styles.verificationMissingBox}>
                <Text style={styles.verificationMissingLabel}>Required fields to complete:</Text>
                <Text style={styles.verificationMissingText}>
                  {verification.missing_fields.join(' • ')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => router.push('/(resident)/personal-info')}
              activeOpacity={0.8}
              style={styles.completeProfileBtn}
            >
              <Text style={styles.completeProfileBtnText}>Complete Profile Now</Text>
            </TouchableOpacity>

            {/* Alternative Emergency Hotline Notice */}
            <View style={styles.alternativeHotlineSection}>
              <Text style={styles.alternativeHotlineTitle}>Need Immediate Assistance?</Text>
              <Text style={styles.alternativeHotlineDesc}>
                Emergency hotlines are always accessible without profile verification:
              </Text>
              <View style={styles.verificationHotlineRow}>
                <TouchableOpacity
                  onPress={() => handleCallHotline('09758429491', 'MDRRMO Rescue Alpha')}
                  style={styles.verificationHotlineBtn}
                  activeOpacity={0.75}
                >
                  <PhoneCall size={14} color="#1E88E5" style={{ marginRight: 6 }} />
                  <Text style={styles.verificationHotlineBtnText}>MDRRMO: 09758429491</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCallHotline('09358056370', 'Police - PNP')}
                  style={styles.verificationHotlineBtn}
                  activeOpacity={0.75}
                >
                  <PhoneCall size={14} color="#1E88E5" style={{ marginRight: 6 }} />
                  <Text style={styles.verificationHotlineBtnText}>Police: 09358056370</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Emergency Type (Responsive Grid) ── */}
        <SectionLabel label="Emergency Type" />
        <View style={styles.typeGrid}>
          {(() => {
            const rows: EmergencyTypeItem[][] = [];
            for (let i = 0; i < emergencyTypes.length; i += 2) {
              rows.push(emergencyTypes.slice(i, i + 2));
            }
            return rows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.typeGridRow}>
                {row.map((type) => (
                  <TypeCard
                    key={type.id}
                    type={type}
                    selected={selectedType === type.id}
                    onPress={() => setSelectedType(type.id)}
                  />
                ))}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ));
          })()}
        </View>

        {/* ── Location ── */}
        <SectionLabel label="Location" />
        <View style={styles.locationStaticCard}>
          <View style={styles.locationIconContainerStatic}>
            <MapPin size={22} color="#208AEF" strokeWidth={2.4} />
          </View>
          <View style={styles.locationTextStatic}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationTitleStatic}>Your Current Location</Text>
              <View style={styles.gpsPill}>
                <View style={styles.gpsPillDot} />
                <Text style={styles.gpsPillText}>GPS ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.locationSubStatic}>
              Your location has been automatically detected and will be shared with emergency responders.
            </Text>
          </View>
        </View>

        {/* ── Attachments / Photo Evidence ── */}
        <SectionLabel label="Photo Evidence" required />
        {photoUri ? (
          <View>
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoPreviewOverlay}>
                <TouchableOpacity
                  style={styles.retakePhotoBtn}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.retakePhotoText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={handleRemovePhoto}
                  activeOpacity={0.8}
                >
                  <XCircle size={22} color="#FFFFFF" fill="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            {photoMetadata && (
              <View style={styles.photoMetaCard}>
                <View style={styles.photoMetaHeader}>
                  <Text style={styles.photoMetaTitle}>Captured Photo Information</Text>
                  <View style={styles.photoMetaBadge}>
                    <Text style={styles.photoMetaBadgeText}>GPS VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.photoMetaRow}>
                  <MapPin size={15} color="#208AEF" strokeWidth={2.2} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.photoMetaLabel}>Location</Text>
                    <Text style={styles.photoMetaValue} numberOfLines={2}>
                      {photoMetadata.locationName || 'Detecting address...'}
                    </Text>
                  </View>
                </View>

                <View style={styles.photoMetaDivider} />

                <View style={styles.photoMetaRow}>
                  <Navigation size={15} color="#10B981" strokeWidth={2.2} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.photoMetaLabel}>Coordinates</Text>
                    <Text style={styles.photoMetaMono}>
                      {photoMetadata.latitude ? `${photoMetadata.latitude.toFixed(6)}, ${photoMetadata.longitude.toFixed(6)}` : 'Coordinates pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.photoMetaDivider} />

                <View style={styles.photoMetaRow}>
                  <Clock size={15} color="#F59E0B" strokeWidth={2.2} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.photoMetaLabel}>Date & Time</Text>
                    <Text style={styles.photoMetaValue}>
                      {photoMetadata.formattedDateTime}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoUploadBtn}
            onPress={handlePickPhoto}
            activeOpacity={0.75}
          >
            <View style={styles.photoUploadIconWrapper}>
              <Camera size={26} color="#208AEF" strokeWidth={2.2} />
            </View>
            <Text style={styles.photoUploadText}>Tap to take a photo</Text>
            <Text style={styles.photoUploadSubtext}>Required for dispatch verification & team safety</Text>
          </TouchableOpacity>
        )}

        {/* ── Description ── */}
        <SectionLabel label="Describe what happened (Optional)" />
        <View
          style={[
            styles.textareaWrapper,
            inputFocused && styles.textareaWrapperFocused,
          ]}
        >
          <TextInput
            style={styles.textarea}
            placeholder="Add details such as number of people involved, visible injuries, etc."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
        </View>

        {/* ── Submit button ── */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!photoUri || isSubmitting || isUnverified) && styles.submitBtnDisabled,
            isUnverified && styles.submitBtnUnverified,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : isUnverified ? (
            <>
              <ShieldAlert size={18} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>PROFILE VERIFICATION REQUIRED</Text>
            </>
          ) : (
            <>
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.submitBtnText}>SUBMIT EMERGENCY REPORT</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Your report is encrypted and sent directly to the MDRRMO command center.
        </Text>
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 }}>
            <View style={{ backgroundColor: '#ecfdf5', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <View style={{ backgroundColor: '#10b981', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                <CircleCheck size={32} color="#fff" />
              </View>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>Report Submitted</Text>
            <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
              Your emergency report has been securely sent to the MDRRMO Command Center. Responders have been notified.
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#10b981', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
              onPress={() => { setShowSuccessModal(false); router.back(); }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 }}>OKAY, THANK YOU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  </View>
);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  standbyScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statusHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  statusHeroCardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF7',
  },
  statusHeroCardActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFC',
  },
  statusHeroCardRejected: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  statusHeroIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconRingPending: {
    backgroundColor: '#FEF3C7',
  },
  iconRingActive: {
    backgroundColor: '#EFF6FF',
  },
  iconRingRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeRow: {
    marginBottom: 10,
  },
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  pillBadgeBlue: {
    backgroundColor: '#DBEAFE',
  },
  pillBadgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  pillBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pillTextAmber: {
    color: '#B45309',
  },
  pillTextBlue: {
    color: '#1D4ED8',
  },
  pillTextGreen: {
    color: '#047857',
  },
  pillTextRed: {
    color: '#B91C1C',
  },
  statusHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusHeroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  rejectionDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  rejectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rejectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 8,
  },
  rejectionHelpText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },
  assignedUnitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepperHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepDotCurrent: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
  stepDotPending: {
    backgroundColor: '#F1F5F9',
  },
  stepContent: {
    flex: 1,
  },
  stepTitleDone: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  stepTitleCurrent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },
  stepTitlePending: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  stepSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  stepBar: {
    width: 2,
    height: 18,
    marginLeft: 12,
    marginVertical: 2,
  },
  stepBarDone: {
    backgroundColor: '#10B981',
  },
  stepBarPending: {
    backgroundColor: '#E2E8F0',
  },
  actionContainer: {
    gap: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  trackBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  trackBtnActiveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackingLockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  trackingLockedText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  returnFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  returnFormBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelIncidentBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  cancelIncidentBtnText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '700',
  },
  lockedCancelNotice: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  lockedCancelNoticeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  dismissBtn: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 130,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 18,
  },
  sectionLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  requiredDot: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginTop: 6,
    marginBottom: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bannerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  bannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  verificationBannerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginTop: 10,
    marginBottom: 4,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  verificationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  verificationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verificationBannerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: -0.2,
  },
  verificationStatusPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: 12,
  },
  verificationStatusPillText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  verificationBannerDesc: {
    color: '#B45309',
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 2,
  },
  verificationMissingBox: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verificationMissingLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verificationMissingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
    lineHeight: 16,
  },
  completeProfileBtn: {
    marginTop: 12,
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  alternativeHotlineSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  alternativeHotlineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  alternativeHotlineDesc: {
    fontSize: 11.5,
    color: '#B45309',
    lineHeight: 16,
    marginBottom: 8,
  },
  verificationHotlineRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verificationHotlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  verificationHotlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E88E5',
  },
  submitBtnUnverified: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  typeGrid: {
    gap: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  typeGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    minHeight: 56,
    shadowOffset: { width: 0, height: 2 },
  },
  typeCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  typeCardLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  typeCardCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  typeRow: {
    marginBottom: 4,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  typeChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  typeChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  locationStaticCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 2,
  },
  locationIconContainerStatic: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  locationTextStatic: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  locationTitleStatic: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gpsPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  locationSubStatic: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '400',
    lineHeight: 18,
  },
  photoUploadBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginTop: 2,
  },
  photoUploadIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoUploadText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  photoUploadSubtext: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 3,
  },
  photoPreviewContainer: {
    position: 'relative',
    height: 210,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#0F172A',
    marginTop: 2,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPreviewOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retakePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 6,
  },
  retakePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  removePhotoBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  textareaWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    minHeight: 110,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginTop: 2,
  },
  textareaWrapperFocused: {
    borderColor: '#208AEF',
    shadowColor: '#208AEF',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  textarea: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    minHeight: 82,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 17,
    marginTop: 22,
    gap: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  footerNote: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  photoMetaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  photoMetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  photoMetaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoMetaBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoMetaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.4,
  },
  photoMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  photoMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  photoMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  photoMetaMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#0F766E',
  },
  photoMetaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  countdownCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  countdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  countdownHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.8,
  },
  countdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  countdownBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  countdownDigit: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: '#991B1B',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  countdownColon: {
    fontSize: 22,
    fontWeight: '900',
    color: '#DC2626',
    marginHorizontal: 6,
    marginBottom: 12,
  },
  countdownFooterText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  hotlineHelpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  hotlineHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  hotlineHelpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
  },
  hotlineHelpDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  hotlineCallBtnPrimary: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  hotlineCallBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  hotlineCallBtnSecondary: {
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  hotlineCallBtnSecondaryText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
