import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Vibration, Linking } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { ShieldAlert, CheckCircle, X, MapPin, Ambulance, PhoneCall, AlertCircle } from 'lucide-react-native';
import { useAuth } from '../auth/authContext';
import { useRealtime } from '../hooks/useRealtime';

interface ResidentAlertContextType {
  activeAlert: any;
  clearAlert: () => void;
  residentRefreshTrigger: number;
}

const ResidentAlertContext = createContext<ResidentAlertContextType>({
  activeAlert: null,
  clearAlert: () => {},
  residentRefreshTrigger: 0,
});

const { width } = Dimensions.get('window');

export function ResidentAlertProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<any>(null);
  const [residentRefreshTrigger, setResidentRefreshTrigger] = useState<number>(0);
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const { user, isAuthenticated, role } = useAuth();
  const { echo } = useRealtime();
  const router = useRouter();

  // Handle WebSocket Events for Resident
  useEffect(() => {
    if (!echo || !user?.id || role !== 'resident') return;

    const channel = (echo as any).private(`resident.${user.id}`);

    const handleIncidentVerified = (e: any) => {
      console.log('IncidentVerified received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);
      setActiveAlert({
        type: 'verified',
        title: 'INCIDENT APPROVED',
        subtitle: 'Your emergency report has been verified by the Dispatcher. A responder is being assigned to your incident.',
        incident: e.incident,
      });
    };

    const handleIncidentRejected = (e: any) => {
      console.log('IncidentRejected received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);
      const reason = e.incident?.rejection_reason;
      setActiveAlert({
        type: 'rejected',
        title: 'INCIDENT NOT APPROVED',
        subtitle: reason 
          ? `Your emergency report was not approved for dispatch. Reason: ${reason}`
          : 'Your emergency report was reviewed by the Dispatcher and was not approved for dispatch.',
        incident: e.incident,
      });
    };

    const handleDispatchCreated = (e: any) => {
      console.log('DispatchCreated received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);
      setActiveAlert({
        type: 'assigned',
        title: 'RESPONDER ASSIGNED',
        subtitle: 'A responder has been assigned to your emergency report.',
        dispatch: e.dispatch,
      });
    };

    const handleDispatchAccepted = (e: any) => {
      console.log('DispatchAccepted received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);
      setActiveAlert({
        type: 'accepted',
        title: 'RESPONDER CONFIRMED',
        subtitle: 'The response team has confirmed your emergency and is preparing to depart.',
        dispatch: e.dispatch,
      });
    };

    const handleStatusUpdated = (e: any) => {
      console.log('DispatchStatusUpdated received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);

      const status = e.dispatch?.dispatch_status;
      if (status === 'en_route') {
        setActiveAlert({
          type: 'en_route',
          title: 'RESPONDER IS ON THE WAY',
          subtitle: 'Your assigned responder is currently traveling to your location.',
          dispatch: e.dispatch,
        });
      } else if (status === 'cancelled') {
        setActiveAlert({
          type: 'cancelled',
          title: 'DISPATCH CANCELLED',
          subtitle: 'The responder mission for your report was cancelled by MDRRMO Dispatch Center. If you still need immediate help, please call emergency hotlines.',
          dispatch: e.dispatch,
        });
      } else if (status === 'arrived_on_scene') {
        setActiveAlert({
          type: 'arrived',
          title: 'RESPONDERS ON SCENE',
          subtitle: 'The emergency medical team has arrived at your reported location.',
          dispatch: e.dispatch,
        });
      }
    };

    const handleCompleted = (e: any) => {
      console.log('DispatchCompleted received on resident channel:', e);
      setResidentRefreshTrigger(prev => prev + 1);
      setActiveAlert({
        type: 'completed',
        title: 'MISSION COMPLETED',
        subtitle: 'The emergency response operation has concluded. Stay safe!',
        dispatch: e.dispatch,
      });
    };

    channel.listen('IncidentVerified', handleIncidentVerified);
    channel.listen('.IncidentVerified', handleIncidentVerified);
    channel.listen('IncidentRejected', handleIncidentRejected);
    channel.listen('.IncidentRejected', handleIncidentRejected);
    channel.listen('DispatchCreated', handleDispatchCreated);
    channel.listen('.DispatchCreated', handleDispatchCreated);
    channel.listen('DispatchAccepted', handleDispatchAccepted);
    channel.listen('.DispatchAccepted', handleDispatchAccepted);
    channel.listen('DispatchStatusUpdated', handleStatusUpdated);
    channel.listen('.DispatchStatusUpdated', handleStatusUpdated);
    channel.listen('DispatchCompleted', handleCompleted);
    channel.listen('.DispatchCompleted', handleCompleted);

    return () => {
      channel.stopListening('IncidentVerified');
      channel.stopListening('.IncidentVerified');
      channel.stopListening('IncidentRejected');
      channel.stopListening('.IncidentRejected');
      channel.stopListening('DispatchCreated');
      channel.stopListening('.DispatchCreated');
      channel.stopListening('DispatchAccepted');
      channel.stopListening('.DispatchAccepted');
      channel.stopListening('DispatchStatusUpdated');
      channel.stopListening('.DispatchStatusUpdated');
      channel.stopListening('DispatchCompleted');
      channel.stopListening('.DispatchCompleted');
    };
  }, [echo, user, role]);

  // Audio & Haptic Chime
  useEffect(() => {
    let activePlayer: AudioPlayer | null = null;
    let isCancelled = false;

    async function playResidentChime() {
      if (activeAlert) {
        try {
          if (activeAlert.type === 'acknowledged' || activeAlert.type === 'accepted') {
            Vibration.vibrate([0, 500, 200, 500, 200, 800]);
          } else if (activeAlert.type === 'cancelled') {
            Vibration.vibrate([0, 400, 150, 400]);
          } else {
            Vibration.vibrate(500);
          }

          await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
          });

          if (!isCancelled) {
            const player = createAudioPlayer(
              require('../../../assets/sounds/alarm.mp3'),
            );
            player.loop = false;
            player.volume = 0.85;
            player.play();
            activePlayer = player;
            setSound(player);
          }
        } catch (e) {
          console.log('Error playing resident chime:', e);
        }
      } else {
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
      }
    }

    playResidentChime();

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
  }, [activeAlert]);

  const clearAlert = () => {
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
    setActiveAlert(null);
  };

  const handleTrackLive = () => {
    clearAlert();
    router.push('/(resident)/track');
  };

  const handleViewStatus = () => {
    clearAlert();
    router.push('/(resident)/report');
  };

  const handleCallHotline = () => {
    clearAlert();
    Linking.openURL('tel:+639123456789');
  };

  const isCancelled = activeAlert?.type === 'cancelled';
  const isRejected = activeAlert?.type === 'rejected';
  const isEnRouteOrArrived = activeAlert?.type === 'en_route' || activeAlert?.type === 'arrived';
  const isApprovalOrAssigned = activeAlert?.type === 'verified' || activeAlert?.type === 'assigned' || activeAlert?.type === 'accepted';
  const dispatch = activeAlert?.dispatch;
  const ambulanceName = dispatch?.ambulance?.vehicle_name || dispatch?.ambulance?.plate_number || 'MDRRMO Unit';
  const teamName = dispatch?.team ? `Team ${dispatch.team}` : 'Response Unit';

  return (
    <ResidentAlertContext.Provider value={{ activeAlert, clearAlert, residentRefreshTrigger }}>
      {children}
      {activeAlert && (
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={clearAlert}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.iconContainer, (isCancelled || isRejected) ? styles.iconCancelled : styles.iconSuccess]}>
              {(isCancelled || isRejected) ? (
                <ShieldAlert size={44} color="#DC2626" />
              ) : (
                <CheckCircle size={44} color="#16A34A" />
              )}
            </View>

            <Text style={[styles.title, (isCancelled || isRejected) && { color: '#DC2626' }]}>
              {activeAlert.title}
            </Text>
            <Text style={styles.subtitle}>
              {activeAlert.subtitle}
            </Text>

            {!isCancelled && !isRejected && dispatch && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ambulance size={18} color="#2563EB" />
                  <Text style={styles.infoTextBold}>{teamName} • {ambulanceName}</Text>
                </View>
                {dispatch.incident?.location && (
                  <View style={[styles.infoRow, { marginTop: 6 }]}>
                    <MapPin size={16} color="#64748B" />
                    <Text style={styles.infoText} numberOfLines={2}>{dispatch.incident.location}</Text>
                  </View>
                )}
              </View>
            )}

            {isCancelled ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity style={styles.callButton} onPress={handleCallHotline}>
                  <PhoneCall size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.callButtonText}>CALL EMERGENCY HOTLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={clearAlert}>
                  <Text style={styles.dismissText}>Dismiss Notification</Text>
                </TouchableOpacity>
              </View>
            ) : isRejected ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity style={[styles.callButton, { backgroundColor: '#475569' }]} onPress={handleViewStatus}>
                  <Text style={styles.callButtonText}>VIEW DETAILS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={clearAlert}>
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : isEnRouteOrArrived ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity style={styles.trackButton} onPress={handleTrackLive}>
                  <Text style={styles.trackButtonText}>TRACK RESPONDER LIVE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={clearAlert}>
                  <Text style={styles.dismissText}>Understood</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity style={[styles.trackButton, { backgroundColor: '#2563EB' }]} onPress={handleViewStatus}>
                  <Text style={styles.trackButtonText}>VIEW REPORT STATUS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissBtn} onPress={clearAlert}>
                  <Text style={styles.dismissText}>Understood</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </ResidentAlertContext.Provider>
  );
}

export const useResidentAlert = () => useContext(ResidentAlertContext);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
    shadowOpacity: 0.3,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  iconSuccess: {
    backgroundColor: '#DCFCE7',
  },
  iconCancelled: {
    backgroundColor: '#FEE2E2',
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
    marginBottom: 18,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
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
  trackButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  trackButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  callButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
