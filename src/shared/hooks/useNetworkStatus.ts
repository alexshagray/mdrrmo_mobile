import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineSyncService, SyncStatus } from '../services/offlineSyncService';
import ENV from '../config/env';

export type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'syncing';

export interface NetworkManagerSnapshot {
  connectionStatus: ConnectionState;
  isWeakConnection: boolean;
  pendingCount: number;
  lastSyncTime: number | null;
}

class NetworkManager {
  private status: ConnectionState = 'online';
  private isWeak: boolean = false;
  private pendingCount: number = 0;
  private lastSyncTime: number | null = null;

  private isReconnecting = false;
  private isOnline = true;
  private consecutiveFailures = 0;

  private listeners = new Set<(snapshot: NetworkManagerSnapshot) => void>();
  private unsubscribeNetInfo: (() => void) | null = null;
  private unsubscribeSync: (() => void) | null = null;
  private heartbeatInterval: any = null;
  private isChecking = false;

  constructor() {
    // Initial fetch of pending count
    offlineSyncService
      .getPendingCount()
      .then((count) => {
        this.pendingCount = count;
        this.lastSyncTime = offlineSyncService.getLastSyncTime();
        this.notify();
      })
      .catch(() => {});
  }

  public getSnapshot(): NetworkManagerSnapshot {
    return {
      connectionStatus: this.status,
      isWeakConnection: this.isWeak,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
    };
  }

  public subscribe(listener: (snapshot: NetworkManagerSnapshot) => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.start();
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private notify() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public async checkServerReachability(timeoutMs = 8000): Promise<boolean> {
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
  }

  public async refreshPendingCount() {
    try {
      const count = await offlineSyncService.getPendingCount();
      this.pendingCount = count;
      this.lastSyncTime = offlineSyncService.getLastSyncTime();
      this.notify();
    } catch (e) {}
  }

  public async triggerSync() {
    this.status = 'syncing';
    this.notify();

    try {
      await offlineSyncService.syncPending();
    } catch (e) {
      console.warn('[useNetworkStatus] triggerSync error:', e);
    } finally {
      await this.refreshPendingCount();
      const reachable = await this.checkServerReachability(8000);
      if (reachable) {
        this.consecutiveFailures = 0;
        this.isOnline = true;
        this.status = 'online';
      } else {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= 2) {
          this.isOnline = false;
          this.status = 'offline';
        }
      }
      this.notify();
    }
  }

  private async handleNetworkState(state: NetInfoState) {
    const hasInterface = Boolean(state.isConnected);
    this.isWeak = Boolean(
      state.type === 'cellular' &&
        state.details &&
        (state.details.cellularGeneration === '2g' || state.details.cellularGeneration === '3g')
    );

    // If phone has NO active interface at all (Airplane mode, Cellular & Wi-Fi completely OFF)
    if (!hasInterface) {
      this.consecutiveFailures = 2;
      this.isOnline = false;
      this.isReconnecting = false;
      this.status = 'offline';
      this.refreshPendingCount();
      this.notify();
      return;
    }

    // If interface is present and we were previously offline, show reconnecting
    if (!this.isOnline && !this.isReconnecting) {
      this.status = 'reconnecting';
      this.isReconnecting = true;
      this.notify();
    }

    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const reachable = await this.checkServerReachability(8000);

      if (reachable) {
        this.consecutiveFailures = 0;
        const wasOffline = !this.isOnline;
        this.isOnline = true;
        this.isReconnecting = false;
        this.refreshPendingCount();

        if (wasOffline) {
          console.log('[useNetworkStatus] Connection stabilized and restored. Triggering sync...');
          this.triggerSync();
        } else {
          this.status = 'online';
          this.notify();
        }
      } else {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= 2) {
          this.isOnline = false;
          this.isReconnecting = false;
          this.status = 'offline';
          this.refreshPendingCount();
          this.notify();
        } else {
          // If 1 failure occurred, perform a verification check after 3.5s
          setTimeout(async () => {
            if (this.isOnline === false) return;
            const retryReachable = await this.checkServerReachability(6000);
            if (retryReachable) {
              this.consecutiveFailures = 0;
              this.isOnline = true;
              this.isReconnecting = false;
              this.status = 'online';
            } else {
              this.consecutiveFailures = 2;
              this.isOnline = false;
              this.isReconnecting = false;
              this.status = 'offline';
              this.refreshPendingCount();
            }
            this.notify();
          }, 3500);
        }
      }
    } finally {
      this.isChecking = false;
    }
  }

  private start() {
    this.unsubscribeSync = offlineSyncService.subscribe((status: SyncStatus, meta?: any) => {
      if (meta?.pendingCount !== undefined) {
        this.pendingCount = meta.pendingCount;
      }
      if (status === 'syncing') {
        this.status = 'syncing';
      } else if (status === 'completed' || status === 'idle') {
        this.refreshPendingCount();
        if (this.isOnline) {
          this.status = 'online';
        }
      } else if (status === 'error') {
        this.refreshPendingCount();
      }
      this.notify();
    });

    NetInfo.fetch().then((state) => this.handleNetworkState(state));
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => this.handleNetworkState(state));

    // Single heartbeat interval every 25 seconds across the entire app
    this.heartbeatInterval = setInterval(async () => {
      if (this.isChecking) return;
      this.isChecking = true;

      try {
        const reachable = await this.checkServerReachability(8000);

        if (!reachable) {
          this.consecutiveFailures += 1;
          if (this.isOnline) {
            if (this.consecutiveFailures >= 2) {
              console.warn('[useNetworkStatus] Server confirmed unreachable after repeated checks. Switching to offline mode.');
              this.isOnline = false;
              this.status = 'offline';
              this.refreshPendingCount();
              this.notify();
            } else {
              setTimeout(async () => {
                if (!this.isOnline) return;
                const retryReachable = await this.checkServerReachability(6000);
                if (!retryReachable) {
                  this.consecutiveFailures = 2;
                  console.warn('[useNetworkStatus] Server confirmed unreachable on verification retry. Switching to offline mode.');
                  this.isOnline = false;
                  this.status = 'offline';
                  this.refreshPendingCount();
                  this.notify();
                } else {
                  this.consecutiveFailures = 0;
                }
              }, 4000);
            }
          }
        } else {
          this.consecutiveFailures = 0;
          if (!this.isOnline) {
            console.log('[useNetworkStatus] Server reachable via heartbeat. Reconnecting...');
            this.isOnline = true;
            this.triggerSync();
          }
        }
      } finally {
        this.isChecking = false;
      }
    }, 25000);
  }

  private stop() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    if (this.unsubscribeSync) {
      this.unsubscribeSync();
      this.unsubscribeSync = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

const networkManager = new NetworkManager();

export function useNetworkStatus() {
  const [snapshot, setSnapshot] = useState<NetworkManagerSnapshot>(() => networkManager.getSnapshot());

  useEffect(() => {
    // Sync state immediately on mount
    setSnapshot(networkManager.getSnapshot());
    return networkManager.subscribe(setSnapshot);
  }, []);

  const triggerSync = useCallback(() => networkManager.triggerSync(), []);
  const checkReachability = useCallback((timeout?: number) => networkManager.checkServerReachability(timeout), []);

  return {
    connectionStatus: snapshot.connectionStatus,
    isOnline: snapshot.connectionStatus === 'online',
    isOffline: snapshot.connectionStatus === 'offline',
    isReconnecting: snapshot.connectionStatus === 'reconnecting',
    isSyncing: snapshot.connectionStatus === 'syncing',
    isWeakConnection: snapshot.isWeakConnection,
    pendingCount: snapshot.pendingCount,
    lastSyncTime: snapshot.lastSyncTime,
    triggerSync,
    checkReachability,
  };
}
