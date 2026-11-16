import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bell,
  X,
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Info,
  MapPin,
  Clock,
  ChevronRight,
  CheckCheck,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  getResponderNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  SystemNotificationItem,
} from '@/shared/api/responderNotifications';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function ResponderNotificationsModal({ visible, onClose, onUnreadCountChange }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getResponderNotificationsApi();
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        const count = res.unread_count ?? res.notifications.filter(n => n.status === 'unread').length;
        setUnreadCount(count);
        onUnreadCountChange?.(count);
      }
    } catch (e) {
      // Quiet fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadApi();
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
    setUnreadCount(0);
    onUnreadCountChange?.(0);
  };

  const handleNotificationPress = async (item: SystemNotificationItem) => {
    if (item.status === 'unread') {
      await markNotificationReadApi(item.id);
      setNotifications(prev =>
        prev.map(n => (n.id === item.id ? { ...n, status: 'read' } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    }

    onClose();

    // If notification has a dispatch or incident, navigate to dispatch screen
    if (item.dispatch_id || item.incident_id || item.data?.dispatch_id) {
      router.navigate('/(responder)/dispatch');
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dispatch_assigned':
        return {
          icon: <AlertTriangle size={18} color="#EF4444" />,
          bg: 'bg-rose-50',
          border: 'border-rose-100',
        };
      case 'dispatch_reassigned':
        return {
          icon: <RefreshCw size={18} color="#F59E0B" />,
          bg: 'bg-amber-50',
          border: 'border-amber-100',
        };
      case 'dispatch_cancelled':
        return {
          icon: <XCircle size={18} color="#DC2626" />,
          bg: 'bg-red-50',
          border: 'border-red-100',
        };
      case 'dispatch_accepted':
        return {
          icon: <CheckCircle2 size={18} color="#10B981" />,
          bg: 'bg-emerald-50',
          border: 'border-emerald-100',
        };
      case 'incident_updated':
        return {
          icon: <Info size={18} color="#208AEF" />,
          bg: 'bg-blue-50',
          border: 'border-blue-100',
        };
      default:
        return {
          icon: <Bell size={18} color="#208AEF" />,
          bg: 'bg-blue-50',
          border: 'border-blue-100',
        };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
          <View className="flex-row items-center gap-2.5">
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center border border-blue-100">
              <Bell size={20} color="#208AEF" />
            </View>
            <View>
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-black text-slate-900">Notifications</Text>
                {unreadCount > 0 && (
                  <View className="bg-rose-500 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-extrabold text-white">{unreadCount} NEW</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-slate-500 font-medium">Real-time dispatch alerts</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                activeOpacity={0.7}
                className="flex-row items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
              >
                <CheckCheck size={14} color="#64748B" style={{ marginRight: 4 }} />
                <Text className="text-[11px] font-bold text-slate-600">Mark read</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center border border-slate-200"
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#208AEF" />
            <Text className="text-xs text-slate-400 font-medium mt-3">Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Bell size={28} color="#94A3B8" />
            </View>
            <Text className="text-base font-black text-slate-800 text-center">No Notifications Yet</Text>
            <Text className="text-xs text-slate-400 text-center mt-1 leading-relaxed">
              When dispatches are assigned, updated, or cancelled, real-time alerts will appear here.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-3"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#208AEF" />
            }
          >
            {notifications.map(item => {
              const theme = getEventIcon(item.type);
              const isUnread = item.status === 'unread';
              const incType = item.data?.incident_type || item.incident?.incident_type?.name;
              const barangay = item.data?.barangay || item.incident?.barangay;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  onPress={() => handleNotificationPress(item)}
                  className={`bg-white rounded-2xl p-4 mb-3 border shadow-sm ${
                    isUnread ? 'border-blue-200 bg-blue-50/20' : 'border-slate-100'
                  }`}
                  style={{ elevation: 1 }}
                >
                  <View className="flex-row items-start justify-between mb-1.5">
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <View className={`w-8 h-8 rounded-lg items-center justify-center border ${theme.bg} ${theme.border}`}>
                        {theme.icon}
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-extrabold text-slate-900 leading-tight" numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Clock size={11} color="#94A3B8" />
                          <Text className="text-[11px] font-medium text-slate-400">
                            {formatTime(item.created_at)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isUnread && (
                      <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
                    )}
                  </View>

                  {/* Message body */}
                  <Text className="text-xs text-slate-600 leading-relaxed mt-1 font-medium">
                    {item.message}
                  </Text>

                  {/* Metadata tags */}
                  {(incType || barangay) && (
                    <View className="flex-row items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                      {incType && (
                        <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                            {incType}
                          </Text>
                        </View>
                      )}
                      {barangay && (
                        <View className="flex-row items-center bg-blue-50 px-2 py-0.5 rounded-md">
                          <MapPin size={10} color="#208AEF" style={{ marginRight: 3 }} />
                          <Text className="text-[10px] font-bold text-blue-700">
                            Brgy. {barangay}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
