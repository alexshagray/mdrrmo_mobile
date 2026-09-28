import { Redirect } from 'expo-router';
import { useAuth } from '@/shared/hooks';
import { View } from 'react-native';
import { Loading } from '@/shared/components';

export default function Index() {
  const { isAuthenticated, role, user, isLoading } = useAuth();

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

  if (user?.password_change_required || user?.password_change_required === 1) {
    return <Redirect href={'/force-change-password' as any} />;
  }

  if (role === 'resident') {
    return <Redirect href="/(resident)" />;
  }

  return <Redirect href="/(responder)" />;
}
