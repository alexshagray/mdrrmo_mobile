import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
import * as Location from 'expo-location';
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
  Navigation,
  CircleCheck,
  Send,
  XCircle,
  RotateCcw,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { residentRefreshTrigger } = useResidentAlert();
  const { echo } = useRealtime() as { echo: any };

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      const active = incidents.find((inc: any) => {
        // If incident itself is resolved, rejected, or cancelled -> not active
        if (['resolved', 'rejected', 'cancelled'].includes(inc.incident_status)) {
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
  }, []);

  // Location Tracking for Active Incident
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    if (activeIncident) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 20, // update every 20 meters
            timeInterval: 15000, // or every 15 seconds
          },
          async (loc) => {
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
      })();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [activeIncident]);

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

  // Real-time Echo listeners for immediate transition back to report form on cancellation
  useEffect(() => {
    if (!echo) return;

    let residentChannel: any = null;
    if (user?.id) {
      residentChannel = echo.private(`resident.${user.id}`);
      const handleResidentStatusUpdated = (e: any) => {
        console.log('ReportScreen resident channel received DispatchStatusUpdated:', e);
        const status = e.dispatch?.dispatch_status;
        if (status === 'cancelled' || status === 'completed') {
          setActiveIncident(null);
        }
        fetchIncidents();
      };
      residentChannel.listen('DispatchStatusUpdated', handleResidentStatusUpdated);
      residentChannel.listen('.DispatchStatusUpdated', handleResidentStatusUpdated);
      residentChannel.listen('DispatchCompleted', handleResidentStatusUpdated);
      residentChannel.listen('.DispatchCompleted', handleResidentStatusUpdated);
    }

    let incidentChannel: any = null;
    if (activeIncident?.id) {
      incidentChannel = echo.private(`incident.${activeIncident.id}`);
      const handleIncidentStatusUpdated = (e: any) => {
        console.log('ReportScreen incident channel received DispatchStatusUpdated:', e);
        const status = e.dispatch?.dispatch_status;
        if (status === 'cancelled' || status === 'completed') {
          setActiveIncident(null);
        }
        fetchIncidents();
      };
      incidentChannel.listen('DispatchStatusUpdated', handleIncidentStatusUpdated);
      incidentChannel.listen('.DispatchStatusUpdated', handleIncidentStatusUpdated);
      incidentChannel.listen('DispatchCompleted', handleIncidentStatusUpdated);
      incidentChannel.listen('.DispatchCompleted', handleIncidentStatusUpdated);
    }

    return () => {
      if (residentChannel) {
        residentChannel.stopListening('DispatchStatusUpdated');
        residentChannel.stopListening('.DispatchStatusUpdated');
        residentChannel.stopListening('DispatchCompleted');
        residentChannel.stopListening('.DispatchCompleted');
      }
      if (incidentChannel) {
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
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
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

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('incident_type_id', selectedType.toString());
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('reporter_latitude', latitude.toString());
      formData.append('reporter_longitude', longitude.toString());
      formData.append('reported_at', new Date().toISOString());
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
    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={['top']}>
        <Header title="Standby Mode" className="bg-transparent" />
        <View style={styles.standbyContainer}>
          <View style={styles.standbyIconRing}>
            <View style={styles.standbyIconInner}>
              <Clock size={40} color="#6366F1" strokeWidth={2.25} />
            </View>
          </View>

          <Text style={styles.standbyTitle}>Active Report In Progress</Text>
          <Text style={styles.standbySubtitle}>
            You have a pending incident report. Our responders are on the way.
            Please stay calm and wait for assistance.
          </Text>

          <View style={styles.standbyChip}>
            <CircleCheck size={14} color="#059669" strokeWidth={2.5} />
            <Text style={styles.standbyChipText}>Responders have been notified</Text>
          </View>
          
          <View style={styles.standbyChipLive}>
            <MapPin size={14} color="#3B82F6" strokeWidth={2.5} />
            <Text style={styles.standbyChipTextLive}>Sharing live location</Text>
          </View>

          <TouchableOpacity
            style={styles.trackBtn}
            onPress={() => router.navigate('/track')}
            activeOpacity={0.85}
          >
            <Navigation size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.trackBtnText}>Track Responder</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshReportBtn}
            onPress={() => fetchIncidents()}
            activeOpacity={0.85}
          >
            <RotateCcw size={16} color="#6366F1" strokeWidth={2.2} />
            <Text style={styles.refreshReportBtnText}>Refresh Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => {
              Alert.alert(
                'Report New Emergency',
                'If this emergency mission was cancelled or concluded, you can return to the emergency report form.',
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
        </View>
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
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.removePhotoBtn} onPress={handleRemovePhoto}>
              <XCircle size={24} color="#FFFFFF" fill="#DC2626" />
            </TouchableOpacity>
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
  standbyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  standbyIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  standbyIconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standbyTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  standbySubtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  standbyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
    gap: 6,
  },
  standbyChipText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
  standbyChipLive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 28,
    gap: 6,
  },
  standbyChipTextLive: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  refreshReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    alignSelf: 'stretch',
    marginTop: 12,
  },
  refreshReportBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissBtn: {
    marginTop: 10,
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
});
