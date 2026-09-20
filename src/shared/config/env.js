// In a real application, these should be loaded from a .env file or Expo Constants.
// Using fallbacks/placeholders for development flexibility.

export const ENV = {
  // API Configuration
  // If using an Android Emulator and encountering Network Errors, try changing the IP below to 10.0.2.2
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.103:8000/api',

  
  // Reverb/Pusher Configuration
  REVERB_APP_KEY: process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'reverbkey123',
  REVERB_HOST: process.env.EXPO_PUBLIC_REVERB_HOST || '192.168.254.103',
  REVERB_PORT: process.env.EXPO_PUBLIC_REVERB_PORT || 8080,
  REVERB_SCHEME: process.env.EXPO_PUBLIC_REVERB_SCHEME || 'http',
  // Mapbox Configuration
  MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiaGFlbGVlaGVhdGhlciIsImEiOiJjbXA1N2QzbnEwaTFyMnJxejl3djg0a2EyIn0.7Iq9WgZBjNShbkMvsr3NJA',
  
  // App Config
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

export default ENV;
