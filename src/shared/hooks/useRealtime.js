import { useState, useEffect, useCallback } from 'react';
import { connectionManager, getEcho } from '../websocket';
import { useAuth } from '../auth/authContext';

export function useRealtime() {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [echo, setEcho] = useState(null);

  const connect = useCallback(async () => {
    const instance = await connectionManager.connect();
    setEcho(instance);
    
    if (instance) {
      // Pusher specific connection states
      instance.connector.pusher.connection.bind('connected', () => setIsConnected(true));
      instance.connector.pusher.connection.bind('disconnected', () => setIsConnected(false));
      instance.connector.pusher.connection.bind('error', () => setIsConnected(false));
      
      // Check immediate state
      setIsConnected(instance.connector.pusher.connection.state === 'connected');
    }
  }, []);

  const disconnect = useCallback(() => {
    connectionManager.disconnect();
    setIsConnected(false);
    setEcho(null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      // We don't disconnect on unmount of a single component since realtime is global,
      // but we might want to cleanup specific listeners here if needed.
    };
  }, [isAuthenticated, connect, disconnect]);

  return { isConnected, echo, reconnect: connectionManager.reconnect, disconnect };
}
