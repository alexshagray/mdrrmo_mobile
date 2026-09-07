import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isWeakConnection, setIsWeakConnection] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(!!online);
      setIsOffline(!online);
      
      // Determine weak connection (e.g. 2g or low signal)
      if (
        state.type === 'cellular' && 
        state.details && 
        (state.details.cellularGeneration === '2g' || state.details.cellularGeneration === '3g')
      ) {
        setIsWeakConnection(true);
      } else {
        setIsWeakConnection(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isOffline, isWeakConnection };
}
