import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

const QUEUE_KEY = 'mdrrmo_offline_queue';

class OfflineSync {
  constructor() {
    this.isSyncing = false;
  }

  /**
   * Push a failed POST/PUT request to the offline queue
   */
  async enqueueRequest(method, url, data) {
    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = queueStr ? JSON.parse(queueStr) : [];
      
      queue.push({ method, url, data, timestamp: Date.now() });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      
      console.log('Request queued offline:', url);
    } catch (e) {
      console.error('Failed to enqueue request:', e);
    }
  }

  /**
   * Attempt to replay all queued requests when back online
   */
  async syncPendingRequests() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
      let queue = queueStr ? JSON.parse(queueStr) : [];

      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`Syncing ${queue.length} pending offline requests...`);

      const failedQueue = [];

      for (const req of queue) {
        try {
          if (req.method.toLowerCase() === 'post') {
            await apiClient.post(req.url, req.data);
          } else if (req.method.toLowerCase() === 'put') {
            await apiClient.put(req.url, req.data);
          }
          console.log(`Synced request: ${req.url}`);
        } catch (e) {
          // If it fails again due to network, keep it in the queue
          if (e.message === 'Network Error') {
            failedQueue.push(req);
          } else {
            // Validation errors etc are discarded to prevent infinite loops
            console.error(`Discarding failed sync: ${req.url}`, e);
          }
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedQueue));
    } catch (e) {
      console.error('Error during offline sync:', e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const offlineSync = new OfflineSync();
