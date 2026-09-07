import axios from 'axios';
import { getToken, clearSession } from '../auth/secureStorage';
import { disconnectWebSocket } from '../websocket/echo';
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

export default apiClient;
