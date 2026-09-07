import React from 'react';
import { View, Text } from 'react-native';
import { useNetworkStatus } from '../../hooks';
import { useRealtime } from '../../hooks/useRealtime';
import { WifiOff, ServerOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlobalStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const { isConnected } = useRealtime();
  const insets = useSafeAreaInsets();

  if (!isOnline) {
    return (
      <View style={{ paddingTop: Math.max(insets.top, 10) }} className="bg-slate-900 px-4 py-2 flex-row items-center justify-center z-50 absolute top-0 w-full">
        <WifiOff size={16} color="#F87171" />
        <Text className="text-white ml-2 text-sm font-medium">No Internet Connection</Text>
      </View>
    );
  }

  // If online but websocket is disconnected (assuming we expect it to be connected)
  // In a real app we might only show this if authenticated and supposed to be connected
  // if (!isConnected) {
  //   return (
  //     <View style={{ paddingTop: Math.max(insets.top, 10) }} className="bg-amber-500 px-4 py-2 flex-row items-center justify-center z-50 absolute top-0 w-full">
  //       <ServerOff size={16} color="#FFFFFF" />
  //       <Text className="text-white ml-2 text-sm font-medium">Reconnecting to Server...</Text>
  //     </View>
  //   );
  // }

  return null;
}
