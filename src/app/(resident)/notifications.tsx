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
        return { icon: XCircle, color: '#E11D48', bg: 'bg-rose-50 border-rose-200/70' };
      case 'verified':
        return { icon: ShieldCheck, color: '#2563EB', bg: 'bg-blue-50 border-blue-200/70' };
      case 'assigned':
      case 'en_route':
        return { icon: Ambulance, color: '#4F46E5', bg: 'bg-indigo-50 border-indigo-200/70' };
      case 'arrived':
      case 'completed':
        return { icon: CheckCircle2, color: '#059669', bg: 'bg-emerald-50 border-emerald-200/70' };
      case 'system':
        return { icon: Radio, color: '#D97706', bg: 'bg-amber-50 border-amber-200/70' };
      default:
        return { icon: Clock, color: '#64748B', bg: 'bg-slate-100 border-slate-200' };
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
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-200/80 bg-white">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/60 items-center justify-center mr-3">
            <Bell size={20} color="#4F46E5" />
          </View>
          <View>
            <Text className="text-slate-900 text-base font-bold tracking-tight">Notifications</Text>
            <Text className="text-slate-400 text-xs font-medium">Emergency Alerts & Updates</Text>
          </View>
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            className="flex-row items-center bg-slate-100 active:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200/80"
            activeOpacity={0.7}
          >
            <CheckCheck size={14} color="#4F46E5" />
            <Text className="text-indigo-600 text-xs font-bold ml-1.5">Mark All Read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search Input Bar */}
      <View className="px-5 pt-3.5 pb-2">
        <View className="flex-row items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-sm">
          <Search size={18} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search alerts & notifications..."
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-3 text-slate-800 text-sm font-medium"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <XCircle size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-2 px-5 py-2">
        <TouchableOpacity
          onPress={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-2xl border ${
            filterTab === 'all'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-white border-slate-200/80'
          }`}
          activeOpacity={0.75}
        >
          <Text className={`text-xs font-bold ${filterTab === 'all' ? 'text-white' : 'text-slate-600'}`}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterTab('unread')}
          className={`px-4 py-2 rounded-2xl border ${
            filterTab === 'unread'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-white border-slate-200/80'
          }`}
          activeOpacity={0.75}
        >
          <Text className={`text-xs font-bold ${filterTab === 'unread' ? 'text-white' : 'text-slate-600'}`}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterTab('updates')}
          className={`px-4 py-2 rounded-2xl border ${
            filterTab === 'updates'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-white border-slate-200/80'
          }`}
          activeOpacity={0.75}
        >
          <Text className={`text-xs font-bold ${filterTab === 'updates' ? 'text-white' : 'text-slate-600'}`}>
            Report Updates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="text-slate-400 text-sm mt-3 font-medium">Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-2"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#64748B"
              colors={['#4F46E5']}
            />
          }
        >
          {filteredNotifs.length === 0 ? (
            <View className="items-center justify-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl mt-4 shadow-sm">
              <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center border border-slate-200/60 mb-3">
                <Bell size={28} color="#94A3B8" />
              </View>
              <Text className="text-slate-900 font-bold text-base text-center">No Notifications Found</Text>
              <Text className="text-slate-400 text-xs text-center mt-1 font-medium">
                You're all caught up with emergency alerts and reports.
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
                  className={`border rounded-3xl p-4 mb-3 shadow-sm active:bg-slate-50 ${
                    item.read
                      ? 'bg-white border-slate-200/80'
                      : 'bg-white border-indigo-300 ring-1 ring-indigo-200'
                  }`}
                  style={{
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.04,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-start">
                    <View
                      className={`w-10 h-10 rounded-2xl items-center justify-center border mr-3 mt-0.5 ${iconInfo.bg}`}
                    >
                      <IconComp size={18} color={iconInfo.color} strokeWidth={2.25} />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className={`text-xs font-black flex-1 mr-2 ${
                            item.read ? 'text-slate-700' : 'text-slate-900'
                          }`}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <View className="flex-row items-center">
                          {!item.read ? (
                            <View className="w-2 h-2 rounded-full bg-indigo-600 mr-1.5" />
                          ) : null}
                          <Text className="text-slate-400 text-[10px] font-semibold">
                            {formatTime(item.timestamp)}
                          </Text>
                        </View>
                      </View>

                      <Text
                        className={`text-xs leading-relaxed font-medium ${
                          item.read ? 'text-slate-500' : 'text-slate-700'
                        }`}
                      >
                        {item.message}
                      </Text>

                      {item.reportId ? (
                        <View className="flex-row items-center mt-2.5 pt-2 border-t border-slate-100">
                          <Text className="text-indigo-600 text-[11px] font-bold">
                            View Report Details
                          </Text>
                          <ChevronRight size={13} color="#4F46E5" style={{ marginLeft: 2 }} />
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
