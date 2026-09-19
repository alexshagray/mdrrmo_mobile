import React, { createContext, useState, useEffect, useContext } from 'react';
import { getToken, saveSession, getSession, clearSession } from './secureStorage';
import { loginApi, logoutApi, registerApi, getUserApi } from '../api/auth';
import { authEventEmitter } from '../api/client';

interface AuthContextType {
  user: any;
  role: string | null;
  isLoading: boolean; // Initial check
  isLoggingIn: boolean;
  isLoggingOut: boolean;
  isAuthenticated: boolean;
  sessionStatus: 'active' | 'expired' | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  logout: () => Promise<void>;
  isOnDuty: boolean;
  toggleDutyStatus: (status: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoading: true,
  isLoggingIn: false,
  isLoggingOut: false,
  isAuthenticated: false,
  sessionStatus: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  isOnDuty: true,
  toggleDutyStatus: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'active' | 'expired' | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);

  useEffect(() => {
    checkAuth();

    // Listen for global 401 Unauthorized events from the API client
    const handleSessionExpired = () => {
      setUser(null);
      setRole(null);
      setSessionStatus('expired');
    };

    authEventEmitter.addEventListener('session_expired', handleSessionExpired);

    return () => {
      authEventEmitter.removeEventListener('session_expired', handleSessionExpired);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        // Token exists. Restore session data
        const session = await getSession();
        if (session && session.user) {
          setUser(session.user);
          setRole(session.role);
          setSessionStatus('active');
        } else {
          // Fallback: If token exists but cached session in AsyncStorage is missing,
          // fetch current user from backend /auth/user
          try {
            const userData = await getUserApi();
            const resolvedUser = userData?.user || userData;
            if (resolvedUser && (resolvedUser.id || resolvedUser.role)) {
              const userRole = resolvedUser.role || 'responder';
              setUser(resolvedUser);
              setRole(userRole);
              setSessionStatus('active');
              await saveSession({ user: resolvedUser, role: userRole }, true);
            } else {
              await clearSession();
            }
          } catch (fetchErr) {
            console.log('Could not fetch user profile with existing token:', fetchErr);
            await clearSession();
          }
        }
      }
    } catch (error) {
      console.error('Check Auth Error:', error);
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setIsLoggingIn(true);
    setSessionStatus(null);
    try {
      const data = await loginApi(email, password);
      
      const sessionData = {
        user: data.user,
        role: data.user.role,
      };

      // saveSession handles the rememberMe logic internally.
      // If false, it only saves to memory.
      await saveSession(sessionData, rememberMe);
      
      // We must also save the token explicitly using saveToken in secureStorage.
      // Wait, secureStorage.ts exposes saveToken but I didn't call it here!
      // Let's import it and call it.
      const { saveToken } = require('./secureStorage');
      await saveToken(data.token, rememberMe);

      setUser(data.user);
      setRole(data.user.role);
      setSessionStatus('active');
      return { success: true };
    } catch (error: any) {
      // Only log unexpected network errors or 500s, not normal validation (422) or unauthorized (401) errors
      if (error.response?.status !== 401 && error.response?.status !== 422) {
         console.error('Login Error:', error);
      }
      
      // Graceful error mapping
      let errorMessage = 'Login failed. Please try again.';
      let fieldErrors: Record<string, string[]> | undefined;
      
      if (error.response?.status === 422) {
          const errors = error.response.data?.errors;
          if (errors && typeof errors === 'object') {
             fieldErrors = errors;
             const firstKey = Object.keys(errors)[0];
             errorMessage = (firstKey && errors[firstKey]?.[0]) || 'Validation failed.';
          } else {
             errorMessage = 'Invalid email or password.';
          }
      } else if (error.response?.status === 401) {
         errorMessage = 'Invalid email or password.';
      } else if (error.message === 'Network Error' || !error.response) {
         errorMessage = 'Network error. Please check your connection.';
      }

      return { success: false, error: errorMessage, fieldErrors };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoggingIn(true);
    setSessionStatus(null);
    try {
      const data = await registerApi(userData);
      
      const sessionData = {
        user: data.user,
        role: data.user.role,
      };

      await saveSession(sessionData, true);
      
      const { saveToken } = require('./secureStorage');
      await saveToken(data.token, true);

      setUser(data.user);
      setRole(data.user.role);
      setSessionStatus('active');
      return { success: true };
    } catch (error: any) {
      if (error.response?.status !== 422) {
         console.error('Register Error:', error);
      }
      
      let errorMessage = 'Registration failed. Please try again.';
      if (error.response?.status === 422) {
         errorMessage = Object.values(error.response.data.errors || {}).flat().join('\n') || 'Validation failed.';
      } else if (error.message === 'Network Error' || !error.response) {
         errorMessage = 'Network error. Please check your connection.';
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutApi();
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.warn('Logout Warning:', error.message);
      }
    } finally {
      await clearSession();
      setUser(null);
      setRole(null);
      setSessionStatus(null);
      setIsLoggingOut(false);
    }
  };

  const toggleDutyStatus = async (status: boolean) => {
    setIsOnDuty(status);
    try {
      const { updateDutyStatus } = require('../api/crew');
      await updateDutyStatus(status ? 'available' : 'offline');
    } catch (e) {
      console.log('Error updating global duty status:', e);
      // Optional: revert state on failure
      // setIsOnDuty(!status);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await getUserApi();
      const resolvedUser = userData?.user || userData;
      if (resolvedUser && resolvedUser.id) {
        setUser(resolvedUser);
        if (resolvedUser.role) setRole(resolvedUser.role);
        await saveSession({ user: resolvedUser, role: resolvedUser.role || role }, true);
      }
    } catch (e) {
      console.error('refreshUser error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isLoading,
      isLoggingIn,
      isLoggingOut,
      isAuthenticated: !!user,
      sessionStatus,
      login,
      register,
      logout,
      isOnDuty,
      toggleDutyStatus,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
