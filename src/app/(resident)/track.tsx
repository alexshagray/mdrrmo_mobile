import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Animated, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { FloatingPanel, MapView, StatusChip, Card, Avatar, LocationPermissionModal, IncidentMarker, AmbulanceMarker } from '@/shared/components';
import { TimelineCard } from '@/responder/components/common/TimelineCard';
import { Clock, MapPin, Activity, Phone, ShieldCheck } from 'lucide-react-native';
import { getMyReports, callResponderApi } from '@/shared/api/incidents';
import { useResidentAlert } from '@/shared/contexts/ResidentAlertContext';
import { useRealtime } from '@/shared/hooks';

const AllClearState = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Gentle pulse animation for the background rings
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Calm floating animation for the shield icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim]);

  return (
    <View className="flex-1 bg-slate-50 justify-center items-center px-8">
      <Animated.View className="w-40 h-40 justify-center items-center mb-6">
        {/* Outer Pulsing Ring */}
        <Animated.View 
          className="absolute inset-0 bg-indigo-50/70 rounded-full"
          style={{ transform: [{ scale: pulseAnim }] }}
        />
        {/* Inner Pulsing Ring */}
        <Animated.View 
          className="absolute inset-4 bg-indigo-100/60 rounded-full"
          style={{ transform: [{ scale: pulseAnim }] }}
        />
        {/* Floating Icon Card */}
        <Animated.View 
          className="w-20 h-20 bg-white rounded-full justify-center items-center shadow-lg shadow-indigo-200/50 border border-slate-100"
          style={{ transform: [{ translateY: floatAnim }] }}
        >
          <ShieldCheck size={38} color="#4F46E5" strokeWidth={2.25} />
        </Animated.View>
      </Animated.View>
      
      <Text className="text-2xl font-black text-slate-800 text-center tracking-tight mb-2">
        You're All Clear
      </Text>
      <Text className="text-slate-500 text-center text-[15px] leading-relaxed max-w-[280px]">
        There are no active emergency reports in your area.
      </Text>
    </View>
  );
};

export default function TrackScreen() {
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const { residentRefreshTrigger } = useResidentAlert();
  const { echo } = useRealtime() as { echo: any };

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getMyReports();
      const incidents = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      const active = incidents.find((inc: any) => 
        ['pending', 'verified', 'assigned', 'responding'].includes(inc.incident_status)
      );
      setActiveIncident(active || null);
    } catch (e) {
      console.error("Failed to fetch reports", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Listen directly on the active incident channel for immediate real-time state changes
  useEffect(() => {
    if (!echo || !activeIncident?.id) return;

    const channel = echo.private(`incident.${activeIncident.id}`);

    const handleStatusUpdate = (e: any) => {
      console.log('TrackScreen received DispatchStatusUpdated:', e);
      const status = e.dispatch?.dispatch_status;
      if (status === 'cancelled') {
        setActiveIncident(null);
        Alert.alert(
          'Mission Cancelled',
          'The emergency response dispatch for your report was cancelled by the dispatcher.'
        );
      } else if (status === 'completed') {
        setActiveIncident(null);
      } else {
        fetchIncidents();
      }
    };

    const handleDispatchCreatedOrAccepted = (e: any) => {
      console.log('TrackScreen received DispatchCreated/Accepted:', e);
      fetchIncidents();
    };

    channel.listen('DispatchStatusUpdated', handleStatusUpdate);
    channel.listen('.DispatchStatusUpdated', handleStatusUpdate);
    channel.listen('DispatchCompleted', handleStatusUpdate);
    channel.listen('.DispatchCompleted', handleStatusUpdate);
    channel.listen('DispatchCreated', handleDispatchCreatedOrAccepted);
    channel.listen('.DispatchCreated', handleDispatchCreatedOrAccepted);
    channel.listen('DispatchAccepted', handleDispatchCreatedOrAccepted);
    channel.listen('.DispatchAccepted', handleDispatchCreatedOrAccepted);

    return () => {
      channel.stopListening('DispatchStatusUpdated');
      channel.stopListening('.DispatchStatusUpdated');
      channel.stopListening('DispatchCompleted');
      channel.stopListening('.DispatchCompleted');
      channel.stopListening('DispatchCreated');
      channel.stopListening('.DispatchCreated');
      channel.stopListening('DispatchAccepted');
      channel.stopListening('.DispatchAccepted');
    };
  }, [echo, activeIncident?.id, fetchIncidents]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-slate-500 font-medium">Loading status...</Text>
      </View>
    );
  }

  if (!activeIncident) {
    return <AllClearState />;
  }

  const handleCallResponder = () => {
    setIsLocationModalVisible(true);
  };

  const onAllowLocation = async () => {
    setIsLocationModalVisible(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Denied",
          "Location access is turned off. Please enable location permission to allow emergency responders to locate you accurately.\n\nFor your safety, please allow location access so responders can identify your current location during an emergency.",
          [{ text: "OK" }]
        );
        // Still allow them to call
        Linking.openURL('tel:+639123456789');
        return;
      }

      // Get location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Send to backend
      await callResponderApi(activeIncident.id, location.coords.latitude, location.coords.longitude);

      // Finally, open dialer
      Linking.openURL('tel:+639123456789');

    } catch (error) {
      console.warn("Failed to get location or send to backend:", error);
      Alert.alert(
        "Location Unavailable",
        "We couldn’t determine your current location. Please make sure Location Services are enabled and try again.",
        [{ text: "OK", onPress: () => Linking.openURL('tel:+639123456789') }]
      );
    }
  };

  const onDenyLocation = () => {
    setIsLocationModalVisible(false);
    Linking.openURL('tel:+639123456789');
  };

  const isResponding = ['assigned', 'responding'].includes(activeIncident.incident_status);

  const incidentLat = parseFloat(activeIncident.incident_latitude);
  const incidentLng = parseFloat(activeIncident.incident_longitude);
  const hasIncidentCoords = !isNaN(incidentLat) && !isNaN(incidentLng) && incidentLat !== 0 && incidentLng !== 0;

  const activeDispatch = activeIncident?.active_dispatch;
  const ambulanceLat = activeDispatch?.last_latitude ? parseFloat(activeDispatch.last_latitude) : null;
  const ambulanceLng = activeDispatch?.last_longitude ? parseFloat(activeDispatch.last_longitude) : null;
  const hasAmbulanceCoords = ambulanceLat !== null && ambulanceLng !== null && !isNaN(ambulanceLat) && !isNaN(ambulanceLng);

  return (
    <View className="flex-1 bg-transparent">
      <MapView 
        className="absolute inset-0"
        initialRegion={hasIncidentCoords ? { latitude: incidentLat, longitude: incidentLng } : undefined}
      >
        {hasIncidentCoords && (
          <IncidentMarker
            id={`incident-${activeIncident.id}`}
            coordinate={{ latitude: incidentLat, longitude: incidentLng }}
            title={activeIncident.incident_type?.name || 'Emergency Location'}
          />
        )}
        {hasAmbulanceCoords && (
          <AmbulanceMarker
            coordinate={{ latitude: ambulanceLat!, longitude: ambulanceLng! }}
            title={activeDispatch?.ambulance?.vehicle_name || 'MDRRMO Ambulance'}
          />
        )}
      </MapView>
      
      <SafeAreaView className="flex-1 justify-between" edges={['top']}>
        {/* Top Floating Status */}
        <View className="px-5 mt-5">
          <View className="bg-white/95 rounded-3xl p-4 shadow-lg shadow-slate-300/30 border border-white flex-row justify-between items-center">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-indigo-50 rounded-2xl justify-center items-center mr-4 border border-indigo-100/50">
                <MapPin size={22} color="#4F46E5" strokeWidth={2} />
              </View>
              <View className="flex-1 mr-2">
                <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">
                  Report #{activeIncident.id}
                </Text>
                <Text className="text-slate-800 text-lg font-black tracking-tight" numberOfLines={1}>
                  {activeIncident.incident_type?.name || 'Emergency'}
                </Text>
              </View>
            </View>
            <View className="scale-90 opacity-90">
              <StatusChip status={activeIncident.incident_status} />
            </View>
          </View>
        </View>

        {/* Bottom Floating Panel - Only show if assigned or responding */}
        {isResponding && (() => {
          const activeDispatch = activeIncident?.active_dispatch;
          const unitName = activeDispatch?.team ? `Unit ${activeDispatch.team}` : 'Response Unit';
          const ambulanceDesc = activeDispatch?.ambulance?.vehicle_name || activeDispatch?.ambulance?.plate_number || 'Emergency Vehicle';
          const leaderName = activeDispatch?.team_leader 
            ? `${activeDispatch.team_leader.first_name} ${activeDispatch.team_leader.last_name}`
            : (activeDispatch?.driver ? `${activeDispatch.driver.first_name} ${activeDispatch.driver.last_name}` : 'MDRRMO Crew');
          const leaderRole = activeDispatch?.team_leader ? 'Team Leader' : 'Crew Responder';
          const dispatchStatus = activeDispatch?.dispatch_status || activeIncident?.incident_status;
          const etaText = dispatchStatus === 'arrived_on_scene' ? 'On Scene' : (dispatchStatus === 'en_route' ? 'En Route' : 'Assigned');

          return (
            <FloatingPanel className="h-[60%] mb-24 p-0 overflow-hidden bg-white border border-slate-100 rounded-t-[36px] shadow-2xl">
              {/* Header: Unit Info & ETA */}
              <View className="px-6 py-5 border-b border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-12 h-12 bg-emerald-50 rounded-2xl justify-center items-center mr-4 border border-emerald-100/50">
                    <Activity size={22} color="#059669" strokeWidth={2.25} />
                  </View>
                  <View>
                    <Text className="text-slate-900 text-xl font-black tracking-tight">{unitName}</Text>
                    <Text className="text-slate-500 text-sm font-medium mt-0.5">{ambulanceDesc}</Text>
                  </View>
                </View>
                
                <View className="bg-amber-100 px-3 py-2 rounded-xl border border-amber-200/50 flex-row items-center shadow-sm">
                  <Clock size={14} color="#B45309" strokeWidth={2.25} />
                  <Text className="text-amber-700 font-black text-xs ml-1.5 tracking-wider uppercase">
                    {etaText}
                  </Text>
                </View>
              </View>

              {/* Responding Crew */}
              <View className="px-6 py-5 border-b border-slate-100">
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">
                  Responding Crew
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Avatar name={leaderName} size="md" />
                    <View className="ml-3.5">
                      <Text className="text-slate-900 text-base font-bold tracking-tight">{leaderName}</Text>
                      <Text className="text-slate-500 text-xs font-medium mt-0.5">{leaderRole}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    className="w-10 h-10 bg-slate-50 rounded-full justify-center items-center border border-slate-200/60 shadow-sm active:bg-slate-100"
                    onPress={handleCallResponder}
                  >
                     <Phone size={18} color="#64748B" strokeWidth={2.25} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timeline */}
              <View className="p-6 bg-slate-50/50 flex-1">
                 <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">
                  Incident Timeline
                 </Text>
                 <TimelineCard />
              </View>
            </FloatingPanel>
          );
        })()}
      </SafeAreaView>

      <LocationPermissionModal 
        visible={isLocationModalVisible} 
        onAllow={onAllowLocation} 
        onDeny={onDenyLocation} 
      />
    </View>
  );
}
