import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Modal, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Header, Card, Button } from '@/shared/components';
import { Power, ShieldCheck } from 'lucide-react-native';
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
          time: new Date(d.assigned_at || d.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
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

  const handleAccept = async () => {
    if (!activeDispatch || !activeDispatch.rawId) return;
    try {
      await acceptDispatch(activeDispatch.rawId);
      Alert.alert('Success', 'Dispatch accepted successfully!');
      fetchDispatches(); // Refresh list to show updated status
    } catch (e) {
      Alert.alert('Error', 'Failed to accept dispatch.');
      console.log('Accept error:', e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-responder-background" edges={['top']}>
      <Header 
        title={`Good Morning, ${user?.first_name || 'Responder'}`} 
        subtitle={`MDRRMO Opol - Unit ${user?.responder_profile?.team || 'Alpha'}`} 
        className="bg-responder-background"
      />
      
      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        {/* Premium Shift Status Card */}
        <View 
          className={`${isOnDuty ? 'bg-blue-600' : 'bg-slate-800'} mb-6 rounded-[28px] p-6 ${isOnDuty ? 'border border-blue-500/50' : 'border border-slate-700'}`}
          style={{ 
            elevation: 8, 
            shadowColor: isOnDuty ? '#2563eb' : '#0f172a', 
            shadowOpacity: 0.3, 
            shadowRadius: 12, 
            shadowOffset: { width: 0, height: 6 } 
          }}
        >
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-full">
              <Power size={14} color={isOnDuty ? '#93C5FD' : '#94A3B8'} />
              <Text className={`${isOnDuty ? 'text-blue-100' : 'text-slate-400'} font-bold tracking-widest text-[11px] uppercase ml-1.5`}>
                System Status
              </Text>
            </View>
            <View className={`flex-row items-center ${isOnDuty ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-600/40 border border-slate-500/30'} px-3 py-1.5 rounded-full`}>
              <View className={`w-2 h-2 rounded-full mr-1.5 ${isOnDuty ? 'bg-green-400' : 'bg-slate-400'}`} />
              <Text className={`${isOnDuty ? 'text-green-400' : 'text-slate-300'} text-[11px] font-black uppercase tracking-wider`}>
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </Text>
            </View>
          </View>
          
          <Text className="text-white text-3xl font-black tracking-tight mb-1">
            {isOnDuty ? 'Available' : 'Unavailable'}
          </Text>
          <Text className={`${isOnDuty ? 'text-blue-200' : 'text-slate-400'} text-sm font-medium mb-6`}>
            {isOnDuty ? 'Ready to receive emergency dispatches.' : 'You are currently disconnected.'}
          </Text>
          
          <TouchableOpacity 
            className={`${isOnDuty ? 'bg-blue-700/80 border border-blue-400/30' : 'bg-slate-700/80 border border-slate-600/50'} py-4 px-6 rounded-2xl flex-row items-center justify-center`}
            onPress={handleChangeStatus}
            activeOpacity={0.8}
          >
            <Text className={`${isOnDuty ? 'text-blue-50' : 'text-slate-200'} font-black tracking-widest`}>
              CHANGE STATUS
            </Text>
          </TouchableOpacity>
        </View>

        {activeDispatch ? (
          <>
            <Text className="text-lg font-bold text-slate-800 mb-3">Active Assignment</Text>
            <DispatchCard 
              dispatch={activeDispatch} 
              onDetails={() => router.push('/(responder)/dispatch')} 
            />
          </>
        ) : (
          <View className="py-12 items-center justify-center bg-slate-50/80 rounded-3xl border-2 border-slate-200 border-dashed mb-4">
            <View className="bg-slate-200/50 p-4 rounded-full mb-3">
              <ShieldCheck size={40} color="#94A3B8" />
            </View>
            <Text className="text-slate-400 font-black text-xl tracking-tight mb-1">All Clear!</Text>
            <Text className="text-slate-400 font-medium text-sm text-center px-8">You currently have no active emergency dispatches.</Text>
          </View>
        )}

        <Text className="text-lg font-bold text-slate-800 mb-3 mt-2">Today's Overview</Text>
        <DispatchSummaryCard />
        
        <CrewCard 
          crew={crewData?.data} 
          teamName={crewData?.team} 
          currentUserId={user?.id} 
        />

      </ScrollView>

      {/* Premium Status Change Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showStatusModal}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-slate-900/70 p-4">
          <View className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <View className="items-center mb-4">
              <View className={`w-16 h-16 ${isOnDuty ? 'bg-slate-100' : 'bg-green-100'} rounded-full items-center justify-center mb-4`}>
                <Power size={32} color={isOnDuty ? '#64748B' : '#10B981'} />
              </View>
              <Text className="text-xl font-bold text-slate-800 text-center mb-2">
                {isOnDuty ? 'Go Off Duty?' : 'Go On Duty?'}
              </Text>
              <Text className="text-slate-500 text-center font-medium">
                {isOnDuty 
                  ? 'You will stop receiving emergency dispatches from the command center.' 
                  : 'You will become available to receive new emergency dispatches.'}
              </Text>
            </View>
            <View className="flex-row justify-between space-x-3 mt-4">
              <TouchableOpacity 
                onPress={() => setShowStatusModal(false)}
                className="flex-1 py-3.5 bg-slate-100 rounded-xl items-center"
              >
                <Text className="text-slate-600 font-bold">CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={async () => {
                  const newStatus = !isOnDuty;
                  setShowStatusModal(false);
                  await toggleDutyStatus(newStatus);
                  fetchCrew(); // refresh crew list so dot updates globally
                }}
                className={`flex-1 py-3.5 ${isOnDuty ? 'bg-slate-700' : 'bg-green-500'} rounded-xl items-center shadow-sm`}
              >
                <Text className="text-white font-bold">{isOnDuty ? 'GO OFF DUTY' : 'GO ON DUTY'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
