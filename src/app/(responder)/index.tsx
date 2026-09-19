import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header } from '@/shared/components';
import { Power, ShieldCheck, Radio, CheckCircle2 } from 'lucide-react-native';
import { DispatchSummaryCard } from '@/responder/components/cards/DispatchSummaryCard';
import { CrewCard } from '@/responder/components/cards/CrewCard';
import { DispatchCard } from '@/responder/components/cards/DispatchCard';
import { getActiveDispatches, acceptDispatch } from '@/shared/api/dispatches';
import { getCrewMembers, updateDutyStatus } from '@/shared/api/crew';
import { useAuth } from '@/shared/auth/authContext';
import { useMissionAlarm } from '@/shared/contexts/MissionAlarmContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isOnDuty, toggleDutyStatus } = useAuth();
  const { missionRefreshTrigger } = useMissionAlarm();
  const [activeDispatch, setActiveDispatch] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [crewData, setCrewData] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const handleChangeStatus = () => {
    setShowStatusModal(true);
  };

  const fetchDispatches = async () => {
    try {
      const res = await getActiveDispatches();
      if (res.data && res.data.length > 0) {
        const d = res.data[0];
        setActiveDispatch({
          id: `DSP-${new Date(d.created_at).getFullYear()}-${String(d.id).padStart(3, '0')}`,
          rawId: d.id,
          type: d.incident?.incident_type?.name || 'Emergency',
          priority: 'High',
          location: d.incident?.location || `${d.incident?.barangay || 'Unknown'}`,
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
        {/* Minimalist Operational Status Console */}
        <View
          className="bg-white rounded-3xl p-6 border border-slate-200/80 mb-6"
          style={{
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <View className="flex-row justify-between items-center mb-3.5">
            <View className="flex-row items-center">
              <View
                className={`w-2.5 h-2.5 rounded-full mr-2 ${
                  isOnDuty ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <Text className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                Operational Status
              </Text>
            </View>

            <View
              className={`px-3 py-1 rounded-full border ${
                isOnDuty
                  ? 'bg-emerald-50 border-emerald-200/70'
                  : 'bg-slate-100 border-slate-200/70'
              }`}
            >
              <Text
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  isOnDuty ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {isOnDuty ? 'Active / On Duty' : 'Standby / Off Duty'}
              </Text>
            </View>
          </View>

          <Text className="text-slate-900 text-2xl font-black tracking-tight mb-1">
            {isOnDuty ? 'Available for Missions' : 'Disconnected'}
          </Text>
          <Text className="text-slate-400 text-xs font-medium mb-5">
            {isOnDuty
              ? 'Telemetry streaming actively to the command center.'
              : 'You will not receive emergency dispatch alerts while off duty.'}
          </Text>

          <TouchableOpacity
            onPress={handleChangeStatus}
            activeOpacity={0.8}
            className={`py-3 px-5 rounded-2xl flex-row items-center justify-center border ${
              isOnDuty
                ? 'bg-slate-50 border-slate-200 active:bg-slate-100'
                : 'bg-emerald-600 border-emerald-500 active:bg-emerald-700'
            }`}
          >
            <Power
              size={15}
              color={isOnDuty ? '#475569' : '#FFFFFF'}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-bold text-xs tracking-wider ${
                isOnDuty ? 'text-slate-700' : 'text-white'
              }`}
            >
              {isOnDuty ? 'SWITCH TO OFF DUTY' : 'GO ON DUTY NOW'}
            </Text>
          </TouchableOpacity>
        </View>

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

      {/* Modern Status Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStatusModal}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-slate-900/60 p-5">
          <View
            className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-100"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="items-center mb-5">
              <View
                className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${
                  isOnDuty ? 'bg-amber-50 border border-amber-200/60' : 'bg-emerald-50 border border-emerald-200/60'
                }`}
              >
                <Power size={26} color={isOnDuty ? '#D97706' : '#059669'} />
              </View>
              <Text className="text-xl font-black text-slate-900 text-center mb-1.5">
                {isOnDuty ? 'Go Off Duty?' : 'Ready to Go On Duty?'}
              </Text>
              <Text className="text-slate-400 text-center text-xs font-medium leading-relaxed px-2">
                {isOnDuty
                  ? 'Your vehicle will be marked unavailable and you will not receive new emergency calls.'
                  : 'You will become active and available to receive new emergency mission dispatches.'}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowStatusModal(false)}
                activeOpacity={0.7}
                className="flex-1 py-3 bg-slate-100 rounded-2xl items-center"
              >
                <Text className="text-slate-600 font-bold text-xs">CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const newStatus = !isOnDuty;
                  setShowStatusModal(false);
                  await toggleDutyStatus(newStatus);
                  fetchCrew();
                }}
                activeOpacity={0.85}
                className={`flex-1 py-3 rounded-2xl items-center ${
                  isOnDuty ? 'bg-slate-900' : 'bg-emerald-600'
                }`}
              >
                <Text className="text-white font-bold text-xs tracking-wider">
                  {isOnDuty ? 'CONFIRM OFF' : 'CONFIRM ON'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
