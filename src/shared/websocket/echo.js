import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '../auth/secureStorage';
import { ENV } from '../config/env';

// Attach Pusher globally for Echo safely in React Native / Web environments
if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}
if (typeof global !== 'undefined') {
  (global as any).Pusher = Pusher;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Pusher = Pusher;
}

let echoInstance = null;

export const initializeEcho = async () => {
  if (echoInstance) return echoInstance;

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
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return echoInstance;
};

export const getEcho = () => echoInstance;

export const destroyEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
