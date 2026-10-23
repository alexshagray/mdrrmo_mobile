import { offlineSyncService } from './offlineSyncService';

class OfflineSyncProxy {
  setClient(client) {
    offlineSyncService.setClient(client);
  }

  async getQueue() {
    return await offlineSyncService.getQueue();
  }

  async getPendingCount() {
    return await offlineSyncService.getPendingCount();
  }

  async enqueueRequest(method, url, data) {
    return await offlineSyncService.enqueue({
      action: 'HTTP',
      method,
      url,
      payload: data,
    });
  }

  async syncPendingRequests() {
    return await offlineSyncService.syncPending();
  }
}

export const offlineSync = new OfflineSyncProxy();
export { offlineSyncService };
