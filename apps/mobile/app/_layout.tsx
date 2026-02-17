import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';
import { setupNotifications } from '@/lib/notifications';

const COLORS = {
  primaryDark: '#0f0e17',
  accent: '#f00069',
  teal: '#1f8c9b',
  lightGray: '#e7efef',
  white: '#fffffe',
};

export default function RootLayout() {
  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={COLORS.primaryDark} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primaryDark },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: COLORS.lightGray },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[slug]"
          options={{ title: 'Product Details' }}
        />
        <Stack.Screen
          name="post/[slug]"
          options={{ title: 'Article' }}
        />
        <Stack.Screen
          name="bar/[slug]"
          options={{ title: 'Bar Details' }}
        />
        <Stack.Screen
          name="vendor/[slug]"
          options={{ title: 'Shop' }}
        />
      </Stack>
    </AuthProvider>
  );
}
