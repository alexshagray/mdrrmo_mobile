// In a real application, these should be loaded from a .env file or Expo Constants.
// Using fallbacks/placeholders for development flexibility.

// Sanitize helper to extract clean hostname/IP without protocol, path, port, or whitespace
const sanitizeHost = (host) => {
  if (!host) return 'opol-mdrrmo.tech';
  return String(host)
    .trim()
    .replace(/^https?:\/\/\s*/i, '')
    .replace(/^wss?:\/\/\s*/i, '')
    .split('/')[0]
    .split(':')[0]
    .trim();
};

const sanitizeUrl = (url) => {
  if (!url) return 'https://opol-mdrrmo.tech/api';
  return String(url)
    .trim()
    .replace(/^(https?:\/\/)\s+/i, '$1')
    .replace(/\/+$/, '');
};

export const ENV = {
  // API Configuration
  API_URL: sanitizeUrl(process.env.EXPO_PUBLIC_API_URL || 'https://opol-mdrrmo.tech/api'),

  // Reverb/Pusher Configuration
  REVERB_APP_KEY: String(process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'reverbkey123').trim(),
  REVERB_HOST: sanitizeHost(process.env.EXPO_PUBLIC_REVERB_HOST || 'opol-mdrrmo.tech'),
  REVERB_PORT: Number(process.env.EXPO_PUBLIC_REVERB_PORT || 443),
  REVERB_SCHEME: String(process.env.EXPO_PUBLIC_REVERB_SCHEME || 'https').trim(),

  // Mapbox Configuration
  MAPBOX_ACCESS_TOKEN: String(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiaGFlbGVlaGVhdGhlciIsImEiOiJjbXA1N2QzbnEwaTFyMnJxejl3djg0a2EyIn0.7Iq9WgZBjNShbkMvsr3NJA').trim(),

  // App Config
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

export default ENV;
