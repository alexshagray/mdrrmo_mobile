import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Search,
  CheckCheck,
  ShieldCheck,
  XCircle,
  Clock,
  Ambulance,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { getMyReports } from '@/shared/api/incidents';
import {
  getStoredNotifications,
  saveNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/shared/api/notifications';

interface NotificationItem {
  id: string;
  reportId?: number;
  title: string;
  message: string;
  type: 'received' | 'verified' | 'rejected' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'system';
  timestamp: string;
  read: boolean;
  rejectionReason?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'updates'>('all');

  const loadNotifications = useCallback(async () => {
    try {
      // 1. Fetch user's actual reports from server
      const reportsRes = await getMyReports();
      const reportsList: any[] = reportsRes.data || reportsRes.incidents || (Array.isArray(reportsRes) ? reportsRes : []);

      // 2. Fetch locally persisted read states
      const stored = await getStoredNotifications();
      const readMap = new Map<string, boolean>();
      stored.forEach((item: any) => {
        if (item.id && item.read) {
          readMap.set(item.id, true);
        }
      });

      // 3. Build notifications list from actual reports
      const generatedNotifs: NotificationItem[] = [];

      // System announcement default
      generatedNotifs.push({
        id: 'system-opol-ems-online',
        title: 'MDRRMO Emergency Services Online',
        message: 'Opol Emergency Medical Response System is active 24/7. In life-threatening emergencies, call 0917-707-6765.',
        type: 'system',
        timestamp: new Date().toISOString(),
        read: readMap.get('system-opol-ems-online') || false,
      });

      reportsList.forEach((r) => {
        const idCode = `INC-2026-${r.id?.toString().padStart(5, '0')}`;
        const typeName = r.incident_type?.name || r.incident_type || 'Medical Emergency';
        const activeDispatch = r.active_dispatch;
        const dStatus = activeDispatch?.dispatch_status;

        // Base notification: Report Received
        const receivedId = `notif-${r.id}-received`;
        generatedNotifs.push({
          id: receivedId,
          reportId: r.id,
          title: `Emergency Report Received (${idCode})`,
          message: `Your report for "${typeName}" was received by MDRRMO Command Center and placed in dispatch queue.`,
          type: 'received',
          timestamp: r.reported_at || r.created_at,
          read: readMap.get(receivedId) || false,
        });

        // Verification or Rejection
        if (r.incident_status === 'rejected') {
          const rejectedId = `notif-${r.id}-rejected`;
          const reason = r.verification_remarks || r.rejection_reason || 'Does not qualify for emergency vehicle dispatch.';
          generatedNotifs.push({
            id: rejectedId,
            reportId: r.id,
            title: `Report Not Approved (${idCode})`,
            message: `Dispatcher Review: Declined. Reason: ${reason}`,
            type: 'rejected',
            timestamp: r.updated_at || r.reported_at,
            read: readMap.get(rejectedId) || false,
            rejectionReason: reason,
          });
        } else if (['verified', 'assigned', 'responding', 'resolved'].includes(r.incident_status)) {
          const verifiedId = `notif-${r.id}-verified`;
          generatedNotifs.push({
            id: verifiedId,
            reportId: r.id,
            title: `Report Verified (${idCode})`,
            message: `Command Center has approved your emergency report. Resources are mobilized.`,
            type: 'verified',
            timestamp: r.verified_at || r.updated_at || r.reported_at,
            read: readMap.get(verifiedId) || false,
          });
        }

        // Assigned
        if (activeDispatch || ['assigned', 'responding'].includes(r.incident_status)) {
          const assignedId = `notif-${r.id}-assigned`;
          const unit = activeDispatch?.ambulance?.vehicle_name || 'Ambulance Unit';
          generatedNotifs.push({
            id: assignedId,
            reportId: r.id,
            title: `Responder Assigned (${idCode})`,
            message: `${unit} has been assigned to your emergency report and is preparing departure.`,
            type: 'assigned',
            timestamp: activeDispatch?.created_at || r.updated_at,
            read: readMap.get(assignedId) || false,
          });
        }

        // En route
        if (['en_route', 'arrived_on_scene', 'completed'].includes(dStatus)) {
          const enRouteId = `notif-${r.id}-en_route`;
          generatedNotifs.push({
            id: enRouteId,
            reportId: r.id,
            title: `Responder En Route (${idCode})`,
            message: `Emergency response unit is traveling to your reported location. Track live on the map.`,
            type: 'en_route',
            timestamp: activeDispatch?.updated_at || r.updated_at,
            read: readMap.get(enRouteId) || false,
          });
        }

        // Arrived
        if (['arrived_on_scene', 'completed'].includes(dStatus)) {
          const arrivedId = `notif-${r.id}-arrived`;
          generatedNotifs.push({
            id: arrivedId,
            reportId: r.id,
            title: `Responders On Scene (${idCode})`,
            message: `Emergency medical team has arrived at your emergency scene.`,
            type: 'arrived',
            timestamp: activeDispatch?.updated_at || r.updated_at,
            read: readMap.get(arrivedId) || false,
          });
        }

        // Completed
        if (r.incident_status === 'resolved' || dStatus === 'completed') {
          const compId = `notif-${r.id}-completed`;
          generatedNotifs.push({
            id: compId,
            reportId: r.id,
            title: `Emergency Mission Completed (${idCode})`,
            message: `Patient care and transport concluded successfully. Stay safe!`,
            type: 'completed',
            timestamp: r.resolved_at || r.updated_at,
            read: readMap.get(compId) || false,
          });
        }
      });

      // Sort newest first
      generatedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setNotifications(generatedNotifs);
      await saveNotifications(generatedNotifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      await markNotificationRead(item.id);
    }

    if (item.reportId) {
      router.push({
        pathname: '/(resident)/report-details',
        params: { id: item.reportId },
      });
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead();
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'rejected':
        return { icon: XCircle, color: '#F43F5E', bg: 'bg-rose-500/10 border-rose-500/30' };
      case 'verified':
        return { icon: ShieldCheck, color: '#3B82F6', bg: 'bg-blue-500/10 border-blue-500/30' };
      case 'assigned':
      case 'en_route':
        return { icon: Ambulance, color: '#818CF8', bg: 'bg-indigo-500/10 border-indigo-500/30' };
      case 'arrived':
      case 'completed':
        return { icon: CheckCircle2, color: '#10B981', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      case 'system':
        return { icon: Radio, color: '#F59E0B', bg: 'bg-amber-500/10 border-amber-500/30' };
      default:
        return { icon: Clock, color: '#94A3B8', bg: 'bg-slate-800 border-slate-700' };
    }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      if (filterTab === 'unread' && n.read) return false;
      if (filterTab === 'updates' && n.type === 'system') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    });
  }, [notifications, filterTab, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-[#0B1120]" edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-[#0F172A]/90">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 items-center justify-center mr-3">
            <Bell size={20} color="#3B82F6" />
          </View>
          <View>
            <Text className="text-white text-base font-bold tracking-tight">Notifications</Text>
            <Text className="text-slate-400 text-xs">Emergency Alerts & Updates</Text>
          </View>
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            className="flex-row items-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700"
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color="#60A5FA" />
            <Text className="text-blue-400 text-xs font-bold ml-1.5">Mark All Read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search Input Bar */}
      <View className="px-5 pt-3.5 pb-2">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5">
          <Search size={18} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search alerts & notifications..."
            placeholderTextColor="#475569"
            className="flex-1 ml-3 text-white text-sm"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-2 px-5 py-2">
        <TouchableOpacity
          onPress={() => setFilterTab('all')}
          className={`px-4 py-1.5 rounded-xl border ${
            filterTab === 'all' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <Text className={`text-xs font-bold ${filterTab === 'all' ? 'text-white' : 'text-slate-400'}`}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterTab('unread')}
          className={`px-4 py-1.5 rounded-xl border ${
            filterTab === 'unread' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <Text className={`text-xs font-bold ${filterTab === 'unread' ? 'text-white' : 'text-slate-400'}`}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterTab('updates')}
          className={`px-4 py-1.5 rounded-xl border ${
            filterTab === 'updates' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <Text className={`text-xs font-bold ${filterTab === 'updates' ? 'text-white' : 'text-slate-400'}`}>
            Report Updates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-slate-400 text-sm mt-3">Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 100 }}
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
          {filteredNotifs.length === 0 ? (
            <View className="items-center justify-center py-16 px-4 bg-[#0F172A]/40 border border-slate-800 rounded-3xl mt-4">
              <View className="w-16 h-16 rounded-3xl bg-slate-800/60 items-center justify-center border border-slate-700 mb-3">
                <Bell size={28} color="#64748B" />
              </View>
              <Text className="text-white font-bold text-base text-center">No Notifications Found</Text>
              <Text className="text-slate-400 text-xs text-center mt-1">
                You're all caught up with emergency alerts.
              </Text>
            </View>
          ) : (
            filteredNotifs.map((item) => {
              const iconInfo = getNotifIcon(item.type);
              const IconComp = iconInfo.icon;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleMarkAsRead(item)}
                  className={`border rounded-3xl p-4 mb-3 shadow-lg active:bg-slate-850 ${
                    item.read
                      ? 'bg-[#0F172A]/60 border-slate-800/70'
                      : 'bg-[#131E36] border-blue-600/40'
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center border mr-3 mt-0.5 ${iconInfo.bg}`}
                    >
                      <IconComp size={18} color={iconInfo.color} />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className={`text-xs font-bold flex-1 mr-2 ${
                            item.read ? 'text-slate-200' : 'text-white'
                          }`}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View className="flex-row items-center">
                          {!item.read ? (
                            <View className="w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
                          ) : null}
                          <Text className="text-slate-500 text-[10px] font-medium">
                            {formatTime(item.timestamp)}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className={`text-xs leading-relaxed ${
                          item.read ? 'text-slate-400' : 'text-slate-300'
                        }`}
                      >
                        {item.message}
                      </Text>

                      {item.reportId ? (
                        <View className="flex-row items-center mt-2">
                          <Text className="text-blue-400 text-[11px] font-bold">
                            View Report Details
                          </Text>
                          <ChevronRight size={13} color="#60A5FA" className="ml-0.5" />
                        </View>
                      ) : null}
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
