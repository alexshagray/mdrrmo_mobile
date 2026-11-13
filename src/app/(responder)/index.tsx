import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
import { ShieldCheck, Radio, CheckCircle2, Bell, MapPin, Clock, X, AlertTriangle, Info, ChevronRight, FileText } from 'lucide-react-native';
import { DispatchSummaryCard } from '@/responder/components/cards/DispatchSummaryCard';
import { CrewCard } from '@/responder/components/cards/CrewCard';
import { DispatchCard } from '@/responder/components/cards/DispatchCard';
import { getActiveDispatches, getAvailableIncidents } from '@/shared/api/dispatches';
import { getCrewMembers } from '@/shared/api/crew';
import { useAuth } from '@/shared/auth/authContext';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';
import { resolveAddressFromCoords } from '@/shared/utils/location';

const formatCapitalize = (str: string | undefined | null) => {
  if (!str) return 'Responder';
  return str
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getPriorityTheme = (priority: string | undefined) => {
  const p = (priority || '').toLowerCase();
  if (p === 'critical') {
    return {
      bg: 'bg-rose-50',
      border: 'border-rose-200/90',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      label: 'CRITICAL',
    };
  }
  if (p === 'high') {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200/90',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
      label: 'HIGH PRIORITY',
    };
  }
  return {
    bg: 'bg-blue-50',
    border: 'border-blue-200/90',
    text: 'text-[#1A76CE]',
    dot: 'bg-[#208AEF]',
    label: 'MODERATE',
  };
};

const formatVerifiedTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { missionRefreshTrigger, verifiedIncidentsTrigger, latestVerifiedIncident, clearVerifiedNotification } = useMissionAlarm();
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [todayStats, setTodayStats] = useState({ completed_missions: 0, patients_assisted: 0 });
  const [availableIncidents, setAvailableIncidents] = useState<any[]>([]);
  const [selectedVerifiedIncident, setSelectedVerifiedIncident] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [crewData, setCrewData] = useState<any>(null);

  const fetchDispatches = async () => {
    try {
      const res = await getActiveDispatches();
      if (res?.today_stats) {
        setTodayStats({
          completed_missions: Number(res.today_stats.completed_missions || 0),
          patients_assisted: Number(res.today_stats.patients_assisted || 0),
        });
      }
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

        const isGeneric =
          !locationName ||
          locationName.trim().toLowerCase() === 'opol, misamis oriental' ||
          locationName.trim().toLowerCase() === 'opol' ||
          locationName.toLowerCase().includes('coordinate') ||
          /^-?\d+\.\d+/.test(locationName.trim());

        if (isGeneric && !isNaN(incLat) && !isNaN(incLng) && (incLat !== 0 || incLng !== 0)) {
          const resolved = await resolveAddressFromCoords(incLat, incLng);
          if (resolved && resolved.trim().toLowerCase() !== 'opol, misamis oriental') {
            locationName = resolved;
          } else if (inc?.barangay) {
            locationName = `Brgy. ${inc.barangay}, Opol, Misamis Oriental`;
          }
        }

        if (!locationName) {
          locationName = inc?.barangay ? `Brgy. ${inc.barangay}, Opol, Misamis Oriental` : 'Opol, Misamis Oriental';
        }

        setActiveDispatch({
          id: `DSP-${new Date(d.created_at).getFullYear()}-${String(d.id).padStart(3, '0')}`,
          rawId: d.id,
          type: inc?.incident_type?.incident_type_name || inc?.incident_type?.name || 'Emergency',
          priority: inc?.priority || 'High',
          location: locationName,
          status: d.dispatch_status,
          time: new Date(d.assigned_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else if (!res?.is_offline) {
        setActiveDispatch(null);
      }
    } catch (error) {
      console.log('Error fetching dispatches:', error);
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

  const fetchCrew = async (retryCount = 0) => {
    try {
      const res = await getCrewMembers();
      if (res?.data) {
        setCrewData(res);
      }
    } catch (error) {
      console.log('Error fetching crew:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchCrew(retryCount + 1), 2500);
      } else {
        setCrewData({ data: [] });
      }
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

  // Automatic real-time polling so missions appear instantly without needing to pull down or scroll
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDispatches();
      fetchAvailableIncidents();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDispatches(), fetchAvailableIncidents(), fetchCrew()]);
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Background Elements (Same as Log in form) */}
      <View className="absolute top-0 left-0 right-0 h-[52%] bg-[#208AEF] rounded-b-[28px] overflow-hidden" pointerEvents="none">
        <View className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-[#3B9CF8] rounded-full opacity-40" />
        <View className="absolute top-[20%] right-[-80px] w-80 h-80 bg-[#1570C7] rounded-full opacity-40" />
        <View className="absolute bottom-[-30px] left-[10%] w-40 h-40 bg-[#70B9FA] rounded-full opacity-30" />
      </View>

      <SafeAreaView className="flex-1" edges={['top']}>
        <Header
          title={`Hello, ${formatCapitalize(user?.first_name)}`}
          subtitle={`OPOL RESQ • UNIT ${user?.responder_profile?.team || 'ALPHA'}`}
          className="bg-transparent"
          titleClassName="text-white font-black"
          subtitleClassName="text-blue-100 font-bold"
        />

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />}
        >

          {/* Verified Incidents Ready for Dispatch (Standby Section) */}
          {availableIncidents.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3 px-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-black text-white tracking-tight">
                    Verified Incidents
                  </Text>
                  <View className="bg-white/20 px-2.5 py-0.5 rounded-md border border-white/30">
                    <Text className="text-white text-[10px] font-extrabold tracking-wide">
                      {availableIncidents.length} READY
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center bg-white/15 border border-white/25 px-2.5 py-1 rounded-md">
                  <View className="w-1.5 h-1.5 rounded-full bg-white mr-1.5" />
                  <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">
                    STANDBY
                  </Text>
                </View>
              </View>

              <View className="space-y-3">
                {availableIncidents.map((inc) => {
                  const pTheme = getPriorityTheme(inc.priority);
                  const incidentCode = inc.incident_code || `INC-${String(inc.id).padStart(5, '0')}`;
                  return (
                    <TouchableOpacity
                      key={inc.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedVerifiedIncident(inc)}
                      className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-sm mb-3"
                      style={{ elevation: 2 }}
                    >
                      {/* Top Header Row */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                          <View className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 items-center justify-center">
                            <Radio size={16} color="#208AEF" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                              {incidentCode}
                            </Text>
                            <Text className="font-extrabold text-slate-900 text-sm leading-tight" numberOfLines={1}>
                              {inc.type}
                            </Text>
                          </View>
                        </View>
                        <View className={`px-2.5 py-1 rounded-md border flex-row items-center ${pTheme.bg} ${pTheme.border}`}>
                          <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${pTheme.dot}`} />
                          <Text className={`text-[10px] font-extrabold tracking-wider uppercase ${pTheme.text}`}>
                            {pTheme.label}
                          </Text>
                        </View>
                      </View>

                      {/* Location Box */}
                      <View className="bg-slate-50 rounded-lg p-2.5 mb-2.5 flex-row items-center border border-slate-100">
                        <View className="w-5 h-5 rounded bg-blue-50 items-center justify-center mr-2 border border-blue-100/70">
                          <MapPin size={11} color="#208AEF" />
                        </View>
                        <Text className="text-xs font-semibold text-slate-700 flex-1 truncate" numberOfLines={1}>
                          {inc.location}
                        </Text>
                      </View>

                      {/* Footer Info & View Details Button */}
                      <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                        <View className="flex-row items-center gap-1.5">
                          <Clock size={12} color="#94A3B8" />
                          <Text className="text-[11px] font-medium text-slate-500">
                            Verified {formatVerifiedTime(inc.verified_at)}
                          </Text>
                        </View>
                        <View
                          pointerEvents="none"
                          className="flex-row items-center bg-blue-50 border border-blue-200/90 px-3 py-1.5 rounded-lg"
                        >
                          <Text className="text-[#208AEF] text-xs font-bold mr-1">
                            View Details
                          </Text>
                          <ChevronRight size={13} color="#208AEF" strokeWidth={2.5} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Active Assignment Section */}
          {activeDispatch ? (
            <>
              <View className="flex-row items-center justify-between mb-3 px-1">
                <Text className="text-base font-bold text-white tracking-tight">
                  Active Assignment
                </Text>
                <View className="flex-row items-center bg-red-500/25 border border-white/30 px-2 py-0.5 rounded-md">
                  <View className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5" />
                  <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                    LIVE
                  </Text>
                </View>
              </View>
              <DispatchCard
                dispatch={activeDispatch}
                onDetails={() => router.navigate('/(responder)/dispatch')}
              />
            </>
          ) : (
            <View className="py-8 px-6 items-center justify-center bg-white rounded-2xl border border-white/80 mb-6 shadow-sm">
              <View className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center mb-3">
                <ShieldCheck size={26} color="#208AEF" />
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
          <DispatchSummaryCard
            completedMissions={todayStats.completed_missions}
            patientsAssisted={todayStats.patients_assisted}
          />

          {/* Crew Roster */}
          <CrewCard
            crew={crewData?.data}
            teamName={crewData?.team}
            currentUserId={user?.id}
          />
        </ScrollView>
      </SafeAreaView>

      {/* Verified Incident Detail Modal */}
      <Modal
        visible={selectedVerifiedIncident !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVerifiedIncident(null)}
        statusBarTranslucent={true}
      >
        {selectedVerifiedIncident && (
          <View className="flex-1 bg-slate-950/70 justify-center items-center px-4">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setSelectedVerifiedIncident(null)}
              className="absolute inset-0 bg-transparent"
            />
            <View 
              className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl border border-slate-100"
              style={{ elevation: 12 }}
            >
              {/* Header with Tracking Badge & Close Button */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                  <View className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 items-center justify-center">
                    <Radio size={20} color="#208AEF" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-0.5">
                      <View className="bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded">
                        <Text className="text-[10px] font-mono font-bold text-[#208AEF]">
                          {selectedVerifiedIncident.incident_code || `INC-${String(selectedVerifiedIncident.id).padStart(5, '0')}`}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base font-extrabold text-slate-900 tracking-tight" numberOfLines={1}>
                      {selectedVerifiedIncident.type}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedVerifiedIncident(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 active:bg-slate-200 items-center justify-center"
                >
                  <X size={16} color="#64748B" strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View className="py-3.5 space-y-2.5">
                {/* Status & Priority 3-Column Ribbon */}
                <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <View className="items-center flex-1 border-r border-slate-200/60">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Status</Text>
                    <View className="flex-row items-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                      <Text className="text-xs font-black text-emerald-600 uppercase">
                        Verified
                      </Text>
                    </View>
                  </View>
                  <View className="items-center flex-1 border-r border-slate-200/60">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Priority</Text>
                    <Text className={`text-xs font-black uppercase ${
                      (selectedVerifiedIncident.priority || '').toLowerCase() === 'critical'
                        ? 'text-rose-600'
                        : (selectedVerifiedIncident.priority || '').toLowerCase() === 'high'
                        ? 'text-amber-600'
                        : 'text-[#208AEF]'
                    }`}>
                      {selectedVerifiedIncident.priority || 'Moderate'}
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Verified At</Text>
                    <Text className="text-xs font-bold text-slate-700">
                      {formatVerifiedTime(selectedVerifiedIncident.verified_at)}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                <View className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <View className="flex-row items-center gap-1.5 mb-1">
                    <MapPin size={12} color="#208AEF" />
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Incident Location
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-slate-800 leading-snug">
                    {selectedVerifiedIncident.location}
                  </Text>
                  {selectedVerifiedIncident.barangay && (
                    <View className="mt-1.5 flex-row items-center">
                      <View className="bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded">
                        <Text className="text-[10px] font-bold text-[#1570C7]">
                          Barangay {selectedVerifiedIncident.barangay}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Description / Notes */}
                {selectedVerifiedIncident.description && (
                  <View className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <FileText size={12} color="#64748B" />
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Dispatcher Report Notes
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedVerifiedIncident.description}
                    </Text>
                  </View>
                )}

                {/* Standby Advisory */}
                <View className="flex-row items-start gap-2 bg-blue-50/80 p-3 rounded-lg border border-blue-200/70">
                  <View className="w-2 h-2 rounded-full bg-[#208AEF] mt-1 shrink-0" />
                  <Text className="text-[11px] text-blue-900 leading-relaxed font-medium flex-1">
                    <Text className="font-bold">Standby for Mission Assignment.</Text> MDRRMO Operations will dispatch this incident to an available ambulance unit shortly.
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <TouchableOpacity
                onPress={() => setSelectedVerifiedIncident(null)}
                className="w-full py-3 bg-[#208AEF] active:bg-[#1877D5] rounded-lg items-center shadow-md shadow-blue-500/20"
              >
                <Text className="text-white text-xs font-extrabold uppercase tracking-wider">
                  Close Details
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}
