import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import api from '@/api/axios';
import type { EventSubscription } from 'expo-notifications';

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
  if (!Device.isDevice) {
    console.log('푸시 알림은 실제 디바이스에서만 동작합니다.');
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
      console.log('푸시 알림 권한이 거부되었습니다.');
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
    console.error('푸시 토큰 등록 실패:', error);
    return null;
  }
}
