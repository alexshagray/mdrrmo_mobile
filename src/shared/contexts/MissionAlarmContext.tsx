import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { AlertTriangle, X, MapPin, Activity } from 'lucide-react-native';
import Constants from 'expo-constants';
import { updatePushTokenApi } from '../api/auth';
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
}

const MissionAlarmContext = createContext<MissionAlarmContextType>({
  incomingMission: null,
  clearMission: () => {},
  missionRefreshTrigger: 0,
});

const { width, height } = Dimensions.get('window');

export function MissionAlarmProvider({ children }: { children: React.ReactNode }) {
  const [incomingMission, setIncomingMission] = useState<any>(null);
  const [missionRefreshTrigger, setMissionRefreshTrigger] = useState<number>(0);
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const { user, isAuthenticated } = useAuth();
  const { echo } = useRealtime();
  const router = useRouter();

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
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'new_mission' && data?.dispatch_id) {
        setIncomingMission(data);
        setMissionRefreshTrigger(prev => prev + 1);
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Handle WebSocket Event
  useEffect(() => {
    if (!echo || !user?.id || typeof (echo as any).private !== 'function') return;

    let channel: any = null;
    try {
      channel = (echo as any).private(`responder.${user.id}`);
    } catch (err) {
      console.warn('Failed to subscribe to responder private channel:', err);
      return;
    }

    if (!channel) return;

    const handleMissionEvent = (e: any) => {
      console.log('Realtime dispatch event received on responder channel:', e);
      const dispatchId = e.dispatch?.id || e.id;
      setIncomingMission({
        dispatch_id: dispatchId,
        dispatch: e.dispatch,
        type: 'new_mission',
      });
      setMissionRefreshTrigger(prev => prev + 1);
    };

    const handleStatusEvent = (e: any) => {
      console.log('Realtime dispatch status updated:', e);
      setMissionRefreshTrigger(prev => prev + 1);
    };

    channel.listen('DispatchCreated', handleMissionEvent);
    channel.listen('.DispatchCreated', handleMissionEvent);
    channel.listen('DispatchStatusUpdated', handleStatusEvent);
    channel.listen('.DispatchStatusUpdated', handleStatusEvent);

    return () => {
      if (channel) {
        channel.stopListening('DispatchCreated');
        channel.stopListening('.DispatchCreated');
        channel.stopListening('DispatchStatusUpdated');
        channel.stopListening('.DispatchStatusUpdated');
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

          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          });

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
    setIncomingMission(null);
  };

  const handleOpenMission = () => {
    clearMission();
    router.push('/(responder)/dispatch');
  };

  const dispatchInfo = incomingMission?.dispatch;
  const incidentLocation = dispatchInfo?.incident?.location || dispatchInfo?.incident?.barangay || 'Emergency Location';
  const incidentType = dispatchInfo?.incident?.incident_type?.name || 'Emergency Dispatch';

  return (
    <MissionAlarmContext.Provider value={{ incomingMission, clearMission, missionRefreshTrigger }}>
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
