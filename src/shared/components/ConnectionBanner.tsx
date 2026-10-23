import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload, AlertCircle, SignalMedium } from 'lucide-react-native';
import { useNetworkStatus, ConnectionState } from '../hooks/useNetworkStatus';

export default function ConnectionBanner() {
  const insets = useSafeAreaInsets();
  const {
    connectionStatus,
    isOnline,
    isOffline,
    isReconnecting,
    isSyncing,
    isWeakConnection,
    pendingCount,
    triggerSync,
  } = useNetworkStatus();

  // Animation value for sliding down/up
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Track if we just recovered from offline to show brief "Back online" pill
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const prevStatusRef = useRef<ConnectionState>(connectionStatus);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = connectionStatus;

    if ((prevStatus === 'offline' || prevStatus === 'reconnecting' || prevStatus === 'syncing') && connectionStatus === 'online') {
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  const isVisible = isOffline || isReconnecting || isSyncing || showOnlineToast || (isOnline && pendingCount > 0);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, opacity]);

  if (!isVisible && (translateY as any)._value === -100) {
    return null;
  }

  const renderBannerContent = () => {
    if (showOnlineToast) {
      return (
        <View style={[styles.bannerCard, styles.cardOnline]}>
          <View style={styles.leftContent}>
            <View style={styles.iconCircleOnline}>
              <CheckCircle2 size={16} color="#10B981" />
            </View>
            <View>
              <Text style={styles.titleOnline}>Connected to Server</Text>
              <Text style={styles.subtextOnline}>All offline records synchronized</Text>
            </View>
          </View>
        </View>
      );
    }

    if (isSyncing) {
      return (
        <View style={[styles.bannerCard, styles.cardSyncing]}>
          <View style={styles.leftContent}>
            <ActivityIndicator size="small" color="#208AEF" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.titleSyncing}>Synchronizing Pending Records</Text>
              <Text style={styles.subtextSyncing}>
                {pendingCount > 0 ? `${pendingCount} update(s) uploading in order...` : 'Uploading offline records...'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (isReconnecting) {
      return (
        <View style={[styles.bannerCard, styles.cardReconnecting]}>
          <View style={styles.leftContent}>
            <RefreshCw size={16} color="#D97706" style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.titleReconnecting}>Reconnecting to Server</Text>
              <Text style={styles.subtextReconnecting}>Restoring communication link...</Text>
            </View>
          </View>
        </View>
      );
    }

    if (isOffline) {
      return (
        <View style={[styles.bannerCard, styles.cardOffline]}>
          <View style={styles.leftContent}>
            <View style={styles.iconCircleOffline}>
              <WifiOff size={16} color="#FF3B30" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.titleOffline}>Offline Mode Active</Text>
                {pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{pendingCount} queued</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtextOffline}>
                Missions and reports save locally & will auto-sync when connection returns.
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (isOnline && pendingCount > 0) {
      return (
        <View style={[styles.bannerCard, styles.cardSyncing]}>
          <View style={styles.leftContent}>
            <CloudUpload size={16} color="#208AEF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.titleSyncing}>Pending Offline Records ({pendingCount})</Text>
              <Text style={styles.subtextSyncing}>Connection available to upload pending mission data.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={triggerSync} style={styles.syncBtn} activeOpacity={0.8}>
            <Text style={styles.syncBtnText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { top: insets.top + 6 }]} pointerEvents="box-none">
      <Animated.View style={{ transform: [{ translateY }], opacity }}>
        {renderBannerContent()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircleOffline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardOffline: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  titleOffline: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginRight: 8,
  },
  subtextOffline: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
    lineHeight: 15,
  },
  pendingBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardReconnecting: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  titleReconnecting: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  subtextReconnecting: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  cardSyncing: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  titleSyncing: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  subtextSyncing: {
    fontSize: 11,
    color: '#208AEF',
    marginTop: 1,
  },
  syncBtn: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardOnline: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  iconCircleOnline: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleOnline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  subtextOnline: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
});
