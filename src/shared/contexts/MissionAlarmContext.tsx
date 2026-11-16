import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Vibration, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { AlertTriangle, X, MapPin, Activity } from 'lucide-react-native';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { updatePushTokenApi } from '../api/auth';
import { getActiveDispatches } from '../api/dispatches';
import { useAuth } from '../auth/authContext';
import { useRealtime } from '../hooks/useRealtime';
import { notificationService } from '../services/notificationService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface MissionAlarmContextType {
  incomingMission: any;
  clearMission: () => void;
  missionRefreshTrigger: number;
  latestVerifiedIncident: any;
  clearVerifiedNotification: () => void;
  verifiedIncidentsTrigger: number;
}

const MissionAlarmContext = createContext<MissionAlarmContextType>({
  incomingMission: null,
  clearMission: () => {},
  missionRefreshTrigger: 0,
  latestVerifiedIncident: null,
  clearVerifiedNotification: () => {},
  verifiedIncidentsTrigger: 0,
});

const { width, height } = Dimensions.get('window');

export function MissionAlarmProvider({ children }: { children: React.ReactNode }) {
  const [incomingMission, setIncomingMission] = useState<any>(null);
  const [missionRefreshTrigger, setMissionRefreshTrigger] = useState<number>(0);
  const [latestVerifiedIncident, setLatestVerifiedIncident] = useState<any>(null);
  const [verifiedIncidentsTrigger, setVerifiedIncidentsTrigger] = useState<number>(0);
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { echo } = useRealtime();
  const router = useRouter();

  // Deduplication tracker: prevent repeated alerts for the same verified incident
  const notifiedIncidentIds = useRef<Set<number>>(new Set());
  // Dismissed tracker: prevent re-alerting for the same mission once acknowledged
  const dismissedMissionIds = useRef<Set<number>>(new Set());
  // Active sound and alarm timeout refs
  const soundRef = useRef<AudioPlayer | null>(null);
  const alarmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopSirenAndVibration = () => {
    try {
      Vibration.cancel();
    } catch (e) {}

    if (alarmTimeoutRef.current) {
      clearTimeout(alarmTimeoutRef.current);
      alarmTimeoutRef.current = null;
    }

    if (soundRef.current) {
      try {
        soundRef.current.pause();
        if (typeof soundRef.current.remove === 'function') {
          soundRef.current.remove();
        }
      } catch (e) {}
      soundRef.current = null;
    }

    setSound(null);
  };

  // Setup Android notification channels on mount (mission_alarm channel plays alarm.mp3)
  useEffect(() => {
    notificationService.setupNotificationChannels();
  }, []);

  // Periodic heartbeat to automatically detect new missions without requiring scroll/refresh
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'responder') return;

    let isMounted = true;

    const checkActiveMissions = async () => {
      try {
        const res = await getActiveDispatches();
        if (!isMounted) return;
        const activeList = (res?.data || []).filter((item: any) => 
          !['completed', 'cancelled'].includes(item.dispatch_status)
        );

        if (activeList.length > 0) {
          const latest = activeList[0];
          // If status is assigned and not dismissed yet, auto-trigger the mission alarm & modal!
          if (latest.dispatch_status === 'assigned' && !dismissedMissionIds.current.has(latest.id)) {
            setIncomingMission((prev: any) => {
              if (prev && (prev.dispatch_id === latest.id || prev.dispatch?.id === latest.id)) {
                return prev;
              }
              const inc = latest.incident;
              const typeName = inc?.incident_type?.name || inc?.incidentType?.name || 'Emergency Incident';
              const rawBarangay = inc?.barangay || inc?.resident?.resident_profile?.barangay?.barangay_name || 'Opol';
              const cleanBarangay = String(rawBarangay).replace(/^barangay\s+/i, '');
              const cleanLocation = inc?.place_of_incident || inc?.incident_address || `Barangay ${cleanBarangay}, Opol`;

              return {
                dispatch_id: latest.id,
                dispatch: latest,
                type: 'dispatch_assigned',
                event_type: 'dispatch_assigned',
                title: 'Emergency Dispatch Assigned',
                message: `You have been assigned to respond to a ${typeName} in Barangay ${cleanBarangay}, Opol.`,
                incident_type: typeName,
                barangay: cleanBarangay,
                location: cleanLocation,
              };
            });
            setMissionRefreshTrigger(prev => prev + 1);
          }
        }
      } catch (err) {
        // Silently ignore network blips
      }
    };

    // Run initial check and then poll every 5 seconds
    checkActiveMissions();
    const interval = setInterval(checkActiveMissions, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.role, user?.id]);

  // Light notification handler for newly verified incidents (noticeable, gentle, not aggressive emergency alarm)
  const handleVerifiedIncidentNotification = (data: any) => {
    const rawId = data?.incident_id || data?.id;
    const incidentId = rawId ? Number(rawId) : null;

    if (incidentId && notifiedIncidentIds.current.has(incidentId)) {
      return;
    }
    if (incidentId) {
      notifiedIncidentIds.current.add(incidentId);
    }

    // 1. Light vibration (two gentle 150ms pulses, NOT continuous emergency siren loop)
    try {
      Vibration.vibrate([0, 150, 100, 150]);
    } catch (e) {
      console.log('Error triggering light vibration:', e);
    }

    // 2. Visual Toast banner
    const typeName = data?.incident_type || data?.type || 'Emergency';
    const loc = data?.location || data?.barangay || 'Opol, Misamis Oriental';

    Toast.show({
      type: 'info',
      text1: '🔔 New Verified Incident',
      text2: `${typeName} in ${loc} is verified and ready for dispatch.`,
      visibilityTime: 6000,
    });

    setLatestVerifiedIncident(data);
    setVerifiedIncidentsTrigger(prev => prev + 1);
  };

  // Register for Native FCM & Push Notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function registerTokens() {
      try {
        await notificationService.registerForPushNotificationsAsync();
      } catch (err) {
        console.warn('[MissionAlarmContext] Token registration error:', err);
      }
    }

    registerTokens();

    // Cold-start notification handling when opened by tapping an emergency notification
    notificationService.checkInitialNotification((response: any) => {
      const data = response?.notification?.request?.content?.data;
      if ((data?.type === 'dispatch_assigned' || data?.type === 'dispatch_reassigned' || data?.type === 'new_mission' || data?.event_type === 'dispatch_assigned') && data?.dispatch_id) {
        setIncomingMission(data);
        setMissionRefreshTrigger(prev => prev + 1);
        router.navigate('/(responder)/dispatch');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Handle Foreground Notifications and User Taps
  useEffect(() => {
    const handleNotificationPayload = (data: any, isTap: boolean = false) => {
      if ((data?.type === 'dispatch_assigned' || data?.type === 'dispatch_reassigned' || data?.type === 'new_mission' || data?.event_type === 'dispatch_assigned' || data?.event_type === 'dispatch_reassigned') && data?.dispatch_id) {
        setIncomingMission(data);
        setMissionRefreshTrigger(prev => prev + 1);
        if (isTap) {
          router.navigate('/(responder)/dispatch');
        }
      } else if (data?.type === 'dispatch_cancelled' || data?.event_type === 'dispatch_cancelled') {
        clearMission();
        Toast.show({
          type: 'info',
          text1: data?.title || 'Incident Cancelled',
          text2: data?.message || 'The emergency incident assigned to you has been cancelled.',
          visibilityTime: 6000,
        });
        setMissionRefreshTrigger(prev => prev + 1);
      } else if (data?.type === 'incident_updated' || data?.event_type === 'incident_updated') {
        Toast.show({
          type: 'info',
          text1: data?.title || 'Incident Information Updated',
          text2: data?.message || 'New information is available for your assigned incident.',
          visibilityTime: 6000,
        });
        setMissionRefreshTrigger(prev => prev + 1);
      } else if (data?.type === 'dispatch_accepted' || data?.event_type === 'dispatch_accepted') {
        clearMission();
        Toast.show({
          type: 'success',
          text1: data?.title || 'Dispatch Accepted',
          text2: data?.message || 'Your emergency dispatch has been successfully accepted.',
          visibilityTime: 5000,
        });
        setMissionRefreshTrigger(prev => prev + 1);
      } else if (data?.type === 'verified_incident_available') {
        handleVerifiedIncidentNotification(data);
        if (isTap) {
          router.navigate('/(responder)');
        }
      }
    };

    const cleanup = notificationService.setupNotificationListeners(
      (notification: any) => {
        handleNotificationPayload(notification.request.content.data, false);
      },
      (response: any) => {
        const actionIdentifier = response?.actionIdentifier;
        if (actionIdentifier === 'DISMISS_ALARM') {
          // Responder tapped "🔕 Silence Alarm" directly on the lock screen / notification banner
          stopSirenAndVibration();
          return;
        }

        // Tapping the notification itself or "🚨 View Mission"
        stopSirenAndVibration();
        handleNotificationPayload(response.notification.request.content.data, true);
      }
    );

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // Handle WebSocket Events (Personal Responder Channel & Team-wide Responders Channel)
  useEffect(() => {
    if (!echo || !user?.id || typeof (echo as any).private !== 'function') return;

    let userChannel: any = null;
    let respondersChannel: any = null;

    try {
      userChannel = (echo as any).private(`responder.${user.id}`);
      respondersChannel = (echo as any).private('responders');
    } catch (err) {
      console.warn('Failed to subscribe to responder realtime channels:', err);
      return;
    }

    const handleMissionEvent = (e: any) => {
      console.log('Realtime dispatch event received on responder channel:', e);
      const d = e.dispatch || e;
      const dispatchId = d?.id || e.dispatch_id;
      
      const crewUsers = d?.crew || [];
      const crewIds = crewUsers.map((c: any) => c.id || c.user_id);
      const userTeam = user?.responder_profile?.team || user?.team;
      const isForUser = 
        !user?.id ||
        d?.driver_id === user.id ||
        d?.emt_id === user.id ||
        crewIds.includes(user.id) ||
        (userTeam && d?.team && String(d.team).toLowerCase() === String(userTeam).toLowerCase());

      if (isForUser && dispatchId) {
        if (!dismissedMissionIds.current.has(dispatchId)) {
          const inc = d?.incident;
          const typeName = e.incident_type || inc?.incident_type?.name || inc?.incidentType?.name || 'Emergency Incident';
          const rawBarangay = e.barangay || inc?.barangay || inc?.resident?.resident_profile?.barangay?.barangay_name || 'Opol';
          const cleanBarangay = String(rawBarangay).replace(/^barangay\s+/i, '');
          const cleanLocation = e.location || inc?.clean_place_of_incident || inc?.place_of_incident || inc?.incident_address || `Barangay ${cleanBarangay}, Opol`;

          setIncomingMission({
            dispatch_id: dispatchId,
            dispatch: d,
            type: e.event_type || e.type || 'dispatch_assigned',
            event_type: e.event_type || e.type || 'dispatch_assigned',
            title: e.title || 'Emergency Dispatch Assigned',
            message: e.message || `You have been assigned to respond to a ${typeName} in Barangay ${cleanBarangay}, Opol.`,
            incident_type: typeName,
            barangay: cleanBarangay,
            location: cleanLocation,
          });
        }
        setMissionRefreshTrigger(prev => prev + 1);
      }
    };

    const handleStatusEvent = (e: any) => {
      console.log('Realtime dispatch status updated:', e);
      const d = e.dispatch || e;
      const status = d?.dispatch_status || e.status;
      const dispatchId = d?.id || e.dispatch_id;

      if (status === 'cancelled' || e.event_type === 'dispatch_cancelled') {
        // If current alarm is active for this dispatch, dismiss immediately
        setIncomingMission((curr: any) => {
          if (curr && (curr.dispatch_id === dispatchId || curr.dispatch?.id === dispatchId)) {
            Vibration.cancel();
            return null;
          }
          return curr;
        });

        Toast.show({
          type: 'info',
          text1: e.title || 'Incident Cancelled',
          text2: e.message || 'The incident assigned to you has been cancelled.',
          visibilityTime: 6000,
        });
      } else if (status === 'accepted' || e.event_type === 'dispatch_accepted') {
        // Mission accepted - clear alarm modal
        setIncomingMission((curr: any) => {
          if (curr && (curr.dispatch_id === dispatchId || curr.dispatch?.id === dispatchId)) {
            Vibration.cancel();
            return null;
          }
          return curr;
        });
      }

      setMissionRefreshTrigger(prev => prev + 1);
    };

    const handleVerifiedEvent = (e: any) => {
      console.log('Realtime IncidentVerified event received on responders channel:', e);
      const inc = e.incident || e;
      const notifData = e.notification || {
        incident_id: inc.id,
        incident_type: inc.incident_type?.name || 'Emergency',
        priority: inc.priority || 'Moderate',
        location: inc.place_of_incident || inc.incident_address || 'Opol, Misamis Oriental',
        barangay: inc.resident?.resident_profile?.barangay?.barangay_name || null,
        verified_at: inc.verified_at || new Date().toISOString(),
        report_source: inc.report_source,
      };
      handleVerifiedIncidentNotification(notifData);
    };

    if (userChannel) {
      userChannel.listen('DispatchCreated', handleMissionEvent);
      userChannel.listen('.DispatchCreated', handleMissionEvent);
      userChannel.listen('DispatchStatusUpdated', handleStatusEvent);
      userChannel.listen('.DispatchStatusUpdated', handleStatusEvent);
      userChannel.listen('IncidentVerified', handleVerifiedEvent);
      userChannel.listen('.IncidentVerified', handleVerifiedEvent);
    }

    if (respondersChannel) {
      respondersChannel.listen('DispatchCreated', handleMissionEvent);
      respondersChannel.listen('.DispatchCreated', handleMissionEvent);
      respondersChannel.listen('IncidentVerified', handleVerifiedEvent);
      respondersChannel.listen('.IncidentVerified', handleVerifiedEvent);
    }

    return () => {
      if (userChannel) {
        userChannel.stopListening('DispatchCreated');
        userChannel.stopListening('.DispatchCreated');
        userChannel.stopListening('DispatchStatusUpdated');
        userChannel.stopListening('.DispatchStatusUpdated');
        userChannel.stopListening('IncidentVerified');
        userChannel.stopListening('.IncidentVerified');
      }
      if (respondersChannel) {
        respondersChannel.stopListening('DispatchCreated');
        respondersChannel.stopListening('.DispatchCreated');
        respondersChannel.stopListening('IncidentVerified');
        respondersChannel.stopListening('.IncidentVerified');
      }
    };
  }, [echo, user]);

  // Audio & Haptic Siren Playback
  useEffect(() => {
    let activePlayer: AudioPlayer | null = null;
    let isCancelled = false;

    async function playAlarm() {
      if (incomingMission) {
        try {
          // Stop any existing vibration and audio before starting
          stopSirenAndVibration();

          // Vibrate phone continuously in emergency pulse pattern
          Vibration.vibrate([0, 600, 300, 600, 300, 1000], true);

          // Set audio mode to ensure alarm plays in BOTH foreground and background
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          });

          if (!isCancelled) {
            // Small delay to let audio session settle before playing
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (!isCancelled) {
              const player = createAudioPlayer(
                require('../../../assets/sounds/alarm.mp3'),
              );
              player.loop = true;
              player.volume = 1.0;
              player.play();
              activePlayer = player;
              soundRef.current = player;
              setSound(player);

              // SAFETY TIMEOUT (25 seconds):
              // Automatically stops continuous vibration & siren so the phone doesn't ring/vibrate forever
              // when the responder is outside the app or phone screen is locked/off!
              alarmTimeoutRef.current = setTimeout(() => {
                console.log('[MissionAlarmContext] Auto-silencing alarm after 25s timeout limit.');
                try {
                  Vibration.cancel();
                } catch (e) {}
                if (soundRef.current) {
                  try {
                    soundRef.current.pause();
                  } catch (e) {}
                }
              }, 25000);
            }
          }
        } catch (e) {
          console.log('Error playing alarm:', e);
        }
      } else {
        stopSirenAndVibration();
      }
    }

    playAlarm();

    return () => {
      isCancelled = true;
      stopSirenAndVibration();
    };
  }, [incomingMission]);

  const clearMission = () => {
    stopSirenAndVibration();
    if (incomingMission?.dispatch_id) {
      dismissedMissionIds.current.add(incomingMission.dispatch_id);
    }
    if (incomingMission?.dispatch?.id) {
      dismissedMissionIds.current.add(incomingMission.dispatch.id);
    }
    setIncomingMission(null);
  };

  // Alarm should continue ringing even when user backgrounds the app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if ((nextAppState === 'background' || nextAppState === 'inactive') && (sound || incomingMission)) {
        console.log('App in background - Mission alarm is still active!');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [sound]);

  const handleOpenMission = () => {
    clearMission();
    router.navigate('/(responder)/dispatch');
  };

  const dispatchInfo = incomingMission?.dispatch;
  const inc = dispatchInfo?.incident;
  const rawBarangay = incomingMission?.barangay || inc?.barangay || inc?.resident?.resident_profile?.barangay?.barangay_name || 'Opol';
  const cleanBarangay = String(rawBarangay).replace(/^barangay\s+/i, '');
  const incidentLocation =
    incomingMission?.location ||
    inc?.clean_place_of_incident ||
    inc?.place_of_incident ||
    inc?.incident_address ||
    (inc?.location_code ? `Marker ${inc.location_code}` : null) ||
    `Barangay ${cleanBarangay}, Opol`;
  const incidentType = incomingMission?.incident_type || inc?.incident_type?.name || inc?.incidentType?.name || 'Emergency Incident';

  // Synchronized Event-Specific Notification Title & Message from Backend
  const displayTitle = incomingMission?.title || 'Emergency Dispatch Assigned';
  const displaySubtitle =
    incomingMission?.message ||
    `You have been assigned to respond to a ${incidentType} in Barangay ${cleanBarangay}, Opol.`;

  return (
    <MissionAlarmContext.Provider
      value={{
        incomingMission,
        clearMission,
        missionRefreshTrigger,
        latestVerifiedIncident,
        clearVerifiedNotification: () => setLatestVerifiedIncident(null),
        verifiedIncidentsTrigger,
      }}
    >
      {children}
      {incomingMission && (
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={clearMission}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color="#EF4444" />
            </View>
            <Text style={styles.title}>{displayTitle}</Text>
            <Text style={styles.subtitle}>{displaySubtitle}</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Activity size={16} color="#EF4444" />
                <Text style={styles.infoTextBold}>{incidentType}</Text>
              </View>
              <View style={[styles.infoRow, { marginTop: 6 }]}>
                <MapPin size={16} color="#64748B" />
                <Text style={styles.infoText} numberOfLines={2}>{incidentLocation}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={handleOpenMission}>
              <Text style={styles.buttonText}>OPEN MISSION DETAILS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={clearMission}>
              <Text style={styles.dismissText}>Silence / Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </MissionAlarmContext.Provider>
  );
}

export const useMissionAlarm = () => useContext(MissionAlarmContext);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 100,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 28,
    width: width * 0.88,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
