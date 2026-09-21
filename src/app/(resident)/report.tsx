import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
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
} from 'lucide-react-native';

import { submitEmergencyReport, getMyReports, updateReporterLocation } from '@/shared/api/incidents';
import { locationService } from '@/shared/services/locationService';
import { useAuth } from '@/shared/auth/authContext';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';
import { useRealtime } from '@/shared/hooks';

// ─── Emergency type config ────────────────────────────────────────────────────
const TYPES = [
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
];

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {required && <Text style={styles.requiredDot}> *</Text>}
    </View>
  );
}

// ─── Type chip ────────────────────────────────────────────────────────────────
function TypeChip({
  type,
  selected,
  onPress,
}: {
  type: (typeof TYPES)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const IconComponent = type.icon;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }], marginRight: 10 }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.typeChip,
          {
            backgroundColor: selected ? type.activeBg : '#FFFFFF',
            borderColor: selected ? type.activeBg : '#E2E8F0',
            shadowColor: selected ? type.activeBg : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.typeChipIcon,
            { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : type.bg },
          ]}
        >
          <IconComponent
            size={18}
            color={selected ? '#FFFFFF' : type.color}
            strokeWidth={2.25}
          />
        </View>
        <Text
          style={[
            styles.typeChipLabel,
            { color: selected ? '#FFFFFF' : '#334155' },
          ]}
        >
          {type.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState(1);
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
  const router = useRouter();
  const { user } = useAuth();
  const { residentRefreshTrigger } = useResidentAlert();
  const { echo } = useRealtime() as { echo: any };

  const [dismissedRejectedId, setDismissedRejectedId] = useState<number | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      const active = incidents.find((inc: any) => {
        // If rejected and not dismissed yet by the resident, show rejection screen
        if (inc.incident_status === 'rejected') {
          return inc.id !== dismissedRejectedId;
        }

        // If incident itself is resolved or cancelled -> not active
        if (['resolved', 'cancelled'].includes(inc.incident_status)) {
          return false;
        }

        // If the incident has dispatches and the mission was cancelled with no active live dispatches
        if (Array.isArray(inc.dispatches) && inc.dispatches.length > 0) {
          const hasLiveDispatch = inc.dispatches.some((d: any) =>
            ['assigned', 'accepted', 'en_route', 'arrived_on_scene'].includes(d.dispatch_status)
          );
          const hasCancelledDispatch = inc.dispatches.some((d: any) => d.dispatch_status === 'cancelled');

          if (hasCancelledDispatch && !hasLiveDispatch) {
            return false;
          }
        }

        // If marked assigned or responding, it must have an active live dispatch
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
      setActiveIncident(active || null);
    } catch (e) {
      console.error('Failed to fetch reports', e);
    } finally {
      setIsLoading(false);
    }
  }, [dismissedRejectedId]);

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
      Alert.alert(
        'Submission Failed',
        'Make sure you have an active internet connection to submit the photo and report.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading state
  if (isLoading) {
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
    const isAssigned = incidentStatus === 'assigned' || dispatchStatus === 'assigned' || dispatchStatus === 'accepted';
    const isArrived = dispatchStatus === 'arrived_on_scene';
    const isEnRoute = dispatchStatus === 'en_route';
    const isRejected = incidentStatus === 'rejected';

    const unitName = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
    const vehicleDesc = activeDispatch?.ambulance?.vehicle_name || activeDispatch?.ambulance?.plate_number || 'MDRRMO Vehicle';
    const crewLeader = activeDispatch?.team_leader 
      ? `${activeDispatch.team_leader.first_name} ${activeDispatch.team_leader.last_name}`
      : (activeDispatch?.driver ? `${activeDispatch.driver.first_name} ${activeDispatch.driver.last_name}` : null);

    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
        <Header title="Incident Status" className="bg-transparent" />
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
              {crewLeader && (
                <Text className="text-slate-600 text-xs font-medium">
                  Team Leader / Crew: <Text className="font-bold text-slate-800">{crewLeader}</Text>
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
                onPress={() => {
                  setDismissedRejectedId(activeIncident.id);
                  setActiveIncident(null);
                }}
                activeOpacity={0.85}
              >
                <RotateCcw size={16} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={styles.returnFormBtnText}>Return to Report Form</Text>
              </TouchableOpacity>
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
    );
  }

  // ── Main report form
  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
      <Header title="Report Emergency" className="bg-transparent" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.banner}>
          <View style={styles.bannerIconContainer}>
            <AlertCircle size={20} color="#DC2626" strokeWidth={2.25} />
          </View>
          <Text style={styles.bannerText}>
            For life-threatening situations, call the emergency hotline immediately.
          </Text>
        </View>

        {/* ── Emergency Type ── */}
        <SectionLabel label="Emergency Type" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeRow}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {TYPES.map((type) => (
            <TypeChip
              key={type.id}
              type={type}
              selected={selectedType === type.id}
              onPress={() => setSelectedType(type.id)}
            />
          ))}
        </ScrollView>

        {/* ── Location ── */}
        <SectionLabel label="Location" />
        <View style={styles.locationStaticCard}>
          <View style={styles.locationIconContainerStatic}>
            <MapPin size={24} color="#3B82F6" strokeWidth={2.25} />
          </View>
          <View style={styles.locationTextStatic}>
            <Text style={styles.locationTitleStatic}>📍 Your Current Location</Text>
            <Text style={styles.locationSubStatic}>
              Your location has been automatically detected and will be shared with emergency responders.
            </Text>
          </View>
        </View>

        {/* ── Attachments ── */}
        <SectionLabel label="Photo Evidence" required />
        {photoUri ? (
          <View>
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
                <XCircle size={24} color="#FFFFFF" fill="#DC2626" />
              </TouchableOpacity>
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
                  <MapPin size={15} color="#3B82F6" strokeWidth={2.2} />
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
          <TouchableOpacity style={styles.photoUploadBtn} onPress={handlePickPhoto}>
            <Camera size={32} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.photoUploadText}>Tap to take a photo</Text>
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
            (!photoUri || isSubmitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!photoUri || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>
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
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#059669',
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionLabel: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  requiredDot: {
    color: '#F43F5E',
    fontSize: 14,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 4,
    marginBottom: 4,
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
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
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
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  locationIconContainerStatic: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  locationTextStatic: {
    flex: 1,
  },
  locationTitleStatic: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationSubStatic: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  photoUploadBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoUploadText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  photoPreviewContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  textareaWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  textareaWrapperFocused: {
    borderColor: '#6366F1',
  },
  textarea: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F43F5E',
    borderRadius: 16,
    paddingVertical: 17,
    marginTop: 24,
    gap: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  footerNote: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },
  photoMetaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 10,
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
});
