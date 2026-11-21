import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Vibration, AppState, AppStateStatus, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getActiveDispatches, acknowledgeDispatch } from '../api/dispatches';
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

const ACKNOWLEDGED_DISPATCHES_KEY = '@mdrrmo_acknowledged_dispatches_v1';

interface MissionAlarmContextType {
  incomingMission: any;
  clearMission: (dispatchId?: number | string) => void;
  stopAlarm: (dispatchId?: number | string) => void;
  silenceMission: (dispatchId: number | string) => void;
  acknowledgeMission: (dispatchId: number | string) => Promise<boolean>;
  missionRefreshTrigger: number;
  latestVerifiedIncident: any;
  clearVerifiedNotification: () => void;
  verifiedIncidentsTrigger: number;
  isAlarmActive: boolean;
}

const MissionAlarmContext = createContext<MissionAlarmContextType>({
  incomingMission: null,
  clearMission: () => {},
  stopAlarm: () => {},
  silenceMission: () => {},
  acknowledgeMission: async () => false,
  missionRefreshTrigger: 0,
  latestVerifiedIncident: null,
  clearVerifiedNotification: () => {},
  verifiedIncidentsTrigger: 0,
  isAlarmActive: false,
});

const { width } = Dimensions.get('window');

export function MissionAlarmProvider({ children }: { children: React.ReactNode }) {
  const [incomingMission, setIncomingMission] = useState<any>(null);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [missionRefreshTrigger, setMissionRefreshTrigger] = useState<number>(0);
  const [latestVerifiedIncident, setLatestVerifiedIncident] = useState<any>(null);
  const [verifiedIncidentsTrigger, setVerifiedIncidentsTrigger] = useState<number>(0);
  const [sound, setSound] = useState<AudioPlayer | null>(null);

  const { user, isAuthenticated } = useAuth();
  const { echo } = useRealtime();
  const router = useRouter();

  // Deduplication tracker: prevent repeated alerts for the same verified incident
  const notifiedIncidentIds = useRef<Set<number>>(new Set());
  // Acknowledged tracker: persists dispatch IDs that have been confirmed acknowledged
  const acknowledgedMissionIds = useRef<Set<number>>(new Set());
  // Silenced tracker: prevents alarm from re-triggering sound once the responder has opened the app
  const silencedDispatchIds = useRef<Set<number>>(new Set());

  // Active sound, listener subscription, watchdog, active players, and playing state refs
  const soundRef = useRef<AudioPlayer | null>(null);
  const playerSubRef = useRef<any>(null);
  const isAlarmPlayingRef = useRef<boolean>(false);
  const activeAlarmDispatchIdRef = useRef<number | null>(null);
  const alarmWatchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activePlayersRef = useRef<Set<AudioPlayer>>(new Set());
  const autoOffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persistent acknowledged dispatch IDs from AsyncStorage on mount
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(ACKNOWLEDGED_DISPATCHES_KEY)
      .then((raw) => {
        if (!isMounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => acknowledgedMissionIds.current.add(Number(id)));
          }
        } catch (_) {}
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Complete teardown of all audio players to prevent leaked native background playback
   */
  const cleanupAllAudioPlayers = useCallback(async () => {
    if (playerSubRef.current) {
      try {
        playerSubRef.current.remove();
      } catch (_) {}
      playerSubRef.current = null;
    }

    const playersToClean = Array.from(activePlayersRef.current);
    if (soundRef.current && !activePlayersRef.current.has(soundRef.current)) {
      playersToClean.push(soundRef.current);
    }
    activePlayersRef.current.clear();

    for (const p of playersToClean) {
      try {
        p.loop = false;
        p.volume = 0;
        p.pause();
        p.seekTo(0);
        if (typeof (p as any).setActiveForLockScreen === 'function') {
          (p as any).setActiveForLockScreen(false);
        }
        if (typeof (p as any).clearLockScreenControls === 'function') {
          (p as any).clearLockScreenControls();
        }
        if (typeof (p as any).release === 'function') {
          (p as any).release();
        }
        if (typeof (p as any).remove === 'function') {
          (p as any).remove();
        }
      } catch (_) {}
    }

    soundRef.current = null;
    setSound(null);

    // Deactivate background audio session
    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
    } catch (_) {}
  }, []);

  /**
   * Initializes or recovers the native audio player with continuous loop status listener
   * and Android MediaSession background capabilities.
   */
  const initOrRestartAudioPlayer = useCallback(async () => {
    if (!isAlarmPlayingRef.current) {
      return null;
    }

    try {
      await cleanupAllAudioPlayers();

      if (!isAlarmPlayingRef.current) {
        return null;
      }

      // Configure audio mode to guarantee background & lockscreen playback with exclusive focus
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });

      if (!isAlarmPlayingRef.current) {
        return null;
      }

      // Create new player with 250ms updateInterval for ultra-responsive loop detection
      const player = createAudioPlayer(
        require('../../../assets/sounds/alarm.mp3'),
        { updateInterval: 250 }
      );
      player.loop = true;
      player.volume = 1.0;
      activePlayersRef.current.add(player);

      // Enable lockscreen media controls (binds Android MediaSessionService for sustained background playback)
      if (typeof (player as any).setActiveForLockScreen === 'function') {
        try {
          (player as any).setActiveForLockScreen(true, {
            title: '🚨 CRITICAL EMERGENCY DISPATCH',
            artist: 'MDRRMO OPOL RESQ',
            album: 'Emergency Alert',
          });
        } catch (lockErr) {
          console.warn('[MissionAlarmContext] Lockscreen setup notice:', lockErr);
        }
      }

      // Continuous loop listener: re-seek to 0 and re-play when audio finishes
      const sub = player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (!isAlarmPlayingRef.current) {
          try {
            player.loop = false;
            player.volume = 0;
            player.pause();
          } catch (_) {}
          return;
        }

        if (
          status?.didJustFinish ||
          (!status?.playing && status?.currentTime > 0 && status?.currentTime >= ((status?.duration || 183) - 0.3))
        ) {
          try {
            player.seekTo(0);
            player.play();
          } catch (loopErr) {
            console.warn('[MissionAlarmContext] Native loop re-seek notice:', loopErr);
          }
        }
      });
      playerSubRef.current = sub;

      if (isAlarmPlayingRef.current) {
        player.play();
        soundRef.current = player;
        setSound(player);
        return player;
      } else {
        try {
          player.loop = false;
          player.volume = 0;
          player.pause();
        } catch (_) {}
        return null;
      }
    } catch (e) {
      console.warn('[MissionAlarmContext] Error initiating emergency sound playback:', e);
      return null;
    }
  }, [cleanupAllAudioPlayers]);

  /**
   * Stop the looping emergency siren, vibration, watchdog, and auto-off timer
   */
  const stopSirenAndVibration = useCallback((dispatchId?: number | string) => {
    console.log('[MissionAlarmContext] 🔕 Silencing alarm and canceling all audio/vibration');
    isAlarmPlayingRef.current = false;

    const currentId = dispatchId ? Number(dispatchId) : activeAlarmDispatchIdRef.current;
    if (currentId) {
      silencedDispatchIds.current.add(currentId);
      acknowledgedMissionIds.current.add(currentId);
      try {
        AsyncStorage.setItem(ACKNOWLEDGED_DISPATCHES_KEY, JSON.stringify(Array.from(acknowledgedMissionIds.current))).catch(() => {});
      } catch (_) {}
    }

    activeAlarmDispatchIdRef.current = null;
    setIsAlarmActive(false);

    if (alarmWatchdogIntervalRef.current) {
      clearInterval(alarmWatchdogIntervalRef.current);
      alarmWatchdogIntervalRef.current = null;
    }

    if (autoOffTimeoutRef.current) {
      clearTimeout(autoOffTimeoutRef.current);
      autoOffTimeoutRef.current = null;
    }

    try {
      Vibration.cancel();
    } catch (_) {}

    // Dismiss notifications from Android tray so native sound terminates immediately
    Notifications.dismissAllNotificationsAsync().catch(() => {});

    cleanupAllAudioPlayers().catch(() => {});
  }, [cleanupAllAudioPlayers]);

  /**
   * Permanently silence an active or incoming mission
   */
  const silenceMission = useCallback((dispatchId: number | string) => {
    const numId = Number(dispatchId);
    if (numId) {
      silencedDispatchIds.current.add(numId);
      acknowledgedMissionIds.current.add(numId);
      try {
        AsyncStorage.setItem(ACKNOWLEDGED_DISPATCHES_KEY, JSON.stringify(Array.from(acknowledgedMissionIds.current))).catch(() => {});
      } catch (_) {}
    }
    stopSirenAndVibration(numId);
    setIncomingMission(null);
  }, [stopSirenAndVibration]);

  /**
   * Start persistent continuous looping alarm (both audio and haptics)
   * Auto-shuts off after 3 minutes (180s) or immediately when responder opens app
   */
  const startLoopingAlarm = useCallback(
    async (dispatchId: number, missionData: any) => {
      const numId = Number(dispatchId);
      if (!numId) return;

      // Do NOT alarm if this dispatch has already been acknowledged or silenced
      if (acknowledgedMissionIds.current.has(numId) || silencedDispatchIds.current.has(numId)) {
        return;
      }

      // If responder is ALREADY active inside the app, do NOT sound the loud continuous siren!
      // Simply show the high-priority emergency banner on screen with a light pulse
      if (AppState.currentState === 'active') {
        console.log(`[MissionAlarmContext] App is currently active foreground -> showing banner without loud siren for dispatch #${numId}`);
        activeAlarmDispatchIdRef.current = numId;
        setIsAlarmActive(true);
        setIncomingMission(missionData);
        try {
          Vibration.vibrate([0, 400, 200, 400]);
        } catch (_) {}
        return;
      }

      // If already playing for this exact dispatch, verify playback health and do not duplicate
      if (isAlarmPlayingRef.current && activeAlarmDispatchIdRef.current === numId) {
        if (soundRef.current && !soundRef.current.playing) {
          try {
            soundRef.current.play();
          } catch (_) {
            initOrRestartAudioPlayer();
          }
        }
        return;
      }

      console.log(`[MissionAlarmContext] 🚨 STARTING 3-MINUTE EMERGENCY ALARM for dispatch #${numId}`);

      activeAlarmDispatchIdRef.current = numId;
      isAlarmPlayingRef.current = true;
      setIsAlarmActive(true);
      setIncomingMission(missionData);

      // Continuous emergency pulse vibration pattern: [wait, vibrate, pause, vibrate, pause, long vibrate]
      try {
        Vibration.cancel();
        Vibration.vibrate([0, 600, 300, 600, 300, 1000], true);
      } catch (_) {}

      // Start continuous audio playback
      await initOrRestartAudioPlayer();

      // Clear any prior watchdog interval
      if (alarmWatchdogIntervalRef.current) {
        clearInterval(alarmWatchdogIntervalRef.current);
      }

      // Watchdog ticker: every 3.5 seconds, verifies that audio and vibration are repeating
      alarmWatchdogIntervalRef.current = setInterval(async () => {
        if (!isAlarmPlayingRef.current || !activeAlarmDispatchIdRef.current) {
          if (alarmWatchdogIntervalRef.current) {
            clearInterval(alarmWatchdogIntervalRef.current);
            alarmWatchdogIntervalRef.current = null;
          }
          return;
        }

        try {
          Vibration.vibrate([0, 600, 300, 600, 300, 1000], true);

          if (soundRef.current) {
            if (!soundRef.current.playing && isAlarmPlayingRef.current) {
              soundRef.current.play();
            }
          } else if (isAlarmPlayingRef.current) {
            await initOrRestartAudioPlayer();
          }
        } catch (watchdogErr) {
          console.warn('[MissionAlarmContext] Watchdog ticker error:', watchdogErr);
        }
      }, 3500);

      // 3-MINUTE HARD AUTO-OFF TIMEOUT:
      // Turns off the siren and vibration automatically after 3 minutes (180,000ms)
      if (autoOffTimeoutRef.current) {
        clearTimeout(autoOffTimeoutRef.current);
      }
      autoOffTimeoutRef.current = setTimeout(() => {
        console.log(`[MissionAlarmContext] ⏰ 3 minutes limit reached for dispatch #${numId} -> automatically shutting off`);
        silencedDispatchIds.current.add(numId);
        stopSirenAndVibration(numId);
      }, 180000); // 3 minutes = 180,000ms
    },
    [initOrRestartAudioPlayer, stopSirenAndVibration]
  );

  /**
   * Send acknowledgment to Laravel backend and stop alarm
   */
  const acknowledgeMission = useCallback(
    async (dispatchId: number | string): Promise<boolean> => {
      const numId = Number(dispatchId);
      if (!numId) return false;

      // Always stop the alarm immediately when acknowledge is requested
      stopSirenAndVibration(numId);
      silencedDispatchIds.current.add(numId);
      acknowledgedMissionIds.current.add(numId);

      try {
        console.log(`[MissionAlarmContext] Acknowledging dispatch #${numId} with Laravel backend...`);
        const res = await acknowledgeDispatch(numId);

        if (res?.success || res?.data?.acknowledgment_status === 'acknowledged' || res?.already_acknowledged) {
          console.log(`[MissionAlarmContext] ✅ Laravel confirmed acknowledgment for dispatch #${numId}`);
          try {
            const idList = Array.from(acknowledgedMissionIds.current);
            await AsyncStorage.setItem(ACKNOWLEDGED_DISPATCHES_KEY, JSON.stringify(idList));
          } catch (_) {}

          setIncomingMission(null);
          setMissionRefreshTrigger((prev) => prev + 1);
          return true;
        } else {
          return true;
        }
      } catch (err) {
        console.error(`[MissionAlarmContext] Error during dispatch acknowledgment #${numId}:`, err);
        return true;
      }
    },
    [stopSirenAndVibration]
  );

  const clearMission = useCallback((dispatchId?: number | string) => {
    const idToClear = dispatchId ? Number(dispatchId) : (incomingMission?.dispatch_id ? Number(incomingMission.dispatch_id) : (incomingMission?.dispatch?.id ? Number(incomingMission.dispatch.id) : null));
    if (idToClear) {
      acknowledgedMissionIds.current.add(idToClear);
      silencedDispatchIds.current.add(idToClear);
      try {
        AsyncStorage.setItem(ACKNOWLEDGED_DISPATCHES_KEY, JSON.stringify(Array.from(acknowledgedMissionIds.current))).catch(() => {});
      } catch (_) {}
    }
    stopSirenAndVibration(idToClear || undefined);
    setIncomingMission(null);
  }, [incomingMission, stopSirenAndVibration]);

  // Setup Android notification channels on mount
  useEffect(() => {
    notificationService.setupNotificationChannels();
  }, []);

  // Periodic heartbeat: check for unacknowledged active dispatches
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'responder') return;

    let isMounted = true;

    const checkActiveMissions = async () => {
      try {
        const res = await getActiveDispatches();
        if (!isMounted) return;
        const activeList = (res?.data || []).filter(
          (item: any) => !['completed', 'cancelled'].includes(item.dispatch_status)
        );

        if (activeList.length > 0) {
          const latest = activeList[0];
          const latestId = Number(latest.id);

          // If dispatch is assigned and NOT acknowledged or silenced yet:
          if (
            latest.dispatch_status === 'assigned' &&
            latest.acknowledgment_status !== 'acknowledged' &&
            !acknowledgedMissionIds.current.has(latestId) &&
            !silencedDispatchIds.current.has(latestId)
          ) {
            const inc = latest.incident;
            const typeName = inc?.incident_type?.name || inc?.incidentType?.name || 'Emergency Incident';
            const rawBarangay = inc?.barangay || inc?.resident?.resident_profile?.barangay?.barangay_name || 'Opol';
            const cleanBarangay = String(rawBarangay).replace(/^barangay\s+/i, '');
            const cleanLocation = inc?.place_of_incident || inc?.incident_address || `Barangay ${cleanBarangay}, Opol`;

            const missionData = {
              dispatch_id: latestId,
              dispatch: latest,
              type: 'dispatch_assigned',
              event_type: 'dispatch_assigned',
              title: 'Emergency Dispatch Assigned',
              message: `You have been assigned to respond to a ${typeName} in Barangay ${cleanBarangay}, Opol.`,
              incident_type: typeName,
              barangay: cleanBarangay,
              location: cleanLocation,
            };

            setIncomingMission(missionData);
            startLoopingAlarm(latestId, missionData);
            setMissionRefreshTrigger((prev) => prev + 1);
          } else if (
            latest.acknowledgment_status === 'acknowledged' ||
            ['accepted', 'en_route', 'arrived_on_scene'].includes(latest.dispatch_status)
          ) {
            // Already acknowledged, accepted, or en route: ensure alarm is stopped
            acknowledgedMissionIds.current.add(latestId);
            silencedDispatchIds.current.add(latestId);
            stopSirenAndVibration(latestId);
            setIncomingMission(null);
          }
        } else {
          // No active dispatches: unconditionally ensure alarm and vibration are stopped
          stopSirenAndVibration();
          setIncomingMission(null);
        }
      } catch (_) {
        // Quiet network error handling
      }
    };

    checkActiveMissions();
    const interval = setInterval(checkActiveMissions, 4500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, user?.role, user?.id, startLoopingAlarm, stopSirenAndVibration]);

  // Light notification handler for newly verified incidents (noticeable, gentle)
  const handleVerifiedIncidentNotification = (data: any) => {
    const rawId = data?.incident_id || data?.id;
    const incidentId = rawId ? Number(rawId) : null;

    if (incidentId && notifiedIncidentIds.current.has(incidentId)) {
      return;
    }
    if (incidentId) {
      notifiedIncidentIds.current.add(incidentId);
    }

    try {
      Vibration.vibrate([0, 150, 100, 150]);
    } catch (_) {}

    const typeName = data?.incident_type || data?.type || 'Emergency';
    const loc = data?.location || data?.barangay || 'Opol, Misamis Oriental';

    Toast.show({
      type: 'info',
      text1: '🔔 New Verified Incident',
      text2: `${typeName} in ${loc} is verified and ready for dispatch.`,
      visibilityTime: 6000,
    });

    setLatestVerifiedIncident(data);
    setVerifiedIncidentsTrigger((prev) => prev + 1);
  };

  // Register push tokens and cold-start notification handling
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function registerTokens() {
      try {
        await notificationService.registerForPushNotificationsAsync();
      } catch (err) {
        console.warn('[MissionAlarmContext] Push registration warning:', err);
      }
    }

    registerTokens();

    // Cold-start notification handling: when opened by tapping an emergency notification
    notificationService.checkInitialNotification((response: any) => {
      console.log('[MissionAlarmContext] 📱 Cold-start notification tapped by responder:', response);
      const data = response?.notification?.request?.content?.data;
      const rawDispatchId = data?.dispatch_id || data?.id;

      // Automatically silence alarm sound and dismiss notification because responder opened the app!
      stopSirenAndVibration();
      Notifications.dismissAllNotificationsAsync().catch(() => {});

      if (rawDispatchId) {
        const dispatchId = Number(rawDispatchId);
        silencedDispatchIds.current.add(dispatchId);
        // Direct the user immediately to the mission dispatch screen!
        setTimeout(() => {
          try {
            router.navigate('/(responder)/dispatch');
          } catch (_) {
            router.replace('/(responder)/dispatch');
          }
        }, 150);
      } else {
        setTimeout(() => {
          try {
            router.navigate('/(responder)');
          } catch (_) {}
        }, 150);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, stopSirenAndVibration, router]);

  // Handle Foreground Notifications and User Taps
  useEffect(() => {
    const handleNotificationPayload = (data: any, isTap: boolean = false) => {
      console.log(`[MissionAlarmContext] Notification payload received (isTap = ${isTap}):`, data);

      const rawDispatchId = data?.dispatch_id || data?.id;
      const dispatchId = rawDispatchId ? Number(rawDispatchId) : null;

      // 1. If responder tapped the notification: they are actively opening the app!
      // Immediately stop all sirens and vibrations, silence this dispatch, and direct to screen.
      // NEVER start the alarm on user tap!
      if (isTap) {
        console.log(`[MissionAlarmContext] 🚀 Notification banner tapped! User opened app -> stopping alarm. rawDispatchId:`, rawDispatchId);
        if (dispatchId) {
          silencedDispatchIds.current.add(dispatchId);
        }
        stopSirenAndVibration(dispatchId || undefined);
        Notifications.dismissAllNotificationsAsync().catch(() => {});

        if (dispatchId) {
          try {
            router.navigate('/(responder)/dispatch');
          } catch (_) {
            router.replace('/(responder)/dispatch');
          }
        } else {
          try {
            router.navigate('/(responder)');
          } catch (_) {
            router.replace('/(responder)');
          }
        }
        return;
      }

      const isDispatchAlert =
        data?.type === 'dispatch_assigned' ||
        data?.type === 'dispatch_reassigned' ||
        data?.type === 'dispatch_received' ||
        data?.type === 'new_mission' ||
        data?.event_type === 'dispatch_assigned' ||
        data?.event_type === 'dispatch_reassigned' ||
        data?.event_type === 'dispatch_received';

      if (isDispatchAlert && dispatchId) {
        if (!acknowledgedMissionIds.current.has(dispatchId) && !silencedDispatchIds.current.has(dispatchId)) {
          startLoopingAlarm(dispatchId, data);
        }
      } else if (data?.type === 'dispatch_cancelled' || data?.event_type === 'dispatch_cancelled') {
        stopSirenAndVibration(dispatchId || undefined);
        setIncomingMission(null);
        Toast.show({
          type: 'info',
          text1: data?.title || 'Incident Cancelled',
          text2: data?.message || 'The emergency incident assigned to you has been cancelled.',
          visibilityTime: 6000,
        });
        setMissionRefreshTrigger((prev) => prev + 1);
      } else if (data?.type === 'dispatch_accepted' || data?.event_type === 'dispatch_accepted') {
        stopSirenAndVibration(dispatchId || undefined);
        setIncomingMission(null);
        setMissionRefreshTrigger((prev) => prev + 1);
      } else if (data?.type === 'verified_incident_available') {
        handleVerifiedIncidentNotification(data);
      }
    };

    const cleanup = notificationService.setupNotificationListeners(
      (notification: any) => {
        handleNotificationPayload(notification.request.content.data, false);
      },
      (response: any) => {
        // When user taps notification, auto-navigate to Mission Details
        handleNotificationPayload(response.notification.request.content.data, true);
      }
    );

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [startLoopingAlarm, stopSirenAndVibration, router]);

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
      const dispatchId = d?.id ? Number(d.id) : (e.dispatch_id ? Number(e.dispatch_id) : null);

      const crewUsers = d?.crew || [];
      const crewIds = crewUsers.map((c: any) => Number(c.id || c.user_id));
      const currentUserId = user?.id ? Number(user.id) : null;
      const driverId = d?.driver_id ? Number(d.driver_id) : null;
      const emtId = d?.emt_id ? Number(d.emt_id) : null;

      // The mission is strictly for this user ONLY if they are explicitly assigned in the crew, as driver, or as emt.
      // Unchecked members of the same team must NOT receive the mission or sound the alarm.
      const isForUser =
        currentUserId !== null &&
        (driverId === currentUserId ||
          emtId === currentUserId ||
          crewIds.includes(currentUserId));

      if (isForUser && dispatchId) {
        if (!acknowledgedMissionIds.current.has(dispatchId) && !silencedDispatchIds.current.has(dispatchId)) {
          const inc = d?.incident;
          const typeName =
            e.incident_type || inc?.incident_type?.name || inc?.incidentType?.name || 'Emergency Incident';
          const rawBarangay =
            e.barangay || inc?.barangay || inc?.resident?.resident_profile?.barangay?.barangay_name || 'Opol';
          const cleanBarangay = String(rawBarangay).replace(/^barangay\s+/i, '');
          const cleanLocation =
            e.location ||
            inc?.clean_place_of_incident ||
            inc?.place_of_incident ||
            inc?.incident_address ||
            `Barangay ${cleanBarangay}, Opol`;

          const missionData = {
            dispatch_id: dispatchId,
            dispatch: d,
            type: e.event_type || e.type || 'dispatch_assigned',
            event_type: e.event_type || e.type || 'dispatch_assigned',
            title: e.title || 'Emergency Dispatch Assigned',
            message: e.message || `You have been assigned to respond to a ${typeName} in Barangay ${cleanBarangay}, Opol.`,
            incident_type: typeName,
            barangay: cleanBarangay,
            location: cleanLocation,
          };

          startLoopingAlarm(dispatchId, missionData);
        }
        setMissionRefreshTrigger((prev) => prev + 1);
      }
    };

    const handleStatusEvent = (e: any) => {
      const d = e.dispatch || e;
      const status = d?.dispatch_status || e.status;
      const dispatchId = d?.id ? Number(d.id) : (e.dispatch_id ? Number(e.dispatch_id) : null);

      if (status === 'cancelled' || e.event_type === 'dispatch_cancelled') {
        if (dispatchId) {
          silencedDispatchIds.current.add(dispatchId);
          acknowledgedMissionIds.current.add(dispatchId);
        }
        stopSirenAndVibration(dispatchId || undefined);
        setIncomingMission(null);
        Toast.show({
          type: 'info',
          text1: e.title || 'Incident Cancelled',
          text2: e.message || 'The incident assigned to you has been cancelled.',
          visibilityTime: 6000,
        });
      } else if (
        status === 'accepted' ||
        status === 'completed' ||
        e.event_type === 'dispatch_accepted' ||
        e.acknowledgment_status === 'acknowledged'
      ) {
        if (dispatchId) {
          acknowledgedMissionIds.current.add(dispatchId);
          silencedDispatchIds.current.add(dispatchId);
        }
        stopSirenAndVibration(dispatchId || undefined);
        setIncomingMission(null);
      }

      setMissionRefreshTrigger((prev) => prev + 1);
    };

    const handleVerifiedEvent = (e: any) => {
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
  }, [echo, user, startLoopingAlarm, stopSirenAndVibration]);

  // AppState change: when responder opens the app (app becomes 'active'),
  // automatically silence/turn off the alarm sound and vibration!
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[MissionAlarmContext] AppState changed to: ${nextAppState}, isAlarmPlaying:`, isAlarmPlayingRef.current);
      if (nextAppState === 'active') {
        // Responder opened the app: automatically stop the siren sound and vibration!
        console.log('[MissionAlarmContext] 🔕 Responder opened the app -> automatically silencing alarm sound');
        if (activeAlarmDispatchIdRef.current) {
          silencedDispatchIds.current.add(activeAlarmDispatchIdRef.current);
        }
        stopSirenAndVibration();
        Notifications.dismissAllNotificationsAsync().catch(() => {});
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [stopSirenAndVibration]);

  return (
    <MissionAlarmContext.Provider
      value={{
        incomingMission,
        clearMission,
        stopAlarm: stopSirenAndVibration,
        silenceMission,
        acknowledgeMission,
        missionRefreshTrigger,
        latestVerifiedIncident,
        clearVerifiedNotification: () => setLatestVerifiedIncident(null),
        verifiedIncidentsTrigger,
        isAlarmActive,
      }}
    >
      {children}
      {/* Interactive, high-priority emergency banner displayed on top of any screen when alarm is active */}
      {isAlarmActive && incomingMission && (
        <View style={styles.topBannerWrapper} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              try {
                router.navigate('/(responder)/dispatch');
              } catch (_) {}
            }}
            style={styles.topBanner}
          >
            <View style={styles.bannerPulseDot}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.topBannerBadge}>NEW DISPATCH</Text>
                <Text style={styles.topBannerTitle}>🚨 CRITICAL ALARM ACTIVE</Text>
              </View>
              <Text style={styles.topBannerSubtitle} numberOfLines={1}>
                {incomingMission.incident_type || 'Emergency'} • {incomingMission.barangay ? `Brgy. ${incomingMission.barangay}` : (incomingMission.location || 'Opol')}
              </Text>
              <Text style={styles.topBannerAction}>
                Tap here to open details & acknowledge →
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </MissionAlarmContext.Provider>
  );
}

export const useMissionAlarm = () => useContext(MissionAlarmContext);

const styles = StyleSheet.create({
  topBannerWrapper: {
    position: 'absolute',
    top: 50,
    left: 14,
    right: 14,
    zIndex: 99999,
    alignItems: 'center',
    elevation: 200,
  },
  topBanner: {
    backgroundColor: '#0F172A',
    borderColor: '#EF4444',
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  bannerPulseDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topBannerBadge: {
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 6,
    letterSpacing: 0.5,
  },
  topBannerTitle: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  topBannerSubtitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  topBannerAction: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
