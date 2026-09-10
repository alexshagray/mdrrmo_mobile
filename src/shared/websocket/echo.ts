import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '../auth/secureStorage';
import ENV from '../config/env';

// Make Pusher available globally for Laravel Echo
if (typeof window !== 'undefined') {
  (window as any).Pusher = Pusher;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Pusher = Pusher;
}

let echoInstance: any = null;

export const connectWebSocket = async () => {
  if (echoInstance) {
    return echoInstance;
  }

  const token = await getToken();

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: ENV.REVERB_APP_KEY,
    wsHost: ENV.REVERB_HOST,
    wsPort: Number(ENV.REVERB_PORT) || 8080,
    wssPort: Number(ENV.REVERB_PORT) || 8080,
    forceTLS: (ENV.REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${ENV.API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
};

export const getEcho = () => echoInstance;

export const disconnectWebSocket = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
    console.log('WebSocket disconnected cleanly.');
  }
};

// Compatibility aliases for connectionManager and legacy callers
export const initializeEcho = connectWebSocket;
export const destroyEcho = disconnectWebSocket;

