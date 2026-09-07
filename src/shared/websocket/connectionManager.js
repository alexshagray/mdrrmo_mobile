import { initializeEcho, destroyEcho } from './echo';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let appState = AppState.currentState;
let isOnline = true;
let isInitialized = false;

const _handleAppStateChange = (nextAppState) => {
  if (appState && appState.match(/inactive|background/) && nextAppState === 'active') {
    reconnect().catch(err => console.log('Reconnect error:', err));
  }
  appState = nextAppState;
};

const setupListeners = () => {
  if (isInitialized) return;
  isInitialized = true;
  
  AppState.addEventListener('change', _handleAppStateChange);
  
  NetInfo.addEventListener(state => {
    const currentlyOnline = state.isConnected && state.isInternetReachable !== false;
    if (!isOnline && currentlyOnline) {
      reconnect().catch(err => console.log('Reconnect error:', err));
    }
    isOnline = currentlyOnline;
  });
};

const connect = async () => {
  if (!isOnline) return null;
  try {
    if (typeof initializeEcho === 'function') {
      return await initializeEcho();
    }
    return null;
  } catch (error) {
    console.warn('WebSocket Connection Failed:', error);
    return null;
  }
};

const disconnect = () => {
  if (typeof destroyEcho === 'function') {
    destroyEcho();
  }
};

const reconnect = async () => {
  console.log('Reconnecting WebSocket...');
  disconnect();
  return await connect();
};

// Initialize immediately
setupListeners();

export const connectionManager = {
  connect,
  disconnect,
  reconnect
};
