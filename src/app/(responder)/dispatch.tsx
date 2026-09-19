import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, Alert, Modal, ActivityIndicator, 
  Animated, PanResponder, Dimensions, ScrollView, StyleSheet, Platform,
  Linking 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '@/shared/components/Map';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { StatusChip } from '@/shared/components';
import { ArrowLeft, Navigation, AlertTriangle, MapPin, Clock, User, Phone, PhoneCall, Ambulance, FileText, Crosshair, CheckCircle } from 'lucide-react-native';

import { getActiveDispatches, acceptDispatch, updateDispatchStatus } from '@/shared/api/dispatches';
import { useGpsStatusTransition, useLiveDispatchTracking, useRealtime } from '@/shared/hooks';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Sizes for the draggable panel
const MIN_PANEL_HEIGHT = SCREEN_HEIGHT * 0.25; 
const MAX_PANEL_HEIGHT = SCREEN_HEIGHT * 0.85;

export default function DispatchScreen() {
  const [dispatch, setDispatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapboxGL.Camera>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(responder)');
    }
  };

  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const { echo } = useRealtime() as { echo: any };

  useEffect(() => {
    if (echo && dispatch && dispatch.incident_id) {
      const channel = echo.private(`incident.${dispatch.incident_id}`)
        .listen('ResidentCalledResponder', (e: any) => {
          Alert.alert(
            "Resident Called You",
            `The resident (${e.resident_name || 'Resident'}) is trying to call you. Their location has been updated on the map.`
          );
          // Update local state to move the map pin
          if (e.latitude && e.longitude) {
            setDispatch((prev: any) => {
              if (!prev || !prev.incident) return prev;
              return {
                ...prev,
                incident: {
                  ...prev.incident,
                  reporter_latitude: e.latitude,
                  reporter_longitude: e.longitude,
                }
              };
            });
          }
        });

      return () => {
        channel.stopListening('ResidentCalledResponder');
      };
    }
  }, [echo, dispatch]);

  // Standby Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  // Bottom Sheet Animation
  const pan = useRef(new Animated.ValueXY({ x: 0, y: SCREEN_HEIGHT - MIN_PANEL_HEIGHT })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Claim responder only if moving vertically significantly
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        pan.setOffset({ x: 0, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const currentY = (pan.y as any)._value;
        const topY = SCREEN_HEIGHT - MAX_PANEL_HEIGHT;
        const bottomY = SCREEN_HEIGHT - MIN_PANEL_HEIGHT;

        if (gestureState.vy < -0.5) {
          Animated.spring(pan.y, {
            toValue: topY,
            bounciness: 2,
            useNativeDriver: false,
          }).start();
        } else if (gestureState.vy > 0.5) {
          Animated.spring(pan.y, {
            toValue: bottomY,
            bounciness: 2,
            useNativeDriver: false,
          }).start();
        } else if (currentY < (topY + bottomY) / 2) {
          Animated.spring(pan.y, {
            toValue: topY,
            bounciness: 2,
            useNativeDriver: false,
          }).start();
        } else {
          Animated.spring(pan.y, {
            toValue: bottomY,
            bounciness: 2,
            useNativeDriver: false,
          }).start();
        }
      }
    })
  ).current;

  const translateY = pan.y.interpolate({
    inputRange: [SCREEN_HEIGHT - MAX_PANEL_HEIGHT, SCREEN_HEIGHT - MIN_PANEL_HEIGHT],
    outputRange: [SCREEN_HEIGHT - MAX_PANEL_HEIGHT, SCREEN_HEIGHT - MIN_PANEL_HEIGHT],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    if (!dispatch && !isLoading) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.3, duration: 2000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, { toValue: 0.1, duration: 2000, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0.5, duration: 2000, useNativeDriver: true })
          ])
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.5);
    }
  }, [dispatch, isLoading]);

  const { missionRefreshTrigger } = useMissionAlarm();

  const fetchDispatch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getActiveDispatches();
      if (data.data && data.data.length > 0) {
         setDispatch(data.data[0]);
      } else {
         setDispatch(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDispatch();
    }, [fetchDispatch])
  );

  // Auto-refresh when real-time mission assignment or status arrives via WebSockets
  useEffect(() => {
    fetchDispatch();
  }, [missionRefreshTrigger, fetchDispatch]);

  // Track User Location for the custom puck
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startLocationTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && isMounted) {
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc && isMounted) setUserLocation(lastLoc.coords);
          
          const sub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
            (loc) => { if (isMounted) setUserLocation(loc.coords); }
          );

          if (isMounted) {
            locationSub = sub;
          } else {
            sub.remove();
          }
        }
      } catch (e) {
        console.warn("Could not track user location in dispatch screen.");
      }
    };
    startLocationTracking();
    return () => {
      isMounted = false;
      if (locationSub) locationSub.remove();
    };
  }, []);

  const rawLat = dispatch?.incident?.incident_latitude ?? dispatch?.incident?.latitude ?? dispatch?.incident?.reporter_latitude;
  const rawLng = dispatch?.incident?.incident_longitude ?? dispatch?.incident?.longitude ?? dispatch?.incident?.reporter_longitude;
  const parsedLat = parseFloat(rawLat);
  const parsedLng = parseFloat(rawLng);
  const hasValidCoords = !isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0 && parsedLng !== 0;

  const targetCoords = useMemo(() => ({
    latitude: hasValidCoords ? parsedLat : 8.5138,
    longitude: hasValidCoords ? parsedLng : 124.5775,
  }), [hasValidCoords, parsedLat, parsedLng]);

  useGpsStatusTransition(
    dispatch?.id, 
    dispatch?.dispatch_status, 
    targetCoords,
    50
  );

  useLiveDispatchTracking(dispatch?.id, dispatch?.dispatch_status, { driverId: dispatch?.driver_id });

  // Center map directly on incident pin when loaded
  useEffect(() => {
    if (hasValidCoords && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.setCamera({
          centerCoordinate: [parsedLng, parsedLat],
          zoomLevel: 15.5,
          animationDuration: 1200
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [parsedLat, parsedLng, hasValidCoords]);

  const handleRecenterIncident = () => {
    if (mapRef.current && hasValidCoords) {
      mapRef.current?.setCamera({
        centerCoordinate: [parsedLng, parsedLat],
        zoomLevel: 15.5,
        animationDuration: 1000
      });
    }
  };

  const handleCallPhone = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'No contact phone number is available for this caller.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Call Error', 'Could not open device phone dialer.');
    });
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const confirmDecline = async () => {
    if (!dispatch) return;
    try {
      await updateDispatchStatus(dispatch.id, 'cancelled');
      setShowDeclineModal(false);
      handleBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to decline dispatch.');
    }
  };

  const [isAccepting, setIsAccepting] = useState(false);
  const [isStartingNav, setIsStartingNav] = useState(false);

  const handleAccept = async () => {
    if (!dispatch || isAccepting) return;
    setIsAccepting(true);
    try {
      await acceptDispatch(dispatch.id);
      setDispatch((prev: any) => ({ ...prev, dispatch_status: 'accepted' }));
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to accept dispatch.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleOpenMap = async () => {
    if (!dispatch || isStartingNav) return;
    setIsStartingNav(true);
    try {
      if (dispatch.dispatch_status === 'accepted' || dispatch.dispatch_status === 'assigned') {
        try {
          await updateDispatchStatus(dispatch.id, 'en_route');
        } catch (e) {
          // Continue to navigation screen
        }
        setDispatch((prev: any) => ({ ...prev, dispatch_status: 'en_route' }));
      }
      
      router.push({
        pathname: '/(responder)/navigation',
        params: {
          lat: rawLat,
          lng: rawLng,
          dispatchId: dispatch.id,
          driverId: dispatch.driver_id,
        }
      });
    } catch (e) {
      console.error(e);
      router.push({
        pathname: '/(responder)/navigation',
        params: {
          lat: rawLat,
          lng: rawLng,
          dispatchId: dispatch.id,
          driverId: dispatch.driver_id,
        }
      });
    } finally {
      setIsStartingNav(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-100 items-center justify-center">
         <ActivityIndicator size="large" color="#3b82f6" />
         <Text className="mt-4 text-slate-500 font-medium">Loading dispatch data...</Text>
      </View>
    );
  }

  if (!dispatch) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-8" edges={['top']}>
        <View className="w-64 h-64 items-center justify-center">
          <Animated.View 
            className="absolute w-64 h-64 bg-blue-200/40 rounded-full border border-blue-300/50"
            style={{ transform: [{ scale: pulseAnim }], opacity: opacityAnim }}
          />
          <View className="absolute w-48 h-48 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100" />
          <View className="absolute w-32 h-32 bg-blue-50 rounded-full items-center justify-center shadow-xl shadow-blue-200/40" />
          <View className="absolute w-20 h-20 bg-blue-500 rounded-full items-center justify-center shadow-md shadow-blue-500/50">
            <Navigation size={36} color="#ffffff" />
          </View>
        </View>
        <View className="mt-12 items-center">
          <View className="bg-blue-100 px-4 py-1.5 rounded-full mb-4">
            <Text className="text-blue-700 font-black text-xs tracking-widest uppercase">Monitoring</Text>
          </View>
          <Text className="text-3xl font-black text-slate-800 mb-3 text-center tracking-tight">Standby Mode</Text>
          <Text className="text-slate-500 text-center font-medium leading-relaxed px-4">
            No active emergencies assigned to your unit. Keep your radio on and stay alert for incoming dispatches.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const incident = dispatch.incident || {};
  const resident = incident.resident || {};
  const incidentType = incident.incident_type || {}; 

  const exactLocationName = 
    incident.place_of_incident || 
    incident.incident_address || 
    (incident.location_code ? `Location Marker ${incident.location_code}` : null) || 
    incident.address || 
    'Pinpointed Emergency Incident Location';

  return (
    <View className="flex-1 bg-slate-100">
      <View 
        className="absolute left-0 right-0" 
        style={{ top: insets.top, height: SCREEN_HEIGHT - MIN_PANEL_HEIGHT - insets.top + 30 }}
      >
        <MapView 
          ref={mapRef} 
          className="flex-1" 
          showsUserLocation={false}
          initialRegion={hasValidCoords ? { latitude: parsedLat, longitude: parsedLng } : undefined}
        >
          
          {/* Custom Incident Marker */}
          {hasValidCoords ? (
            <MapboxGL.PointAnnotation id="dispatchDestination" coordinate={[parsedLng, parsedLat]}>
              <View className="items-center justify-center w-24 h-24 bg-red-500/10 rounded-full">
                <View className="w-20 h-20 bg-red-500/20 rounded-full items-center justify-center absolute" />
                <View className="w-14 h-14 bg-red-500 rounded-full border-[4px] border-white shadow-2xl items-center justify-center">
                  <AlertTriangle size={24} color="#ffffff" strokeWidth={2.5} />
                </View>
                <View className="absolute bottom-2 w-4 h-4 bg-red-600 rounded-full border-4 border-white shadow-sm" />
              </View>
            </MapboxGL.PointAnnotation>
          ) : null}

          {/* Custom Responder Puck */}
          {userLocation ? (
            <MapboxGL.PointAnnotation id="responderPuck" coordinate={[userLocation.longitude, userLocation.latitude]}>
              <View className="items-center justify-center w-32 h-32 bg-emerald-500/20 rounded-full">
                <View className="w-24 h-24 bg-emerald-500/40 rounded-full items-center justify-center absolute border border-emerald-400/50" />
                <View className="w-16 h-16 bg-emerald-500 rounded-full border-[4px] border-white shadow-2xl items-center justify-center" style={{ elevation: 10, shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 15 }}>
                  <View style={{ transform: [{ rotate: `${userLocation.heading || 0}deg` }] }}>
                    <Navigation size={28} color="#ffffff" fill="#ffffff" />
                  </View>
                </View>
              </View>
            </MapboxGL.PointAnnotation>
          ) : null}

        </MapView>

        {/* Floating Recenter Map Button */}
        {hasValidCoords && (
          <TouchableOpacity 
            onPress={handleRecenterIncident}
            style={{ position: 'absolute', right: 16, bottom: 40 }}
            className="w-11 h-11 bg-white/95 rounded-full items-center justify-center shadow-lg border border-slate-200"
          >
            <Crosshair size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      
      <View className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between pointer-events-box-none" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={handleBack} className="bg-white/90 p-3 rounded-full shadow-lg border border-slate-200/50 pointer-events-auto">
          <ArrowLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <StatusChip status={dispatch.dispatch_status} type="dispatch" />
      </View>

      <Animated.View 
        style={[styles.bottomSheet, { transform: [{ translateY }] }]}
        className="absolute left-0 right-0 bg-white rounded-t-3xl shadow-[0_-5px_15px_rgba(0,0,0,0.1)] border-t border-slate-200"
      >
        <View {...panResponder.panHandlers} className="w-full items-center pt-2 pb-5 bg-transparent">
          <View className="w-14 h-1.5 bg-slate-300 rounded-full" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Incident ID: DSP-{String(dispatch.id).padStart(3, '0')}</Text>
              <Text className="text-2xl font-black text-slate-800">{incidentType.name || 'Emergency Incident'}</Text>
            </View>
            <View className="bg-red-100 px-3 py-1.5 rounded-lg border border-red-200">
              <Text className="text-red-700 font-bold text-xs">High Priority</Text>
            </View>
          </View>

          <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5">
            <View className="flex-row items-start mb-4">
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3 mt-1 shrink-0">
                <MapPin size={16} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">Exact Location</Text>
                  {incident.location_code ? (
                    <View className="bg-blue-100 px-2 py-0.5 rounded">
                      <Text className="text-blue-700 font-mono font-bold text-[10px]">{incident.location_code}</Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-slate-900 font-bold text-base leading-snug">
                  {exactLocationName}
                </Text>
                {incident.location_code && incident.place_of_incident && (
                  <Text className="text-slate-600 text-xs mt-0.5">
                    Location Code: <Text className="font-mono font-bold text-blue-600">{incident.location_code}</Text>
                  </Text>
                )}
                <Text className="text-slate-400 font-mono text-xs mt-1.5">
                  📍 {hasValidCoords ? `${parsedLat.toFixed(6)}, ${parsedLng.toFixed(6)}` : 'Coordinates pending'}
                </Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-slate-200 w-full my-1" />

            <View className="flex-row items-start mt-4">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3 mt-1 shrink-0">
                <Clock size={16} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Reported Time</Text>
                <Text className="text-slate-800 font-semibold">{new Date(incident.reported_at || incident.created_at).toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <Text className="text-slate-800 font-bold text-lg mb-3">Incident Description</Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
            <Text className="text-slate-600 leading-relaxed">
              {incident.description || 'No additional description provided.'}
            </Text>
          </View>

          <Text className="text-slate-800 font-bold text-lg mb-3">Reporter & Patient</Text>
          
          {/* Conditional: Phone Call Caller vs Resident Mobile App vs Station Walk-In */}
          {incident.caller_phone_number ? (
            <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Phone size={20} color="#2563EB" />
                  </View>
                  <View>
                    <Text className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Report Source</Text>
                    <Text className="text-slate-800 font-bold text-sm">Phone / SIM Call</Text>
                  </View>
                </View>
                <View className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  <Text className="text-blue-700 text-[10px] font-bold">Cellular Call</Text>
                </View>
              </View>

              <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <Text className="text-slate-500 text-xs font-semibold">Caller Contact Number:</Text>
                <Text className="text-slate-900 font-bold font-mono text-base">{incident.caller_phone_number}</Text>
                {resident?.first_name ? (
                  <Text className="text-emerald-600 text-xs font-semibold mt-1">
                    ✓ Registered Resident: {resident.first_name} {resident.last_name}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleCallPhone(incident.caller_phone_number)}
                className="mt-3 bg-emerald-600 active:bg-emerald-700 py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm shadow-emerald-500/30"
              >
                <PhoneCall size={16} color="#FFFFFF" />
                <Text className="text-white font-black text-xs uppercase tracking-wider ml-2">
                  Call Caller ({incident.caller_phone_number})
                </Text>
              </TouchableOpacity>
            </View>
          ) : (resident?.first_name || resident?.name) ? (
            <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-3">
                    <User size={20} color="#7C3AED" />
                  </View>
                  <View>
                    <Text className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Report Source</Text>
                    <Text className="text-slate-800 font-bold text-sm">Resident Mobile App</Text>
                  </View>
                </View>
                <View className="bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                  <Text className="text-purple-700 text-[10px] font-bold">App Resident</Text>
                </View>
              </View>

              <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <Text className="text-slate-500 text-xs font-semibold">Resident Profile Name:</Text>
                <Text className="text-slate-900 font-bold text-base">
                  {resident.first_name ? `${resident.first_name} ${resident.last_name}` : resident.name}
                </Text>
                {resident.phone_number ? (
                  <Text className="text-slate-600 font-mono text-xs mt-0.5">
                    Phone: {resident.phone_number}
                  </Text>
                ) : null}
              </View>

              {resident.phone_number ? (
                <TouchableOpacity
                  onPress={() => handleCallPhone(resident.phone_number)}
                  className="mt-3 bg-emerald-600 active:bg-emerald-700 py-3 px-4 rounded-xl flex-row items-center justify-center shadow-sm shadow-emerald-500/30"
                >
                  <PhoneCall size={16} color="#FFFFFF" />
                  <Text className="text-white font-black text-xs uppercase tracking-wider ml-2">
                    Call Resident ({resident.phone_number})
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                  <User size={20} color="#64748B" />
                </View>
                <View>
                  <Text className="text-slate-500 text-xs font-bold uppercase">Reported By</Text>
                  <Text className="text-slate-800 font-semibold">Dispatch / Station Walk-In</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Assisted directly by Command Center</Text>
                </View>
              </View>
            </View>
          )}

          <Text className="text-slate-800 font-bold text-lg mb-3">Assigned Units</Text>
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mr-4">
              <Ambulance size={24} color="#10B981" />
            </View>
            <View>
              <Text className="text-slate-800 font-bold">{dispatch.ambulance?.plate_number || 'Unit Not Set'}</Text>
              <Text className="text-slate-500 text-sm mt-1">Driver: {dispatch.driver?.first_name || 'N/A'}</Text>
              <Text className="text-slate-500 text-sm">EMT: {dispatch.emt?.first_name || 'N/A'}</Text>
            </View>
          </View>

        </ScrollView>
        
      </Animated.View>
      
      {/* Floating Action Footer: Simplified New Workflow */}
      <View style={styles.actionFooter}>
         {dispatch.dispatch_status === 'arrived_on_scene' ? (
           <TouchableOpacity 
             onPress={() => router.push('/(responder)/patient')}
             activeOpacity={0.85}
             style={styles.btnCreatePcr}
           >
             <FileText size={22} color="#EFF6FF" style={{ marginRight: 12 }} />
             <View>
               <Text style={styles.btnCreatePcrText}>CREATE PATIENT CARE RECORD</Text>
               <Text style={styles.btnCreatePcrSubtext}>Or Search Existing Patient</Text>
             </View>
           </TouchableOpacity>
         ) : dispatch.dispatch_status === 'accepted' || dispatch.dispatch_status === 'en_route' ? (
           <TouchableOpacity 
             onPress={handleOpenMap}
             disabled={isStartingNav}
             activeOpacity={0.85}
             style={styles.btnOpenMapFull}
           >
             {isStartingNav ? (
               <ActivityIndicator color="#ffffff" size="small" />
             ) : (
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Navigation size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                 <Text style={styles.btnOpenMapText}>OPEN MAP</Text>
               </View>
             )}
           </TouchableOpacity>
         ) : (
           /* Assigned State: Shows DECLINE and ACCEPT */
           <View style={styles.actionCard}>
             <TouchableOpacity 
               onPress={handleDecline}
               activeOpacity={0.8}
               style={styles.btnDecline}
             >
               <Text style={styles.btnDeclineText}>DECLINE</Text>
             </TouchableOpacity>
             <TouchableOpacity 
               onPress={handleAccept}
               disabled={isAccepting}
               activeOpacity={0.8}
               style={styles.btnAccept}
             >
               {isAccepting ? (
                 <ActivityIndicator color="#ffffff" size="small" />
               ) : (
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <CheckCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                   <Text style={styles.btnAcceptText}>ACCEPT</Text>
                 </View>
               )}
             </TouchableOpacity>
           </View>
         )}
      </View>

      {/* Premium Decline Confirmation Modal */}
      <Modal animationType="fade" transparent={true} visible={showDeclineModal} onRequestClose={() => setShowDeclineModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-slate-800 text-center mb-2">Decline Dispatch?</Text>
              <Text className="text-slate-500 text-center font-medium">Are you sure you want to decline this mission? This action will notify the command center.</Text>
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity onPress={() => setShowDeclineModal(false)} activeOpacity={0.8} style={styles.btnModalCancel}>
                <Text style={styles.btnModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDecline} activeOpacity={0.8} style={styles.btnModalConfirm}>
                <Text style={styles.btnTextWhite}>YES, DECLINE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    height: MAX_PANEL_HEIGHT,
  },
  actionFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 95,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  actionCard: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    pointerEvents: 'auto',
  },
  btnCreatePcr: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    pointerEvents: 'auto',
  },
  btnCreatePcrText: {
    color: '#eff6ff',
    fontWeight: '900',
    letterSpacing: 0.8,
    fontSize: 13,
  },
  btnCreatePcrSubtext: {
    color: '#bfdbfe',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  btnOpenMap: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnArrive: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDecline: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeclineText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  btnAccept: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnAcceptText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  btnOpenMapFull: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    pointerEvents: 'auto',
  },
  btnOpenMapText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.2,
  },
  btnNavigate: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#059669',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnNavigateText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  btnTextWhite: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  btnModalCancel: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalCancelText: {
    color: '#475569',
    fontWeight: '700',
  },
  btnModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
});
