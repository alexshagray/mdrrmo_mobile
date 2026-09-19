import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '../auth/secureStorage';
import ENV from '../config/env';

// Safely resolve the Pusher constructor across different bundle targets (CJS / ESM in React Native)
const PusherConstructor: any =
  (Pusher as any)?.Pusher ||
  (Pusher as any)?.default ||
  Pusher;

// Safely resolve the Echo constructor across ESM / CJS bundlers
const EchoConstructor: any =
  (Echo as any)?.default ||
  Echo;

// Make Pusher available globally for Laravel Echo
if (typeof window !== 'undefined') {
  (window as any).Pusher = PusherConstructor;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Pusher = PusherConstructor;
}

let echoInstance: any = null;

export const connectWebSocket = async () => {
  if (echoInstance && echoInstance.connector?.pusher?.connection) {
    return echoInstance;
  }
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (_) {}
    echoInstance = null;
  }

  const token = await getToken();

  echoInstance = new EchoConstructor({
    broadcaster: 'reverb',
    Pusher: PusherConstructor,
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

