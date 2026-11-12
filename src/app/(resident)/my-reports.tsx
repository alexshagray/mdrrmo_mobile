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
import { getMyReports, markReportsHistoryViewed } from '@/shared/api/incidents';
import { BrandBackground } from '@/shared/components';

type StatusFilter = 'all' | 'pending' | 'verified' | 'active' | 'resolved' | 'cancelled' | 'rejected';

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
      markReportsHistoryViewed().catch(() => {});
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
    if (!item) {
      return {
        label: 'PENDING VERIFICATION',
        dotColor: 'bg-amber-500',
        textColor: 'text-amber-800',
        badgeBg: 'bg-amber-50 border-amber-200',
        icon: Clock,
      };
    }

    const status = item.incident_status || 'pending';
    const activeDispatch = item.active_dispatch;
    const dispatchStatus = activeDispatch?.dispatch_status;

    if (status === 'rejected') {
      return {
        label: 'REJECTED',
        dotColor: 'bg-red-500',
        textColor: 'text-red-600',
        badgeBg: 'bg-red-50 border-red-200',
        icon: XCircle,
      };
    }

    if (status === 'cancelled') {
      return {
        label: 'CANCELLED',
        dotColor: 'bg-slate-400',
        textColor: 'text-slate-600',
        badgeBg: 'bg-slate-100 border-slate-200',
        icon: XCircle,
      };
    }

    if (status === 'resolved') {
      return {
        label: 'COMPLETED',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
      };
    }

    if (dispatchStatus === 'en_route') {
      return {
        label: 'RESPONDER EN ROUTE',
        dotColor: 'bg-red-500 animate-pulse',
        textColor: 'text-red-600',
        badgeBg: 'bg-red-50 border-red-200',
        icon: Ambulance,
      };
    }

    if (dispatchStatus === 'arrived_on_scene') {
      return {
        label: 'RESPONDERS ON SCENE',
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200',
        icon: CheckCircle2,
      };
    }

    if (status === 'assigned' || dispatchStatus === 'assigned') {
      return {
        label: 'RESPONDER ASSIGNED',
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 border-blue-200',
        icon: Ambulance,
      };
    }

    if (status === 'verified') {
      return {
        label: 'VERIFIED',
        dotColor: 'bg-blue-500',
        textColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 border-blue-200',
        icon: ShieldCheck,
      };
    }

    return {
      label: 'PENDING VERIFICATION',
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-800',
      badgeBg: 'bg-amber-50 border-amber-200',
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
      if (statusFilter === 'cancelled' && st !== 'cancelled') return false;
      if (statusFilter === 'rejected' && st !== 'rejected') return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = `INC-2026-${item.id?.toString().padStart(5, '0')}`.toLowerCase();
      const type = (item.incident_type?.incident_type_name || item.incident_type?.name || item.incident_type || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const loc = (item.place_of_incident || item.incident_address || item.address || '').toLowerCase();

      return code.includes(q) || type.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [reports, statusFilter, searchQuery]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(resident)');
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <BrandBackground variant="subpage" />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3.5 mb-1">
          <TouchableOpacity
            onPress={handleBack}
            className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center border border-white/30 active:bg-white/30"
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-white text-base font-bold tracking-tight">Emergency Request History</Text>
            <Text className="text-blue-100 text-xs font-medium">Submitted Reports & Dispatches</Text>
          </View>
          <View className="w-10 items-end">
            <View className="bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full">
              <Text className="text-white text-xs font-bold">{reports.length}</Text>
            </View>
          </View>
        </View>

      {/* Search Input Bar */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search report ID, incident type, location..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-slate-900 text-sm"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text className="text-slate-400 text-xs font-bold">Clear</Text>
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
              { id: 'cancelled', label: 'Cancelled' },
              { id: 'rejected', label: 'Rejected' },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setStatusFilter(tab.id as StatusFilter)}
                  style={{
                    backgroundColor: active ? '#208AEF' : '#FFFFFF',
                    borderColor: active ? '#208AEF' : '#E2E8F0',
                  }}
                  className="px-3.5 py-1.5 rounded-xl border mr-2 items-center justify-center flex-row"
                  activeOpacity={0.7}
                >
                  <Text
                    style={{ color: active ? '#FFFFFF' : '#475569' }}
                    className="text-xs font-bold"
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
          <ActivityIndicator size="large" color="#208AEF" />
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
              tintColor="#208AEF"
              colors={['#208AEF']}
            />
          }
        >
          {filteredReports.length === 0 ? (
            <View className="items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-3xl mt-4">
              <View className="w-16 h-16 rounded-3xl bg-slate-100 items-center justify-center border border-slate-200 mb-4">
                <Filter size={26} color="#94A3B8" />
              </View>
              <Text className="text-slate-900 font-bold text-base text-center">
                {reports.length === 0 ? 'No Emergency Reports Yet' : 'No Matching Reports'}
              </Text>
              <Text className="text-slate-500 text-xs text-center mt-1.5 max-w-[260px] leading-relaxed">
                {reports.length === 0
                  ? 'Reports you submit through the mobile app will automatically appear here.'
                  : 'Try changing your search query or status filter.'}
              </Text>
            </View>
          ) : (
            filteredReports.map((item, index) => {
              const statusInfo = getStatusDetails(item);
              const incidentIdCode = `INC-2026-${(item.id ?? index + 1).toString().padStart(5, '0')}`;
              const typeName =
                item.incident_type?.incident_type_name ||
                item.incident_type?.name ||
                item.incident_type ||
                'Medical Emergency';
              const locationStr =
                item.place_of_incident ||
                item.incident_address ||
                item.address ||
                'Opol, Misamis Oriental';

              return (
                <TouchableOpacity
                  key={`report-${item.id ?? index}`}
                  onPress={() =>
                    router.navigate({
                      pathname: '/(resident)/report-details',
                      params: { id: item.id },
                    })
                  }
                  className="bg-white border border-slate-200/80 rounded-3xl p-5 mb-3.5 active:bg-slate-50"
                  style={{
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.04,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                  activeOpacity={0.8}
                >
                  {/* Card Header: ID & Status Badge */}
                  <View className="flex-row items-center justify-between mb-2.5">
                    <View className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                      <Text className="text-slate-700 font-mono font-bold text-xs">
                        {incidentIdCode}
                      </Text>
                    </View>
                    <View
                      className={`flex-row items-center px-2.5 py-1 rounded-full border ${statusInfo.badgeBg}`}
                    >
                      <View className={`w-2 h-2 rounded-full ${statusInfo.dotColor} mr-1.5`} />
                      <Text className={`text-[10px] font-bold tracking-wider uppercase ${statusInfo.textColor}`}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  {/* Incident Type */}
                  <Text className="text-slate-900 font-bold text-base tracking-tight mb-1">
                    {typeName}
                  </Text>

                  {/* Incident Location */}
                  <View className="flex-row items-center mb-2">
                    <MapPin size={14} color="#64748B" />
                    <Text className="text-slate-500 text-xs ml-1.5 flex-1" numberOfLines={1}>
                      {locationStr}
                    </Text>
                  </View>

                  {/* Incident Date and Chevron */}
                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <View className="flex-row items-center">
                      <Clock size={13} color="#94A3B8" />
                      <Text className="text-slate-400 text-[11px] ml-1.5 font-medium">
                        {formatReportDate(item.reported_at || item.created_at)}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-[#208AEF] text-xs font-bold mr-1">Details</Text>
                      <ChevronRight size={14} color="#208AEF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  </View>
);
}
