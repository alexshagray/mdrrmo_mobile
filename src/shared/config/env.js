// In a real application, these should be loaded from a .env file or Expo Constants.
// Using fallbacks/placeholders for development flexibility.

// Sanitize helper to extract clean hostname/IP without protocol, path, port, or whitespace
const sanitizeHost = (host) => {
  if (!host) return '192.168.1.10';
  return String(host)
    .trim()
    .replace(/^https?:\/\/\s*/i, '')
    .replace(/^wss?:\/\/\s*/i, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
};

const sanitizeUrl = (url) => {
  if (!url) return 'http://192.168.1.10:8000/api';
  return String(url)
    .trim()
    .replace(/^(https?:\/\/)\s+/i, '$1')
    .replace(/\/+$/, '');
};

export const ENV = {
  // API Configuration
  // If using an Android Emulator and encountering Network Errors, try changing the IP below to 10.0.2.2
  API_URL: sanitizeUrl(process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.10:8000/api'),

  // Reverb/Pusher Configuration
  REVERB_APP_KEY: String(process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'reverbkey123').trim(),
  REVERB_HOST: sanitizeHost(process.env.EXPO_PUBLIC_REVERB_HOST || '192.168.1.10'),
  REVERB_PORT: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080),
  REVERB_SCHEME: String(process.env.EXPO_PUBLIC_REVERB_SCHEME || 'http').trim(),

  // Mapbox Configuration
  MAPBOX_ACCESS_TOKEN: String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiaGFlbGVlaGVhdGhlciIsImEiOiJjbXA1N2QzbnEwaTFyMnJxejl3djg0a2EyIn0.7Iq9WgZBjNShbkMvsr3NJA').trim(),

  // App Config
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

export default ENV;
