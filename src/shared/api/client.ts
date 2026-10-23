import axios from 'axios';
import { getToken, clearSession } from '../auth/secureStorage';
import { disconnectWebSocket } from '../websocket/echo';
import { offlineSync } from '../services/offlineSync';
import ENV from '../config/env';

export const API_URL = ENV.API_URL; 

// Event Target to emit 401 events for AuthContext
export const authEventEmitter = new EventTarget();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response ? error.response.status : null;
    
    if (status === 422) {
      const isLocationPing = error.config?.url?.includes('/location');
      if (!isLocationPing) {
        console.warn(
          '[API 422 Validation Error]',
          error.config?.method?.toUpperCase(),
          error.config?.url,
          '\nData:',
          JSON.stringify(error.response?.data, null, 2)
        );
      }
    }
    
    // Offline queue handling: Capture failed mutation requests (POST/PUT/PATCH) when network is down
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
    if (isNetworkError) {
      error.isNetworkError = true;
    }
    const method = error.config?.method?.toLowerCase();
    const isMutation = ['post', 'put', 'patch'].includes(method || '');
    const url = error.config?.url || '';
    const isAuth = url.includes('/auth/');
    const isLocationPing = url.includes('/location');
    const isOfflineReplay = error.config?.headers?.['X-Offline-Replay'];

    if (isNetworkError && isMutation && !isAuth && !isLocationPing && !isOfflineReplay) {
      try {
        await offlineSync.enqueueRequest(error.config.method, error.config.url, error.config.data);
      } catch (err) {
        console.warn('[OfflineSync] Failed to enqueue request:', err);
      }
    }

    if (status === 401) {
      // Unauthorized: token expired or invalid
      await clearSession();
      disconnectWebSocket();
      
      // Dispatch event for AuthContext to catch and trigger redirect + toast
      authEventEmitter.dispatchEvent(new Event('session_expired'));
    }
    
    return Promise.reject(error);
  }
);

offlineSync.setClient(apiClient);

export default apiClient;
