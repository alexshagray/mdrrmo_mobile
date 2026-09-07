import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '../auth/secureStorage';
import ENV from '../config/env';

// Make Pusher available globally for Laravel Echo
if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}

let echoInstance: Echo | null = null;

export const connectWebSocket = async () => {
  if (echoInstance) {
    return echoInstance;
  }

  const token = await getToken();

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: ENV.REVERB_APP_KEY,
    wsHost: ENV.REVERB_HOST,
    wsPort: ENV.REVERB_PORT ?? 8080,
    wssPort: ENV.REVERB_PORT ?? 8080,
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
