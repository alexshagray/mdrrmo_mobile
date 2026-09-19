import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
import { ShieldCheck, Radio, CheckCircle2 } from 'lucide-react-native';
import { DispatchSummaryCard } from '@/responder/components/cards/DispatchSummaryCard';
import { CrewCard } from '@/responder/components/cards/CrewCard';
import { DispatchCard } from '@/responder/components/cards/DispatchCard';
import { getActiveDispatches, acceptDispatch } from '@/shared/api/dispatches';
import { getCrewMembers } from '@/shared/api/crew';
import { useAuth } from '@/shared/auth/authContext';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';
import { resolveAddressFromCoords } from '@/shared/utils/location';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { missionRefreshTrigger } = useMissionAlarm();
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
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
      fetchCrew();
    }, [])
  );

  // Auto-refresh when real-time mission assignment or status change arrives via WebSockets
  useEffect(() => {
    fetchDispatches();
    fetchCrew();
  }, [missionRefreshTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDispatches(), fetchCrew()]);
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
    </SafeAreaView>
  );
}
