import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, router as globalRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DevSettings } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { setOnAuthFailure } from '@/api/axios';
import { clearAuthTokens, migrateLegacyAuthTokens } from '@/lib/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('../assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { BookmarkProvider } from '@/context/BookmarkContext';
import { UserProvider, useUser } from '@/context/UserContext';
import { useNotificationSetup } from '@/hooks/useNotifications';

function AuthFailureHandler() {
  useEffect(() => {
    // 첫 마운트 시 기존 AsyncStorage 토큰을 SecureStore 로 1회 이관
    migrateLegacyAuthTokens().catch(() => {});

    setOnAuthFailure(async () => {
      await clearAuthTokens();
      await AsyncStorage.multiRemove([
        '@user_profile', '@bookmarks', '@cache_scholarships'
      ]);
      // 401 시 앱 전체 리로드 → 토큰 비었으니 / 환영 화면으로 시작
      DevSettings.reload();
    });
  }, []);

  return null;
}

function NotificationInitializer() {
  const { profile } = useUser();
  useNotificationSetup(profile.isLoggedIn);
  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <UserProvider>
      <BookmarkProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthFailureHandler />
          <NotificationInitializer />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="details/[id]" />
            <Stack.Screen name="agree-terms" />
            <Stack.Screen name="legal/terms" />
            <Stack.Screen name="legal/privacy" />
          </Stack>
        </ThemeProvider>
      </BookmarkProvider>
    </UserProvider>
  );
}
