import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { AlertTriangle, X } from 'lucide-react-native';
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
}

const MissionAlarmContext = createContext<MissionAlarmContextType>({
  incomingMission: null,
  clearMission: () => {},
});

const { width, height } = Dimensions.get('window');

export function MissionAlarmProvider({ children }: { children: React.ReactNode }) {
  const [incomingMission, setIncomingMission] = useState<any>(null);
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
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'mdrrmo-mobile', 
        });
        token = tokenResponse.data;
        if (isMounted) {
          await updatePushTokenApi(token);
        }
      } catch (e) {
        console.log('Error getting push token:', e);
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
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'new_mission' && data?.dispatch_id) {
        setIncomingMission(data);
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Handle WebSocket Event
  useEffect(() => {
    if (!echo || !user?.id) return;

    const channel = (echo as any).private(`responder.${user.id}`);
    channel.listen('DispatchCreated', (e: any) => {
       console.log('DispatchCreated received via WS:', e);
       setIncomingMission({ dispatch_id: e.dispatch?.id, type: 'new_mission' });
    });

    return () => {
      channel.stopListening('DispatchCreated');
    };
  }, [echo, user]);

  // Audio Playback
  useEffect(() => {
    async function playAlarm() {
      if (incomingMission && !sound) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          });
          const player = createAudioPlayer(
            require('../../../assets/sounds/alarm.mp3'),
          );
          player.loop = true;
          player.volume = 1.0;
          player.play();
          setSound(player);
        } catch (e) {
          console.log('Error playing alarm:', e);
        }
      } else if (!incomingMission && sound) {
        sound.pause();
        sound.release();
        setSound(null);
      }
    }
    playAlarm();
  }, [incomingMission]);

  const clearMission = () => {
    setIncomingMission(null);
  };

  const handleOpenMission = () => {
    clearMission();
    router.push('/(responder)/dispatch');
  };

  return (
    <MissionAlarmContext.Provider value={{ incomingMission, clearMission }}>
      {children}
      {incomingMission && (
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color="#EF4444" />
            </View>
            <Text style={styles.title}>NEW MISSION ASSIGNED</Text>
            <Text style={styles.subtitle}>You have been assigned to a new emergency dispatch.</Text>
            
            <TouchableOpacity style={styles.button} onPress={handleOpenMission}>
              <Text style={styles.buttonText}>OPEN MISSION DETAILS</Text>
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
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 100,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 24,
    width: width * 0.85,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
