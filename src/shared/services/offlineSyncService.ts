import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

const QUEUE_KEY = '@mdrrmo_sync_queue_v2';
const ID_MAPPINGS_KEY = '@mdrrmo_sync_id_mappings';

export interface SyncOperation {
  id: string; // Internal queue ID
  operationId: string; // Unique idempotency UUID
  action: 'ACCEPT_DISPATCH' | 'UPDATE_STATUS' | 'CREATE_PATIENT' | 'UPDATE_PCR' | 'SUBMIT_PCR' | 'UPLOAD_PHOTO' | 'UNFOUNDED' | 'HTTP';
  dispatchId?: number | string;
  url?: string;
  method?: string;
  payload?: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  lastError?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'error';

class OfflineSyncService {
  private isSyncing: boolean = false;
  private apiClient: any = null;
  private listeners: Set<(status: SyncStatus, meta?: any) => void> = new Set();
  private lastSyncTime: number | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const last = await AsyncStorage.getItem('@mdrrmo_last_sync_timestamp');
      if (last) this.lastSyncTime = parseInt(last, 10);
    } catch (e) {}
  }

  public setClient(client: any) {
    this.apiClient = client;
  }

  private async getClient() {
    if (this.apiClient) return this.apiClient;
    const clientModule = await import('../api/client');
    this.apiClient = clientModule.default;
    return this.apiClient;
  }

  public subscribe(listener: (status: SyncStatus, meta?: any) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(status: SyncStatus, meta?: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(status, meta);
      } catch (err) {
        console.warn('[OfflineSyncService] Listener error:', err);
      }
    });
  }

  public generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Get all operations currently in the persistent queue
   */
  public async getQueue(): Promise<SyncOperation[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[OfflineSyncService] Failed to read queue:', e);
      return [];
    }
  }

  /**
   * Get total count of pending operations
   */
  public async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  /**
   * Enqueue a new operation with an idempotency token
   */
  public async enqueue(operation: Omit<SyncOperation, 'id' | 'operationId' | 'timestamp' | 'retryCount' | 'status'> & { operationId?: string }): Promise<SyncOperation> {
    const queue = await this.getQueue();
    const operationId = operation.operationId || this.generateUUID();

    // Deduplicate if identical operation is already queued within 10 seconds
    const existing = queue.find(
      (q) =>
        q.action === operation.action &&
        String(q.dispatchId) === String(operation.dispatchId) &&
        q.status === 'pending' &&
        Date.now() - q.timestamp < 10000
    );

    if (existing) {
      console.log(`[OfflineSyncService] Duplicate operation skipped: ${operation.action} for dispatch #${operation.dispatchId}`);
      return existing;
    }

    const newOp: SyncOperation = {
      ...operation,
      id: this.generateUUID(),
      operationId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    queue.push(newOp);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineSyncService] Enqueued operation [${newOp.action}] for dispatch #${newOp.dispatchId || 'N/A'}`);

    this.emit('idle', { pendingCount: queue.length });
    return newOp;
  }

  /**
   * Attempt to synchronize all pending operations
   */
  public async syncPending(): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    if (this.isSyncing) {
      console.log('[OfflineSyncService] Sync already in progress, skipping duplicate call.');
      return { success: false, syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.emit('syncing');

    let syncedCount = 0;
    let errors = 0;

    try {
      const queue = await this.getQueue();
      const pendingItems = queue.filter((item) => item.status === 'pending' || item.status === 'failed');

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.emit('idle', { pendingCount: 0 });
        return { success: true, syncedCount: 0, errors: 0 };
      }

      console.log(`[OfflineSyncService] Starting sync for ${pendingItems.length} operations...`);
      const client = await this.getClient();

      // Retrieve existing temporary ID mappings
      let idMappings: Record<string, number | string> = {};
      try {
        const rawMap = await AsyncStorage.getItem(ID_MAPPINGS_KEY);
        if (rawMap) idMappings = JSON.parse(rawMap);
      } catch (e) {}

      // Try batch endpoint first if we have multiple operations
      let batchSuccess = false;
      if (pendingItems.length > 1) {
        try {
          const batchPayload = {
            operations: pendingItems.map((item) => ({
              id: item.id,
              operation_id: item.operationId,
              action: item.action,
              dispatch_id: item.dispatchId,
              payload: item.payload,
              timestamp: item.timestamp,
            })),
          };

          const batchRes = await client.post('/responder/sync/batch', batchPayload, {
            headers: { 'X-Offline-Batch': 'true' },
            timeout: 20000,
          });

          if (batchRes?.data?.success) {
            batchSuccess = true;
            syncedCount = pendingItems.length;

            if (batchRes.data.id_mappings) {
              idMappings = { ...idMappings, ...batchRes.data.id_mappings };
              await AsyncStorage.setItem(ID_MAPPINGS_KEY, JSON.stringify(idMappings));
            }

            // Clear successfully synced items from queue
            const remainingQueue = queue.filter((q) => !pendingItems.some((p) => p.id === q.id));
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
            console.log(`[OfflineSyncService] Successfully synced batch of ${syncedCount} operations!`);
          }
        } catch (batchErr: any) {
          console.warn('[OfflineSyncService] Batch sync failed or unsupported, falling back to sequential replay:', batchErr?.message);
        }
      }

      // If batch was not executed, process sequentially in strict FIFO order
      if (!batchSuccess) {
        const remainingQueue: SyncOperation[] = [];

        for (let i = 0; i < pendingItems.length; i++) {
          const item = pendingItems[i];
          this.emit('syncing', { current: i + 1, total: pendingItems.length, action: item.action });

          try {
            await this.processSingleOperation(item, client, idMappings);
            syncedCount++;
            console.log(`[OfflineSyncService] Synced operation ${i + 1}/${pendingItems.length} (${item.action})`);
          } catch (opErr: any) {
            const isNetwork = !opErr.response || opErr.code === 'ERR_NETWORK' || opErr.message === 'Network Error';
            const status = opErr.response?.status;

            console.warn(`[OfflineSyncService] Failed to sync operation [${item.action}]:`, opErr?.message);

            if (isNetwork) {
              // Network dropped mid-sync: keep this item and all remaining items in queue
              item.status = 'failed';
              item.retryCount = (item.retryCount || 0) + 1;
              item.lastError = 'Network disconnected during sync';
              remainingQueue.push(item);
              // Push all subsequent unprocessed items back into remaining queue
              for (let j = i + 1; j < pendingItems.length; j++) {
                remainingQueue.push(pendingItems[j]);
              }
              errors++;
              break;
            } else if (status === 409) {
              // 409 Conflict: Server authoritative state is already newer. Gracefully accept server state.
              console.log(`[OfflineSyncService] Conflict resolution for [${item.action}]: server status is authoritative.`);
              syncedCount++;
            } else if (status >= 400 && status < 500) {
              // 4xx Permanent client validation error: discard item to prevent dead-letter loops
              console.warn(`[OfflineSyncService] Discarding permanent validation error (${status}) for operation:`, item.action);
              errors++;
            } else {
              // 5xx Server error: retain for next retry
              item.status = 'failed';
              item.retryCount = (item.retryCount || 0) + 1;
              item.lastError = opErr?.message || 'Server error';
              remainingQueue.push(item);
              errors++;
            }
          }
        }

        // Persist updated queue and ID mappings
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
        await AsyncStorage.setItem(ID_MAPPINGS_KEY, JSON.stringify(idMappings));
      }

      this.lastSyncTime = Date.now();
      await AsyncStorage.setItem('@mdrrmo_last_sync_timestamp', this.lastSyncTime.toString());

      const finalPending = await this.getPendingCount();
      if (errors > 0 && finalPending > 0) {
        this.emit('error', { syncedCount, errors, pendingCount: finalPending });
      } else {
        this.emit('completed', { syncedCount, pendingCount: 0 });
      }

      return { success: errors === 0, syncedCount, errors };
    } catch (e: any) {
      console.error('[OfflineSyncService] General sync error:', e);
      this.emit('error', { error: e.message });
      return { success: false, syncedCount, errors: errors + 1 };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single queued operation against the Laravel API
   */
  private async processSingleOperation(item: SyncOperation, client: any, idMappings: Record<string, any>): Promise<any> {
    const config = {
      headers: {
        'X-Offline-Replay': 'true',
        'X-Operation-ID': item.operationId,
      },
      timeout: 15000,
    };

    switch (item.action) {
      case 'ACCEPT_DISPATCH': {
        const payload = {
          operation_id: item.operationId,
          timestamp: item.timestamp,
        };
        return await client.post(`/responder/dispatches/${item.dispatchId}/accept`, payload, config);
      }

      case 'UPDATE_STATUS': {
        const payload = {
          ...item.payload,
          operation_id: item.operationId,
          timestamp: item.timestamp,
        };
        return await client.post(`/responder/dispatches/${item.dispatchId}/status`, payload, config);
      }

      case 'CREATE_PATIENT': {
        const tempId = item.payload?.temp_id;
        const res = await client.post('/responder/patients', item.payload, config);
        const realId = res?.data?.data?.id || res?.data?.patient_id || res?.data?.id;
        if (tempId && realId) {
          idMappings[tempId] = realId;
        }
        return res;
      }

      case 'UPDATE_PCR': {
        let pcrData = { ...item.payload };
        // Map temporary patient ID if applicable
        if (pcrData.patient_id && idMappings[pcrData.patient_id]) {
          pcrData.patient_id = idMappings[pcrData.patient_id];
        }
        pcrData.operation_id = item.operationId;
        return await client.post(`/responder/dispatches/${item.dispatchId}/pcr`, pcrData, config);
      }

      case 'SUBMIT_PCR': {
        const payload = {
          operation_id: item.operationId,
          timestamp: item.timestamp,
        };
        return await client.post(`/responder/dispatches/${item.dispatchId}/pcr/submit`, payload, config);
      }

      case 'UPLOAD_PHOTO': {
        const { uri, filename, type, latitude, longitude, locationName, capturedAt } = item.payload || {};
        const photoFormData = new FormData();
        photoFormData.append('photo', {
          uri,
          name: filename || 'scene_photo.jpg',
          type: type || 'image/jpeg',
        } as any);

        if (latitude) photoFormData.append('photo_latitude', latitude.toString());
        if (longitude) photoFormData.append('photo_longitude', longitude.toString());
        if (locationName) photoFormData.append('photo_location_name', locationName);
        if (capturedAt) photoFormData.append('photo_captured_at', capturedAt);
        photoFormData.append('operation_id', item.operationId);

        return await client.post(`/responder/dispatches/${item.dispatchId}/pcr/photo`, photoFormData, {
          ...config,
          headers: {
            ...config.headers,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      case 'UNFOUNDED': {
        return await client.post(`/responder/dispatches/${item.dispatchId}/unfounded`, item.payload, config);
      }

      case 'HTTP': {
        const m = (item.method || 'post').toLowerCase();
        if (m === 'put') return await client.put(item.url, item.payload, config);
        if (m === 'patch') return await client.patch(item.url, item.payload, config);
        return await client.post(item.url, item.payload, config);
      }

      default:
        console.warn(`[OfflineSyncService] Unknown action type: ${item.action}`);
        return null;
    }
  }

  /**
   * Clear all pending operations (e.g. for testing or reset)
   */
  public async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
    this.emit('idle', { pendingCount: 0 });
  }
}

export const offlineSyncService = new OfflineSyncService();
