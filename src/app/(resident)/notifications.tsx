import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  ArrowLeft,
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
  Navigation,
} from 'lucide-react-native';
import { getMyReports } from '@/shared/api/incidents';
import { BrandBackground } from '@/shared/components';
import {
  getStoredNotifications,
  saveNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  generateNotificationsFromReports,
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

      // 3. Build unified notifications list
      const generatedNotifs = generateNotificationsFromReports(reportsList, readMap);
      setNotifications(generatedNotifs as NotificationItem[]);

      // Mark all current notifications as read now that resident has opened notifications screen
      const allRead = generatedNotifs.map((n: any) => ({ ...n, read: true }));
      await saveNotifications(allRead);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    return () => {
      markAllNotificationsRead();
    };
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

  const getNotifMeta = (type: NotificationItem['type']) => {
    switch (type) {
      case 'rejected':
        return {
          icon: XCircle,
          color: '#DC2626',
          bg: '#FEF2F2',
          border: '#FECACA',
          badgeBg: '#FEE2E2',
          badgeText: '#B91C1C',
          tag: 'DECLINED',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          badgeBg: '#D1FAE5',
          badgeText: '#047857',
          tag: 'COMPLETED',
        };
      case 'arrived':
        return {
          icon: CheckCircle2,
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          badgeBg: '#D1FAE5',
          badgeText: '#047857',
          tag: 'ON SCENE',
        };
      case 'en_route':
        return {
          icon: Navigation,
          color: '#208AEF',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          badgeBg: '#DBEAFE',
          badgeText: '#1D4ED8',
          tag: 'EN ROUTE',
        };
      case 'assigned':
        return {
          icon: Ambulance,
          color: '#208AEF',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          badgeBg: '#DBEAFE',
          badgeText: '#1D4ED8',
          tag: 'UNIT ASSIGNED',
        };
      case 'verified':
        return {
          icon: ShieldCheck,
          color: '#208AEF',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          badgeBg: '#DBEAFE',
          badgeText: '#1D4ED8',
          tag: 'VERIFIED',
        };
      case 'system':
        return {
          icon: Radio,
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
          badgeBg: '#FEF3C7',
          badgeText: '#B45309',
          tag: 'ANNOUNCEMENT',
        };
      case 'received':
      default:
        return {
          icon: Clock,
          color: '#208AEF',
          bg: '#EFF6FF',
          border: '#BFDBFE',
          badgeBg: '#DBEAFE',
          badgeText: '#1D4ED8',
          tag: 'DISPATCH QUEUE',
        };
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
    <View style={styles.container}>
      <BrandBackground variant="subpage" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              onPress={async () => {
                await markAllNotificationsRead();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(resident)');
                }
              }}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
            >
              <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            <View>
              <Text style={styles.appBarTitle}>Notifications</Text>
              <Text style={styles.appBarSubtitle}>Emergency Alerts & Updates</Text>
            </View>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={styles.markAllButton}
              activeOpacity={0.7}
            >
              <CheckCheck size={15} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={18} color="#64748B" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search alerts & updates..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.clearSearchBtn}
              >
                <XCircle size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            onPress={() => setFilterTab('all')}
            style={[
              styles.filterTab,
              filterTab === 'all' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === 'all' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterTab('unread')}
            style={[
              styles.filterTab,
              filterTab === 'unread' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === 'unread' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterTab('updates')}
            style={[
              styles.filterTab,
              filterTab === 'updates' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === 'updates' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              Report Updates
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notification List */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={styles.loadingText}>Loading emergency alerts & updates...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
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
            {filteredNotifs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                  {searchQuery ? (
                    <Search size={30} color="#64748B" strokeWidth={2} />
                  ) : (
                    <Bell size={30} color="#64748B" strokeWidth={2} />
                  )}
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery
                    ? 'No Matching Alerts'
                    : filterTab === 'unread'
                    ? 'No Unread Notifications'
                    : 'No Notifications Found'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `No notifications found matching "${searchQuery}". Try a different keyword.`
                    : filterTab === 'unread'
                    ? 'You have read all emergency reports and dispatch alerts.'
                    : "You're all caught up. MDRRMO response updates and emergency notices will appear here."}
                </Text>
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearFilterButton}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.clearFilterButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              filteredNotifs.map((item) => {
                const meta = getNotifMeta(item.type);
                const IconComp = meta.icon;

                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleMarkAsRead(item)}
                    activeOpacity={0.75}
                    style={[
                      styles.card,
                      !item.read ? styles.unreadCard : styles.readCard,
                    ]}
                  >
                    <View style={styles.cardHeaderRow}>
                      {/* Left Icon Container */}
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: meta.bg, borderColor: meta.border },
                        ]}
                      >
                        <IconComp size={22} color={meta.color} strokeWidth={2.2} />
                      </View>

                      {/* Content Area */}
                      <View style={styles.cardContent}>
                        {/* Meta Row: Status Pill on Left, Timestamp + Dot on Right */}
                        <View style={styles.metaRow}>
                          <View style={[styles.badge, { backgroundColor: meta.badgeBg }]}>
                            <Text style={[styles.badgeText, { color: meta.badgeText }]}>
                              {meta.tag}
                            </Text>
                          </View>

                          <View style={styles.timeRow}>
                            {!item.read ? <View style={styles.unreadDot} /> : null}
                            <Text
                              style={[
                                styles.timestamp,
                                !item.read && styles.unreadTimestamp,
                              ]}
                            >
                              {formatTime(item.timestamp)}
                            </Text>
                          </View>
                        </View>

                        {/* Title - Bold, Readable, Wraps Naturally */}
                        <Text
                          style={[
                            styles.cardTitle,
                            !item.read ? styles.unreadCardTitle : styles.readCardTitle,
                          ]}
                        >
                          {item.title}
                        </Text>

                        {/* Description - Charcoal / Medium Gray, Clear Line Height */}
                        <Text
                          style={[
                            styles.cardMessage,
                            !item.read ? styles.unreadCardMessage : styles.readCardMessage,
                          ]}
                        >
                          {item.message}
                        </Text>

                        {/* Action Link: View Report Details */}
                        {item.reportId ? (
                          <View style={styles.actionRow}>
                            <Text style={styles.actionText}>View Report Details</Text>
                            <ChevronRight size={16} color="#208AEF" strokeWidth={2.4} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appBarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appBarTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  appBarSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterTabActive: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTabInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: 12,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterTabTextInactive: {
    color: '#475569',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 50,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13.5,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  clearFilterButton: {
    marginTop: 16,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  clearFilterButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  readCard: {
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    borderColor: '#BFDBFE',
    borderLeftWidth: 4.5,
    borderLeftColor: '#208AEF',
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#208AEF',
    marginRight: 6,
  },
  timestamp: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  unreadTimestamp: {
    color: '#208AEF',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16.5,
    lineHeight: 22,
    marginBottom: 4,
  },
  readCardTitle: {
    color: '#1E293B',
    fontWeight: '700',
  },
  unreadCardTitle: {
    color: '#0F172A',
    fontWeight: '800',
  },
  cardMessage: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  readCardMessage: {
    color: '#475569',
    fontWeight: '400',
  },
  unreadCardMessage: {
    color: '#334155',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionText: {
    color: '#208AEF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

