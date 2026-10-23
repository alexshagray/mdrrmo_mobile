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
  const consecutiveFailuresRef = useRef(0);
  const isMountedRef = useRef(true);

  // Ping server directly to confirm real reachability with a 6-second timeout (accommodates high-latency mobile data)
  const checkServerReachability = useCallback(async (timeoutMs = 6000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      if (isMountedRef.current) {
        setPendingCount(count);
        setLastSyncTime(offlineSyncService.getLastSyncTime());
      }
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
      if (isMountedRef.current) {
        if (reachable) {
          consecutiveFailuresRef.current = 0;
          isOnlineRef.current = true;
          setConnectionStatus('online');
        } else {
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 2) {
            isOnlineRef.current = false;
            setConnectionStatus('offline');
          }
        }
      }
    }
  }, [checkServerReachability, refreshPendingCount]);

  useEffect(() => {
    isMountedRef.current = true;

    // Listen to sync lifecycle events
    const unsubscribeSync = offlineSyncService.subscribe((status: SyncStatus, meta?: any) => {
      if (!isMountedRef.current) return;
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

    // Handle NetInfo state transitions with anti-flapping hysteresis
    const handleNetworkState = async (state: NetInfoState) => {
      if (!isMountedRef.current) return;

      const hasInterface = Boolean(state.isConnected);
      const isWeak =
        state.type === 'cellular' &&
        state.details &&
        (state.details.cellularGeneration === '2g' || state.details.cellularGeneration === '3g');
      setIsWeakConnection(Boolean(isWeak));

      // If phone has NO active interface at all (Airplane mode, Cellular & Wi-Fi completely OFF)
      if (!hasInterface) {
        consecutiveFailuresRef.current = 2;
        isOnlineRef.current = false;
        isReconnectingRef.current = false;
        setConnectionStatus('offline');
        refreshPendingCount();
        return;
      }

      // If interface is present and we were previously offline, show reconnecting
      if (!isOnlineRef.current && !isReconnectingRef.current) {
        setConnectionStatus('reconnecting');
        isReconnectingRef.current = true;
      }

      const reachable = await checkServerReachability(6000);
      if (!isMountedRef.current) return;

      if (reachable) {
        consecutiveFailuresRef.current = 0;
        const wasOffline = !isOnlineRef.current;
        isOnlineRef.current = true;
        isReconnectingRef.current = false;

        refreshPendingCount();

        if (wasOffline) {
          console.log('[useNetworkStatus] Connection stabilized and restored. Triggering sync...');
          triggerSync();
        } else {
          setConnectionStatus('online');
        }
      } else {
        consecutiveFailuresRef.current += 1;
        // Require 2 consecutive failures before declaring offline to prevent banner flapping
        if (consecutiveFailuresRef.current >= 2) {
          isOnlineRef.current = false;
          isReconnectingRef.current = false;
          setConnectionStatus('offline');
          refreshPendingCount();
        } else {
          // If only 1 failure occurred, perform a quick verification check after 2.5s
          setTimeout(async () => {
            if (!isMountedRef.current || isOnlineRef.current === false) return;
            const retryReachable = await checkServerReachability(5000);
            if (!isMountedRef.current) return;

            if (retryReachable) {
              consecutiveFailuresRef.current = 0;
              isOnlineRef.current = true;
              isReconnectingRef.current = false;
              setConnectionStatus('online');
            } else {
              consecutiveFailuresRef.current = 2;
              isOnlineRef.current = false;
              isReconnectingRef.current = false;
              setConnectionStatus('offline');
              refreshPendingCount();
            }
          }, 2500);
        }
      }
    };

    // Initial check
    NetInfo.fetch().then(handleNetworkState);

    // Network change listener
    const unsubscribeNetInfo = NetInfo.addEventListener(handleNetworkState);

    // Periodic heartbeat every 20s with fast confirmation retry before flapping
    const interval = setInterval(async () => {
      if (!isMountedRef.current) return;
      const reachable = await checkServerReachability(6000);
      if (!isMountedRef.current) return;

      if (!reachable) {
        consecutiveFailuresRef.current += 1;
        // If we were previously online, don't flap immediately on 1 failure: run quick confirmation check in 3 seconds
        if (isOnlineRef.current) {
          if (consecutiveFailuresRef.current >= 2) {
            console.warn('[useNetworkStatus] Server confirmed unreachable after repeated checks. Switching to offline mode.');
            isOnlineRef.current = false;
            setConnectionStatus('offline');
            refreshPendingCount();
          } else {
            setTimeout(async () => {
              if (!isMountedRef.current || !isOnlineRef.current) return;
              const retryReachable = await checkServerReachability(5000);
              if (!isMountedRef.current) return;

              if (!retryReachable) {
                consecutiveFailuresRef.current = 2;
                console.warn('[useNetworkStatus] Server confirmed unreachable on verification retry. Switching to offline mode.');
                isOnlineRef.current = false;
                setConnectionStatus('offline');
                refreshPendingCount();
              } else {
                consecutiveFailuresRef.current = 0;
              }
            }, 3000);
          }
        }
      } else {
        consecutiveFailuresRef.current = 0;
        if (!isOnlineRef.current) {
          console.log('[useNetworkStatus] Server reachable via heartbeat. Reconnecting...');
          isOnlineRef.current = true;
          triggerSync();
        }
      }
    }, 20000);

    return () => {
      isMountedRef.current = false;
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
