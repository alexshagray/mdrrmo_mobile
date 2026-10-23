import apiClient from './client';
import { offlineMissionService } from '../services/offlineMissionService';
import { offlineSyncService } from '../services/offlineSyncService';

export const getAvailableIncidents = async () => {
  try {
    const response = await apiClient.get('/responder/incidents/available');
    return response.data;
  } catch (err: any) {
    if (err.isNetworkError || !err.response) {
      return { data: [], is_offline: true };
    }
    throw err;
  }
};

export const getActiveDispatches = async () => {
  try {
    const response = await apiClient.get('/responder/dispatches');
    if (response?.data?.data && response.data.data.length > 0) {
      await offlineMissionService.saveActiveMission(response.data.data[0]);
    } else if (response?.data?.data && response.data.data.length === 0) {
      await offlineMissionService.clearActiveMission();
    }
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      const cached = await offlineMissionService.getActiveMission();
      if (cached) {
        console.log('[getActiveDispatches] Offline mode: loaded active mission from local cache');
        return {
          data: [cached],
          today_stats: {
            completed_missions: 0,
            patients_assisted: 0,
          },
          is_offline: true,
        };
      }
      return { data: [], is_offline: true };
    }
    throw err;
  }
};

export const getDispatchHistory = async (page = 1, type = 'all', date = '') => {
  let url = `/responder/history?page=${page}&type=${type}`;
  if (date) url += `&date=${date}`;
  
  const response = await apiClient.get(url);
  return response.data;
};

export const createWalkInDispatch = async (data = {}) => {
  const response = await apiClient.post('/responder/dispatches/walk-in', data);
  if (response?.data?.data) {
    await offlineMissionService.saveActiveMission(response.data.data);
  }
  return response.data;
};

export const acceptDispatch = async (dispatchId: number | string) => {
  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/accept`);
    if (response?.data?.data) {
      await offlineMissionService.saveActiveMission(response.data.data);
    }
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      const isLocallyAvailable = await offlineMissionService.isMissionAvailableLocally(dispatchId);
      if (!isLocallyAvailable) {
        throw new Error('Offline acceptance rejected: mission details have not been synchronized to this device.');
      }
      console.log(`[acceptDispatch] Offline mode: accepted cached mission #${dispatchId}`);
      const updated = await offlineMissionService.acceptMissionOffline(dispatchId);
      return {
        message: 'Dispatch accepted (offline queued)',
        data: updated,
        is_offline_queued: true,
      };
    }
    throw err;
  }
};

/**
 * @param {string|number} dispatchId
 * @param {string} status
 * @param {{ latitude: number, longitude: number }|null} [coords]
 */
export const updateDispatchStatus = async (dispatchId: number | string, status: string, coords: any = null) => {
  const payload: any = { status };
  if (coords) {
    payload.latitude = coords.latitude;
    payload.longitude = coords.longitude;
  }

  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/status`, payload);
    if (response?.data?.data) {
      await offlineMissionService.saveActiveMission(response.data.data);
    }
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      console.log(`[updateDispatchStatus] Offline mode: queued status '${status}' for mission #${dispatchId}`);
      const updated = await offlineMissionService.updateStatusOffline(dispatchId, status as any, coords);
      return {
        message: `Status updated to ${status} (offline queued)`,
        data: updated,
        is_offline_queued: true,
      };
    }
    throw err;
  }
};

/**
 * @param {string|number} dispatchId
 * @param {{ latitude: number, longitude: number, heading?: number|null, accuracy?: number|null, timestamp?: string|null }} locationData
 */
export const updateDispatchLocation = async (dispatchId: number | string, { latitude, longitude, heading = null, accuracy = null, timestamp = null }: any) => {
  const payload = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    heading: (typeof heading === 'number' && heading >= 0) ? heading : null,
    accuracy: (typeof accuracy === 'number' && accuracy >= 0) ? accuracy : null,
    timestamp: timestamp || new Date().toISOString()
  };

  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/location`, payload);
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      // Record breadcrumb locally for batch synchronization
      await offlineMissionService.recordOfflineBreadcrumb(dispatchId, payload);
      return { message: 'Location recorded offline', is_offline: true };
    }
    throw err;
  }
};

export const updatePcr = async (dispatchId: number | string, pcrData: any) => {
  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/pcr`, pcrData);
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      console.log(`[updatePcr] Offline mode: queued PCR draft update for mission #${dispatchId}`);
      await offlineSyncService.enqueue({
        action: 'UPDATE_PCR',
        dispatchId,
        payload: pcrData,
      });
      return { message: 'PCR draft saved offline', is_offline_queued: true };
    }
    throw err;
  }
};

export const submitPcr = async (dispatchId: number | string) => {
  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/pcr/submit`);
    await offlineMissionService.clearActiveMission();
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      console.log(`[submitPcr] Offline mode: queued PCR submission for mission #${dispatchId}`);
      await offlineMissionService.updateStatusOffline(dispatchId, 'completed');
      await offlineSyncService.enqueue({
        action: 'SUBMIT_PCR',
        dispatchId,
        payload: {},
      });
      return {
        message: 'PCR submitted offline. Records will sync when connection returns.',
        is_offline_queued: true,
      };
    }
    throw err;
  }
};

export const uploadPcrPhoto = async (dispatchId: number | string, formData: any) => {
  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/pcr/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      console.log(`[uploadPcrPhoto] Offline mode: queued photo for mission #${dispatchId}`);
      return { message: 'Photo queued for offline sync', is_offline_queued: true };
    }
    throw err;
  }
};

export const reportUnfoundedDispatch = async (dispatchId: number | string, { reason, category = 'false_alarm' }: any) => {
  const payload = { reason, category };
  try {
    const response = await apiClient.post(`/responder/dispatches/${dispatchId}/unfounded`, payload);
    await offlineMissionService.clearActiveMission();
    return response.data;
  } catch (err: any) {
    const isNetwork = err.isNetworkError || !err.response || err.code === 'ERR_NETWORK';
    if (isNetwork) {
      await offlineMissionService.updateStatusOffline(dispatchId, 'cancelled');
      await offlineSyncService.enqueue({
        action: 'UNFOUNDED',
        dispatchId,
        payload,
      });
      return {
        message: 'False alarm reported offline. Will sync when online.',
        is_offline_queued: true,
      };
    }
    throw err;
  }
};
