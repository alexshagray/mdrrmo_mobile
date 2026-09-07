import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, Alert, Modal, ActivityIndicator, 
  Animated, PanResponder, Dimensions, ScrollView, StyleSheet, Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapView } from '@/shared/components/Map';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Button, StatusChip } from '@/shared/components';
import { ArrowLeft, Navigation, AlertTriangle, MapPin, Clock, User, Phone, Ambulance, FileText } from 'lucide-react-native';

import { getActiveDispatches, acceptDispatch, updateDispatchStatus } from '@/shared/api/dispatches';
import { useGpsStatusTransition, useRealtime } from '@/shared/hooks';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

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

  useFocusEffect(
    useCallback(() => {
      const fetchDispatch = async () => {
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
      };
      fetchDispatch();
    }, [])
  );

  // Track User Location for the custom puck
  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    const startLocationTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc) setUserLocation(lastLoc.coords);
          
          locationSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
            (loc) => { setUserLocation(loc.coords); }
          );
        }
      } catch (e) {
        console.warn("Could not track user location in dispatch screen.");
      }
    };
    startLocationTracking();
    return () => { if (locationSub) locationSub.remove(); };
  }, []);

  const lat = dispatch?.incident?.latitude ?? dispatch?.incident?.incident_latitude;
  const lng = dispatch?.incident?.longitude ?? dispatch?.incident?.incident_longitude;
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  useGpsStatusTransition(
    dispatch?.id, 
    dispatch?.dispatch_status, 
    { latitude: parsedLat, longitude: parsedLng },
    50
  );

  // Center map on incident when loaded
  useEffect(() => {
    if (mapRef.current && parsedLat && parsedLng) {
      setTimeout(() => {
        mapRef.current?.setCamera({
          centerCoordinate: [parsedLng, parsedLat],
          zoomLevel: 14,
          animationDuration: 1500
        });
      }, 500);
    }
  }, [parsedLat, parsedLng]);

  const handleAccept = async () => {
    if (!dispatch) return;
    try {
      await acceptDispatch(dispatch.id);
      setDispatch({ ...dispatch, dispatch_status: 'accepted' });
      Alert.alert('Success', 'Dispatch accepted.');
    } catch (e) {
      Alert.alert('Error', 'Failed to accept dispatch.');
    }
  };

  const handleDecline = () => {
    setShowDeclineModal(true);
  };

  const confirmDecline = async () => {
    if (!dispatch) return;
    try {
      await updateDispatchStatus(dispatch.id, 'cancelled');
      setShowDeclineModal(false);
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to decline dispatch.');
    }
  };

  const handleNavigate = async () => {
    if (!dispatch) return;
    try {
      if (dispatch.dispatch_status === 'accepted') {
        await updateDispatchStatus(dispatch.id, 'en_route');
        setDispatch({ ...dispatch, dispatch_status: 'en_route' });
      }
      
      router.push({
        pathname: '/(responder)/navigation',
        params: {
          lat: lat,
          lng: lng,
          dispatchId: dispatch.id
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to start navigation.');
    }
  };

  const handleManualArrive = async () => {
    if (!dispatch) return;
    try {
      await updateDispatchStatus(dispatch.id, 'arrived_on_scene');
      setDispatch({ ...dispatch, dispatch_status: 'arrived_on_scene' });
      Alert.alert('Success', 'You have arrived on scene. You may now create the Patient Care Record.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
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

  return (
    <View className="flex-1 bg-slate-100">
      <View 
        className="absolute left-0 right-0" 
        style={{ top: insets.top, height: SCREEN_HEIGHT - MIN_PANEL_HEIGHT - insets.top + 30 }}
      >
        <MapView ref={mapRef} className="flex-1" showsUserLocation={false}>
          
          {/* Custom Incident Marker */}
          {(!isNaN(parsedLat) && !isNaN(parsedLng)) ? (
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
      </View>
      
      <View className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between pointer-events-box-none" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="bg-white/90 p-3 rounded-full shadow-lg border border-slate-200/50 pointer-events-auto">
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
              <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3 mt-1">
                <MapPin size={16} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Exact Location</Text>
                <Text className="text-slate-800 font-semibold">{incident.address || 'Location not specified'}</Text>
                <Text className="text-slate-400 text-xs mt-1">{lat}, {lng}</Text>
              </View>
            </View>
            
            <View className="h-[1px] bg-slate-200 w-full my-1" />

            <View className="flex-row items-start mt-4">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3 mt-1">
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
          <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6 space-y-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                <User size={20} color="#64748B" />
              </View>
              <View>
                <Text className="text-slate-500 text-xs font-bold uppercase">Reported By</Text>
                <Text className="text-slate-800 font-semibold">
                  {resident.first_name ? `${resident.first_name} ${resident.last_name}` : 'Dispatch / Station Walk-In'}
                </Text>
              </View>
            </View>
            {resident.phone_number && (
              <View className="flex-row items-center mt-3">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                  <Phone size={20} color="#64748B" />
                </View>
                <View>
                  <Text className="text-slate-500 text-xs font-bold uppercase">Contact</Text>
                  <Text className="text-slate-800 font-semibold">{resident.phone_number}</Text>
                </View>
              </View>
            )}
          </View>

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
      
      {/* Floating Action Footer (Moved outside to ensure visibility above tab bar) */}
      <View className="absolute left-0 right-0 px-4 flex-row justify-between pointer-events-box-none" style={{ bottom: 95 }}>
         {dispatch.dispatch_status === 'arrived_on_scene' ? (
           <TouchableOpacity 
             onPress={() => router.push('/(responder)/patient')}
             className="bg-blue-600 px-4 py-4 rounded-2xl flex-row items-center justify-center w-full shadow-lg shadow-blue-500/30 pointer-events-auto"
           >
             <FileText size={22} color="#EFF6FF" className="mr-3" />
             <View className="items-start">
               <Text className="text-blue-50 font-black tracking-widest text-center text-[13px]">CREATE PATIENT CARE RECORD</Text>
               <Text className="text-blue-200 font-bold text-[10px] uppercase tracking-wider mt-0.5">Or Search Existing Patient</Text>
             </View>
           </TouchableOpacity>
         ) : (
           <View className="flex-row w-full space-x-3 pointer-events-auto bg-white/80 backdrop-blur-md p-3 rounded-3xl border border-slate-200 shadow-xl">
             <Button variant="ghost" title="DECLINE" className="flex-1 bg-slate-100" onPress={handleDecline} />
             {dispatch.dispatch_status === 'assigned' ? (
                <Button variant="primary" title="ACCEPT DISPATCH" className="flex-1 shadow-sm" onPress={handleAccept} />
             ) : dispatch.dispatch_status === 'accepted' ? (
                <Button variant="primary" title="NAVIGATE" className="flex-1 shadow-lg shadow-emerald-500/40 bg-emerald-500" onPress={handleNavigate} />
             ) : dispatch.dispatch_status === 'en_route' ? (
                <View className="flex-1 flex-row space-x-2">
                  <Button variant="primary" title="MAP" className="flex-1 shadow-sm bg-slate-800" onPress={handleNavigate} />
                  <Button variant="primary" title="ARRIVED" className="flex-1 shadow-lg bg-blue-600" onPress={handleManualArrive} />
                </View>
             ) : null}
           </View>
         )}
      </View>

      {/* Premium Decline Confirmation Modal */}
      <Modal animationType="fade" transparent={true} visible={showDeclineModal} onRequestClose={() => setShowDeclineModal(false)}>
        <View className="flex-1 justify-center items-center bg-slate-900/60 p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                <AlertTriangle size={32} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-slate-800 text-center mb-2">Decline Dispatch?</Text>
              <Text className="text-slate-500 text-center font-medium">Are you sure you want to decline this mission? This action will notify the command center.</Text>
            </View>
            <View className="flex-row justify-between space-x-3 mt-2">
              <TouchableOpacity onPress={() => setShowDeclineModal(false)} className="flex-1 py-3.5 bg-slate-100 rounded-xl items-center">
                <Text className="text-slate-600 font-bold">CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDecline} className="flex-1 py-3.5 bg-red-500 rounded-xl items-center shadow-sm shadow-red-500/30">
                <Text className="text-white font-bold">YES, DECLINE</Text>
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
});
