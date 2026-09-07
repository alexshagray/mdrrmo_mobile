import { Redirect } from 'expo-router';
import { useAuth } from '@/shared/hooks';
import { View } from 'react-native';
import { Loading } from '@/shared/components';

export default function Index() {
  const { isAuthenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Loading message="Starting MDRRMO..." />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (role === 'resident') {
    return <Redirect href="/(resident)" />;
  }

  return <Redirect href="/(responder)" />;
}
