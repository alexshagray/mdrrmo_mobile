import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'mdrrmo_auth_token';
const SESSION_KEY = 'mdrrmo_auth_session';

// In-memory fallback for "Remember Me" = false
let inMemoryToken: string | null = null;
let inMemorySession: any = null;

export interface SessionData {
  user: any;
  role: string;
}

/**
 * Save authentication token securely.
 * If rememberMe is false, token is only saved in memory.
 */
export async function saveToken(token: string, rememberMe: boolean = true): Promise<boolean> {
  inMemoryToken = token;
  
  if (!rememberMe) {
    return true; // Only keep in memory
  }
  
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
    return true;
  } catch (error) {
    console.error('Error saving token:', error);
    return false;
  }
}

/**
 * Retrieve the saved authentication token
 */
export async function getToken(): Promise<string | null> {
  if (inMemoryToken) return inMemoryToken;
  
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
}

/**
 * Remove the authentication token (Logout)
 */
export async function removeToken(): Promise<boolean> {
  inMemoryToken = null;
  
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
}

/**
 * Save session information securely
 */
export async function saveSession(sessionData: SessionData, rememberMe: boolean = true): Promise<boolean> {
  inMemorySession = sessionData;
  
  if (!rememberMe) {
    return true;
  }
  
  try {
    const jsonValue = JSON.stringify(sessionData);
    // Always use AsyncStorage for session data because SecureStore has a 2048 byte limit that user objects often exceed
    await AsyncStorage.setItem(SESSION_KEY, jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
}

/**
 * Retrieve the saved session information
 */
export async function getSession(): Promise<SessionData | null> {
  if (inMemorySession) return inMemorySession;
  
  try {
    // Retrieve session from AsyncStorage on all platforms
    const jsonValue = await AsyncStorage.getItem(SESSION_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Clear all authentication and session data
 */
export async function clearSession(): Promise<boolean> {
  inMemoryToken = null;
  inMemorySession = null;
  
  try {
    // Clear session from AsyncStorage
    await AsyncStorage.removeItem(SESSION_KEY);
    // Clear token from appropriate storage
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error clearing session:', error);
    return false;
  }
}
