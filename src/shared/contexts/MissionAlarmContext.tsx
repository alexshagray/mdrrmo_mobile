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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
              return {
                dispatch_id: latest.id,
                dispatch: latest,
                type: 'new_mission',
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

  // Register for Push Notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function registerForPushNotificationsAsync() {
      let token;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId =
          process.env.EXPO_PUBLIC_PROJECT_ID ||
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        token = tokenResponse.data;
        if (isMounted) {
          await updatePushTokenApi(token);
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (msg.includes('FirebaseApp is not initialized') || msg.includes('googleServicesFile')) {
          console.log('[PushNotifications] Dev client running without google-services.json; push notifications disabled for this test session.');
        } else {
          console.log('Error getting push token:', e);
        }
      }
    }

    registerForPushNotificationsAsync();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Handle Foreground Notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'new_mission' && data?.dispatch_id) {
        setIncomingMission(data);
        setMissionRefreshTrigger(prev => prev + 1);
      } else if (data?.type === 'verified_incident_available') {
        handleVerifiedIncidentNotification(data);
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'new_mission' && data?.dispatch_id) {
        setIncomingMission(data);
        setMissionRefreshTrigger(prev => prev + 1);
      } else if (data?.type === 'verified_incident_available') {
        handleVerifiedIncidentNotification(data);
        router.push('/(responder)');
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
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
          setIncomingMission({
            dispatch_id: dispatchId,
            dispatch: d,
            type: 'new_mission',
          });
        }
        setMissionRefreshTrigger(prev => prev + 1);
      }
    };

    const handleStatusEvent = (e: any) => {
      console.log('Realtime dispatch status updated:', e);
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
          // Vibrate phone continuously in emergency pulse pattern
          Vibration.vibrate([0, 600, 300, 600, 300, 1000], true);

          // Set audio mode to ensure alarm plays in foreground and overrides silent mode
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
            staysActiveInBackground: false,
          });

          if (!isCancelled) {
            // Small delay to let audio session settle before playing
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!isCancelled) {
              const player = createAudioPlayer(
                require('../../../assets/sounds/alarm.mp3'),
              );
              player.loop = true;
              player.volume = 1.0;
              player.play();
              activePlayer = player;
              setSound(player);
            }
          }
        } catch (e) {
          console.log('Error playing alarm:', e);
        }
      } else {
        Vibration.cancel();
        if (sound) {
          try {
            sound.pause();
            if (typeof sound.remove === 'function') {
              sound.remove();
            }
          } catch (e) {
            console.log('Error stopping sound:', e);
          }
          setSound(null);
        }
      }
    }

    playAlarm();

    return () => {
      isCancelled = true;
      Vibration.cancel();
      if (activePlayer) {
        try {
          activePlayer.pause();
          if (typeof activePlayer.remove === 'function') {
            activePlayer.remove();
          }
        } catch (e) {}
      }
    };
  }, [incomingMission]);

  const clearMission = () => {
    Vibration.cancel();
    if (sound) {
      try {
        sound.pause();
        if (typeof sound.remove === 'function') {
          sound.remove();
        }
      } catch (e) {}
      setSound(null);
    }
    if (incomingMission?.dispatch_id) {
      dismissedMissionIds.current.add(incomingMission.dispatch_id);
    }
    if (incomingMission?.dispatch?.id) {
      dismissedMissionIds.current.add(incomingMission.dispatch.id);
    }
    setIncomingMission(null);
  };

  // Stop alarm when user backgrounds the app (goes to Facebook, etc.)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Stop audio but keep the incomingMission state so alarm re-triggers when they return
        Vibration.cancel();
        if (sound) {
          try {
            sound.pause();
          } catch (e) {}
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [sound]);

  const handleOpenMission = () => {
    clearMission();
    router.push('/(responder)/dispatch');
  };

  const dispatchInfo = incomingMission?.dispatch;
  const inc = dispatchInfo?.incident;
  const incidentLocation =
    inc?.place_of_incident ||
    inc?.incident_address ||
    (inc?.location_code ? `Marker ${inc.location_code}` : null) ||
    inc?.location ||
    inc?.barangay ||
    inc?.resident?.resident_profile?.barangay?.barangay_name ||
    'Emergency Location';
  const incidentType = inc?.incident_type?.name || 'Emergency Dispatch';

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
            <Text style={styles.title}>NEW MISSION ASSIGNED</Text>
            <Text style={styles.subtitle}>You have been assigned to a new emergency dispatch.</Text>

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
    fontSize: 22,
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
