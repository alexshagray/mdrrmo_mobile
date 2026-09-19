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
      const pusher = instance.connector?.pusher;
      if (pusher?.connection) {
        pusher.connection.bind('connected', () => setIsConnected(true));
        pusher.connection.bind('disconnected', () => setIsConnected(false));
        pusher.connection.bind('error', () => setIsConnected(false));
        
        // Check immediate state
        setIsConnected(pusher.connection.state === 'connected');
      } else if (typeof instance.connectionStatus === 'function') {
        setIsConnected(instance.connectionStatus() === 'connected');
      }
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
