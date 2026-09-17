import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Clock,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Ambulance,
  MapPin,
  ChevronRight,
  Filter,
  AlertTriangle,
} from 'lucide-react-native';
import { getMyReports } from '@/shared/api/incidents';

type StatusFilter = 'all' | 'pending' | 'verified' | 'active' | 'resolved' | 'rejected';

export default function MyReportsScreen() {
  const router = useRouter();

  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchReports = useCallback(async () => {
    try {
      const res = await getMyReports();
      const list = res.data || res.incidents || (Array.isArray(res) ? res : []);
      setReports(list);
    } catch (err) {
      console.error('Failed to load resident reports:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchReports();
  };

  const getStatusDetails = (item: any) => {
    const status = item.incident_status || 'pending';
    const activeDispatch = item.active_dispatch;
    const dispatchStatus = activeDispatch?.dispatch_status;

    if (status === 'rejected') {
      return {
        label: 'REJECTED',
        dotColor: 'bg-rose-500',
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-950/60 border-rose-800/60',
        icon: XCircle,
      };
    }

    if (status === 'resolved') {
      return {
        label: 'COMPLETED',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/60 border-emerald-800/60',
        icon: CheckCircle2,
      };
    }

    if (dispatchStatus === 'en_route') {
      return {
        label: 'RESPONDER EN ROUTE',
        dotColor: 'bg-rose-500 animate-pulse',
        textColor: 'text-rose-400',
        badgeBg: 'bg-rose-950/60 border-rose-800/60',
        icon: Ambulance,
      };
    }

    if (dispatchStatus === 'arrived_on_scene') {
      return {
        label: 'RESPONDERS ON SCENE',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-950/60 border-emerald-800/60',
        icon: CheckCircle2,
      };
    }

    if (status === 'assigned' || dispatchStatus === 'assigned') {
      return {
        label: 'RESPONDER ASSIGNED',
        dotColor: 'bg-indigo-500',
        textColor: 'text-indigo-400',
        badgeBg: 'bg-indigo-950/60 border-indigo-800/60',
        icon: Ambulance,
      };
    }

    if (status === 'verified') {
      return {
        label: 'VERIFIED',
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-400',
        badgeBg: 'bg-blue-950/60 border-blue-800/60',
        icon: ShieldCheck,
      };
    }

    return {
      label: 'PENDING VERIFICATION',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-950/60 border-amber-800/60',
      icon: Clock,
    };
  };

  const formatReportDate = (dateStr: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Status filter
      const st = item.incident_status || 'pending';
      const isDispatchActive =
        item.active_dispatch &&
        !['completed', 'cancelled'].includes(item.active_dispatch.dispatch_status);

      if (statusFilter === 'pending' && st !== 'pending') return false;
      if (statusFilter === 'verified' && st !== 'verified') return false;
      if (statusFilter === 'active' && !isDispatchActive && !['assigned', 'responding'].includes(st))
        return false;
      if (statusFilter === 'resolved' && st !== 'resolved') return false;
      if (statusFilter === 'rejected' && st !== 'rejected') return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = `INC-2026-${item.id?.toString().padStart(5, '0')}`.toLowerCase();
      const type = (item.incident_type?.name || item.incident_type || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const loc = (item.place_of_incident || item.incident_address || item.address || '').toLowerCase();

      return code.includes(q) || type.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [reports, statusFilter, searchQuery]);

  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0F172A]/90">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-slate-700 active:bg-slate-700"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-white text-base font-bold tracking-tight">My Emergency Reports</Text>
          <Text className="text-slate-400 text-xs">Incident History</Text>
        </View>
        <View className="w-10 items-end">
          <View className="bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-full">
            <Text className="text-blue-400 text-xs font-bold">{reports.length}</Text>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5">
          <Search size={18} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search report ID, incident type, location..."
            placeholderTextColor="#475569"
            className="flex-1 ml-3 text-white text-sm"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text className="text-slate-500 text-xs font-bold">Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View className="py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5">
          <View className="flex-row gap-2 pr-5">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'verified', label: 'Verified' },
              { id: 'active', label: 'Active Dispatch' },
              { id: 'resolved', label: 'Completed' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setStatusFilter(tab.id as StatusFilter)}
                  className={`px-3.5 py-1.5 rounded-xl border ${
                    active
                      ? 'bg-blue-600 border-blue-500'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Report List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-slate-400 text-sm mt-3">Fetching your incident history...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
              colors={['#3B82F6']}
            />
          }
        >
          {filteredReports.length === 0 ? (
            <View className="items-center justify-center py-16 px-4 bg-[#0F172A]/40 border border-slate-800/80 rounded-3xl mt-4">
              <View className="w-16 h-16 rounded-3xl bg-slate-800/60 items-center justify-center border border-slate-700/50 mb-4">
                <Filter size={28} color="#64748B" />
              </View>
              <Text className="text-white font-bold text-base text-center">
                {reports.length === 0 ? 'No Emergency Reports Yet' : 'No Matching Reports'}
              </Text>
              <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[260px] leading-relaxed">
                {reports.length === 0
                  ? 'Reports you submit through the mobile app will automatically appear here.'
                  : 'Try changing your search query or status filter.'}
              </Text>
            </View>
          ) : (
            filteredReports.map((item) => {
              const statusInfo = getStatusDetails(item);
              const incidentIdCode = `INC-2026-${item.id?.toString().padStart(5, '0')}`;
              const typeName = item.incident_type?.name || item.incident_type || 'Medical Emergency';
              const locationStr =
                item.place_of_incident ||
                item.incident_address ||
                item.address ||
                'Opol, Misamis Oriental';

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(resident)/report-details',
                      params: { id: item.id },
                    })
                  }
                  className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-5 mb-3.5 shadow-lg active:bg-slate-850"
                  activeOpacity={0.8}
                >
                  {/* Card Header: ID & Status Badge */}
                  <View className="flex-row items-center justify-between mb-2.5">
                    <View className="bg-slate-800/90 border border-slate-700/70 px-2.5 py-1 rounded-lg">
                      <Text className="text-slate-300 font-mono font-bold text-xs">
                        {incidentIdCode}
                      </Text>
                    </View>
                    <View
                      className={`flex-row items-center px-2.5 py-1 rounded-full border ${statusInfo.badgeBg}`}
                    >
                      <View className={`w-2 h-2 rounded-full ${statusInfo.dotColor} mr-1.5`} />
                      <Text className={`text-[10px] font-extrabold tracking-wider ${statusInfo.textColor}`}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Incident Type */}
                  <Text className="text-white font-bold text-lg tracking-tight mb-1">
                    {typeName}
                  </Text>

                  {/* Incident Location */}
                  <View className="flex-row items-center mb-2">
                    <MapPin size={14} color="#94A3B8" />
                    <Text className="text-slate-400 text-xs ml-1.5 flex-1" numberOfLines={1}>
                      {locationStr}
                    </Text>
                  </View>

                  {/* Incident Date and Chevron */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-800/60 mt-1">
                    <View className="flex-row items-center">
                      <Clock size={13} color="#64748B" />
                      <Text className="text-slate-500 text-[11px] ml-1.5 font-medium">
                        {formatReportDate(item.reported_at || item.created_at)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-blue-400 text-xs font-semibold mr-1">Details</Text>
                      <ChevronRight size={14} color="#60A5FA" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
