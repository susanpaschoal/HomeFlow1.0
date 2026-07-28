import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthProvider';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function Index() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface }}>
        <ActivityIndicator color={theme.brandPrimary} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}
