import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineSyncService, SyncStatus } from '../services/offlineSyncService';
import ENV from '../config/env';

export type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'syncing';

export function useNetworkStatus() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('online');
  const [isWeakConnection, setIsWeakConnection] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const isReconnectingRef = useRef(false);
  const isOnlineRef = useRef(true);

  // Ping server directly to confirm real internet reachability
  const checkServerReachability = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const pingUrl = `${ENV.API_URL}/ping`;
      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (e) {
      return false;
    }
  }, []);

  // Update pending count from sync service
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineSyncService.getPendingCount();
      setPendingCount(count);
      setLastSyncTime(offlineSyncService.getLastSyncTime());
    } catch (e) {}
  }, []);

  // Manual or automatic sync trigger
  const triggerSync = useCallback(async () => {
    setConnectionStatus('syncing');
    try {
      await offlineSyncService.syncPending();
    } catch (e) {
      console.warn('[useNetworkStatus] triggerSync error:', e);
    } finally {
      await refreshPendingCount();
      const reachable = await checkServerReachability();
      setConnectionStatus(reachable ? 'online' : 'offline');
    }
  }, [checkServerReachability, refreshPendingCount]);

  useEffect(() => {
    let isMounted = true;

    // Listen to sync lifecycle events
    const unsubscribeSync = offlineSyncService.subscribe((status: SyncStatus, meta?: any) => {
      if (!isMounted) return;
      if (meta?.pendingCount !== undefined) {
        setPendingCount(meta.pendingCount);
      }
      if (status === 'syncing') {
        setConnectionStatus('syncing');
      } else if (status === 'completed' || status === 'idle') {
        refreshPendingCount();
        if (isOnlineRef.current) {
          setConnectionStatus('online');
        }
      } else if (status === 'error') {
        refreshPendingCount();
      }
    });

    // Handle NetInfo state transitions
    const handleNetworkState = async (state: NetInfoState) => {
      if (!isMounted) return;

      const hasInterface = state.isConnected;
      const isWeak =
        state.type === 'cellular' &&
        state.details &&
        (state.details.cellularGeneration === '2g' || state.details.cellularGeneration === '3g');
      setIsWeakConnection(Boolean(isWeak));

      if (!hasInterface) {
        isOnlineRef.current = false;
        setConnectionStatus('offline');
        refreshPendingCount();
        return;
      }

      // If interface is active, verify server reachability
      if (!isOnlineRef.current) {
        setConnectionStatus('reconnecting');
        isReconnectingRef.current = true;
      }

      const reachable = await checkServerReachability();
      if (!isMounted) return;

      if (reachable) {
        const wasOffline = !isOnlineRef.current;
        isOnlineRef.current = true;
        isReconnectingRef.current = false;

        refreshPendingCount();

        if (wasOffline) {
          console.log('[useNetworkStatus] Network restored! Triggering automatic synchronization...');
          triggerSync();
        } else {
          setConnectionStatus('online');
        }
      } else {
        isOnlineRef.current = false;
        isReconnectingRef.current = false;
        setConnectionStatus('offline');
        refreshPendingCount();
      }
    };

    // Initial check
    NetInfo.fetch().then(handleNetworkState);

    // Network change listener
    const unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkState);

    // Periodic heartbeat every 15s to catch silent link drops without NetInfo firing
    const interval = setInterval(async () => {
      if (!isMounted) return;
      const reachable = await checkServerReachability();
      if (!isMounted) return;

      if (!reachable && isOnlineRef.current) {
        console.warn('[useNetworkStatus] Server unreachable via periodic heartbeat. Switching to offline mode.');
        isOnlineRef.current = false;
        setConnectionStatus('offline');
        refreshPendingCount();
      } else if (reachable && !isOnlineRef.current) {
        console.log('[useNetworkStatus] Server reachable via periodic heartbeat. Reconnecting...');
        isOnlineRef.current = true;
        triggerSync();
      }
    }, 15000);

    return () => {
      isMounted = false;
      unsubscribeNetInfo();
      unsubscribeSync();
      clearInterval(interval);
    };
  }, [checkServerReachability, refreshPendingCount, triggerSync]);

  return {
    connectionStatus,
    isOnline: connectionStatus === 'online',
    isOffline: connectionStatus === 'offline',
    isReconnecting: connectionStatus === 'reconnecting',
    isSyncing: connectionStatus === 'syncing',
    isWeakConnection,
    pendingCount,
    lastSyncTime,
    triggerSync,
    checkReachability: checkServerReachability,
  };
}
