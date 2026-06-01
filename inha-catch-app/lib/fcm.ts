/**
 * FCM 초기화 + 토큰 관리.
 * Expo Go에서는 동작 안 함(네이티브 모듈). prebuild 후 기기에서만 동작.
 */

import api from '@/api/axios';

let isInitialized = false;

export function initFcm(): void {
  if (isInitialized) return;
  try {
    const messaging = require('@react-native-firebase/messaging').default;

    // iOS 권한 요청은 requestPermission(), Android 13+ 도 POST_NOTIFICATIONS 필요
    messaging()
      .requestPermission()
      .catch((e: any) => console.warn('[FCM] 권한 요청 실패:', e?.message));

    // 포그라운드 수신 → 알림은 자동으로 안 뜨므로 토스트 등 UI로 처리 권장
    messaging().onMessage(async (remoteMessage: any) => {
      console.log('[FCM] 포그라운드 메시지:', remoteMessage?.notification?.title);
    });

    // 백그라운드에서 알림 탭 → 상세 페이지 딥링크는 router로 처리 (필요 시 확장)
    messaging().onNotificationOpenedApp((remoteMessage: any) => {
      const scholarshipId = remoteMessage?.data?.scholarshipId;
      if (scholarshipId) {
        // expo-linking 딥링크로 처리하거나 여기서 router.push 가능 (context 필요)
        console.log('[FCM] 알림 탭 → 공고 id:', scholarshipId);
      }
    });

    isInitialized = true;
  } catch (e: any) {
    console.warn('[FCM] 초기화 실패 (Expo Go에서는 정상):', e?.message);
  }
}

/**
 * FCM 토큰 발급받아 백엔드에 등록. 로그인 직후 호출.
 */
export async function registerFcmToken(): Promise<void> {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    const token = await messaging().getToken();
    if (!token) return;
    await api.post('/api/user/fcm-token', { fcmToken: token });
    console.log('[FCM] 토큰 등록 완료');
  } catch (e: any) {
    console.warn('[FCM] 토큰 등록 실패:', e?.message);
  }
}
