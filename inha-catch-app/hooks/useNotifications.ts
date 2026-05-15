import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '@/api/axios';
import type { EventSubscription } from 'expo-notifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (isExpoGo) return 'unsupported';
  if (!Device.isDevice) return 'unsupported';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isExpoGo) return 'unsupported';
  if (!Device.isDevice) return 'unsupported';
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export function openAppNotificationSettings(): Promise<void> {
  // Android는 시스템 설정 앱을, iOS도 동일하게 openSettings로 처리
  return Linking.openSettings();
}

/**
 * 알림 권한 상태를 추적하는 훅. 앱이 포그라운드로 복귀할 때마다 재확인.
 */
export function useNotificationPermission() {
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');

  const refresh = useCallback(async () => {
    setStatus(await getNotificationPermissionStatus());
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { status, refresh };
}

// Expo Go에서는 SDK 53부터 Android 원격 푸시 미지원 → 토큰 등록 자체를 스킵
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// 앱이 포그라운드에 있을 때 알림 표시 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldFlash: false,
  }),
});

export function useNotificationSetup(isLoggedIn: boolean) {
  const notificationListener = useRef<EventSubscription>(null);
  const responseListener = useRef<EventSubscription>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) return;

    // FCM 토큰 등록
    registerForPushNotifications().then(token => {
      if (token) {
        api.post('/api/user/fcm-token', { fcmToken: token })
          .then(() => console.log('FCM 토큰 등록 완료'))
          .catch(err => console.warn('FCM 토큰 등록 실패:', err.message));
      }
    });

    // 포그라운드 알림 수신 리스너
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('알림 수신:', notification.request.content.title);
    });

    // 알림 클릭 시 화면 이동 리스너
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.scholarshipId) {
        router.push(`/details/${data.scholarshipId}` as any);
      }
    });

    // 앱이 포그라운드로 복귀할 때 토큰 재등록
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        registerForPushNotifications().then(token => {
          if (token) {
            api.post('/api/user/fcm-token', { fcmToken: token }).catch(() => {});
          }
        });
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      appStateSubscription.remove();
    };
  }, [isLoggedIn]);
}

async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo) {
    console.log('[FCM] Expo Go에서는 원격 푸시 미지원 (SDK 53+). Dev Build에서만 동작.');
    return null;
  }
  if (!Device.isDevice) {
    console.log('[FCM] 푸시 알림은 실제 디바이스/에뮬레이터에서만 동작합니다.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[FCM] 푸시 알림 권한이 거부되었습니다.');
      return null;
    }

    // Android 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '기본 알림',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2962FF',
      });
    }

    // FCM 디바이스 푸시 토큰 가져오기
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data as string;
  } catch (error) {
    console.error('[FCM] 푸시 토큰 등록 실패:', error);
    return null;
  }
}
