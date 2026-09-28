import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
import { ShieldCheck, Radio, CheckCircle2, Bell, MapPin, Clock, X, AlertTriangle, Info } from 'lucide-react-native';
import { DispatchSummaryCard } from '@/responder/components/cards/DispatchSummaryCard';
import { CrewCard } from '@/responder/components/cards/CrewCard';
import { DispatchCard } from '@/responder/components/cards/DispatchCard';
import { getActiveDispatches, getAvailableIncidents } from '@/shared/api/dispatches';
import { getCrewMembers } from '@/shared/api/crew';
import { useAuth } from '@/shared/auth/authContext';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';
import { resolveAddressFromCoords } from '@/shared/utils/location';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { missionRefreshTrigger, verifiedIncidentsTrigger, latestVerifiedIncident, clearVerifiedNotification } = useMissionAlarm();
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [availableIncidents, setAvailableIncidents] = useState<any[]>([]);
  const [selectedVerifiedIncident, setSelectedVerifiedIncident] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [crewData, setCrewData] = useState<any>(null);

  const fetchDispatches = async () => {
    try {
      const res = await getActiveDispatches();
      const activeList = (res.data || []).filter((item: any) => 
        !['completed', 'cancelled'].includes(item.dispatch_status)
      );

      if (activeList.length > 0) {
        const d = activeList[0];
        const inc = d.incident;
        let locationName =
          inc?.place_of_incident ||
          inc?.incident_address ||
          (inc?.location_code ? `Marker ${inc.location_code}` : null) ||
          inc?.location ||
          inc?.barangay ||
          inc?.resident?.resident_profile?.barangay?.barangay_name;

        // If location is not yet a real name or was missing, resolve the real street/barangay name from coordinates
        const incLat = parseFloat(inc?.incident_latitude ?? inc?.latitude);
        const incLng = parseFloat(inc?.incident_longitude ?? inc?.longitude);

        if ((!locationName || locationName.toLowerCase().includes('coordinate') || /^-?\d+\.\d+/.test(locationName.trim())) && !isNaN(incLat) && !isNaN(incLng) && (incLat !== 0 || incLng !== 0)) {
          locationName = await resolveAddressFromCoords(incLat, incLng);
        }

        if (!locationName) {
          locationName = 'Opol, Misamis Oriental';
        }

        setActiveDispatch({
          id: `DSP-${new Date(d.created_at).getFullYear()}-${String(d.id).padStart(3, '0')}`,
          rawId: d.id,
          type: inc?.incident_type?.name || 'Emergency',
          priority: inc?.priority || 'High',
          location: locationName,
          status: d.dispatch_status,
          time: new Date(d.assigned_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        setActiveDispatch(null);
      }
    } catch (error) {
      console.log('Error fetching dispatches:', error);
      setActiveDispatch(null);
    }
  };

  const fetchAvailableIncidents = async () => {
    try {
      const res = await getAvailableIncidents();
      setAvailableIncidents(res.data || []);
    } catch (error) {
      console.log('Error fetching available incidents:', error);
      setAvailableIncidents([]);
    }
  };

  const fetchCrew = async () => {
    try {
      const res = await getCrewMembers();
      setCrewData(res);
    } catch (error) {
      console.log('Error fetching crew:', error);
      setCrewData({ data: [] });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDispatches();
      fetchAvailableIncidents();
      fetchCrew();
    }, [])
  );

  // Auto-refresh when real-time mission assignment or verified incident arrives via WebSockets
  useEffect(() => {
    fetchDispatches();
    fetchAvailableIncidents();
    fetchCrew();
  }, [missionRefreshTrigger, verifiedIncidentsTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDispatches(), fetchAvailableIncidents(), fetchCrew()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <Header
        title={`Hello, ${user?.first_name || 'Responder'}`}
        subtitle={`MDRRMO OPOL • UNIT ${user?.responder_profile?.team || 'ALPHA'}`}
        className="bg-transparent"
      />

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#64748B" />}
      >

        {/* Verified Incidents Ready for Dispatch (Standby Section) */}
        {availableIncidents.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3 px-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-bold text-slate-900 tracking-tight">
                  Verified Incidents
                </Text>
                <View className="bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                  <Text className="text-blue-700 text-[10px] font-bold">
                    {availableIncidents.length} READY
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                <Text className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                  STANDBY
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              {availableIncidents.map((inc) => (
                <TouchableOpacity
                  key={inc.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedVerifiedIncident(inc)}
                  className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                      <View className="w-7 h-7 rounded-lg bg-blue-50 items-center justify-center border border-blue-100">
                        <Bell size={14} color="#2563EB" />
                      </View>
                      <Text className="font-bold text-slate-900 text-sm truncate flex-1" numberOfLines={1}>
                        {inc.type}
                      </Text>
                    </View>
                    <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-bold text-slate-600 uppercase">
                        {inc.priority || 'MODERATE'}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1.5 mb-2">
                    <MapPin size={13} color="#64748B" />
                    <Text className="text-xs text-slate-600 flex-1 truncate" numberOfLines={1}>
                      {inc.location}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                    <View className="flex-row items-center gap-1">
                      <Clock size={12} color="#94A3B8" />
                      <Text className="text-[11px] text-slate-400">
                        Verified at {new Date(inc.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <Text className="text-blue-600 text-xs font-semibold">
                      View Details →
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Active Assignment Section */}
        {activeDispatch ? (
          <>
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-base font-bold text-slate-900 tracking-tight">
                Active Assignment
              </Text>
              <View className="flex-row items-center bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                <Text className="text-rose-600 text-[10px] font-bold uppercase tracking-wider">
                  LIVE
                </Text>
              </View>
            </View>
            <DispatchCard
              dispatch={activeDispatch}
              onDetails={() => router.push('/(responder)/dispatch')}
            />
          </>
        ) : (
          <View className="py-10 px-6 items-center justify-center bg-white rounded-3xl border border-slate-200/70 mb-6 shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 items-center justify-center mb-3">
              <ShieldCheck size={26} color="#94A3B8" />
            </View>
            <Text className="text-slate-800 font-bold text-base tracking-tight mb-1">
              All Stations Clear
            </Text>
            <Text className="text-slate-400 text-xs font-medium text-center">
              No active dispatches assigned to your unit at this moment.
            </Text>
          </View>
        )}

        {/* Metrics Overview */}
        <View className="mb-3 px-1">
          <Text className="text-base font-bold text-slate-900 tracking-tight">
            Today's Activity
          </Text>
        </View>
        <DispatchSummaryCard />

        {/* Crew Roster */}
        <CrewCard
          crew={crewData?.data}
          teamName={crewData?.team}
          currentUserId={user?.id}
        />
      </ScrollView>

      {/* Verified Incident Detail Modal */}
      {selectedVerifiedIncident && (
        <Modal
          visible={Boolean(selectedVerifiedIncident)}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedVerifiedIncident(null)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-5">
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center border border-blue-100">
                    <Bell size={16} color="#2563EB" />
                  </View>
                  <div>
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {selectedVerifiedIncident.incident_code || 'VERIFIED INCIDENT'}
                    </Text>
                    <Text className="text-base font-bold text-slate-900">
                      {selectedVerifiedIncident.type}
                    </Text>
                  </div>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedVerifiedIncident(null)}
                  className="p-1.5 rounded-full bg-slate-100"
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View className="py-4 space-y-3">
                {/* Status & Priority */}
                <View className="flex-row items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Status</Text>
                    <Text className="text-xs font-bold text-blue-600 uppercase">
                      {selectedVerifiedIncident.status || 'Verified'}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Priority</Text>
                    <Text className="text-xs font-bold text-amber-600 uppercase">
                      {selectedVerifiedIncident.priority || 'Moderate'}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Verified At</Text>
                    <Text className="text-xs font-semibold text-slate-700">
                      {new Date(selectedVerifiedIncident.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                </View>

                {/* Location */}
                <View className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Incident Location
                  </Text>
                  <View className="flex-row items-start gap-1.5">
                    <MapPin size={14} color="#64748B" className="mt-0.5" />
                    <Text className="text-xs font-semibold text-slate-800 flex-1">
                      {selectedVerifiedIncident.location}
                    </Text>
                  </View>
                  {selectedVerifiedIncident.barangay && (
                    <Text className="text-[11px] text-slate-500 pl-5 mt-0.5">
                      Barangay: {selectedVerifiedIncident.barangay}
                    </Text>
                  )}
                </View>

                {/* Description */}
                {selectedVerifiedIncident.description && (
                  <View className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Report Notes
                    </Text>
                    <Text className="text-xs text-slate-700 leading-relaxed">
                      {selectedVerifiedIncident.description}
                    </Text>
                  </View>
                )}

                {/* Standby Note */}
                <View className="flex-row items-start gap-2 bg-blue-50/70 p-3 rounded-xl border border-blue-200/60">
                  <Info size={15} color="#2563EB" className="mt-0.5 shrink-0" />
                  <Text className="text-[11px] text-blue-900 leading-tight flex-1">
                    Standby for Dispatcher Assignment. This incident is verified and will be dispatched by MDRRMO Operations.
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <TouchableOpacity
                onPress={() => setSelectedVerifiedIncident(null)}
                className="w-full bg-slate-900 py-3.5 rounded-xl items-center"
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
