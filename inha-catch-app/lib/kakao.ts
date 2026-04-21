/**
 * 카카오 SDK 초기화 + 로그인 헬퍼.
 * Expo Managed(Expo Go)에서는 네이티브 모듈 없어서 동작 안 함 → no-op.
 * prebuild 후 EAS build / 로컬 네이티브 빌드에서만 실제 동작.
 */

let isInitialized = false;

export function initKakao(): void {
  if (isInitialized) return;
  try {
    // 동적 require로 감싸 Expo Go에서 import 단계 크래시를 방지
    const { initializeKakaoSDK } = require('@react-native-kakao/core');
    const nativeKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY;
    if (!nativeKey) {
      console.warn('[Kakao] EXPO_PUBLIC_KAKAO_NATIVE_KEY 미설정 → 초기화 스킵');
      return;
    }
    initializeKakaoSDK(nativeKey);
    isInitialized = true;
  } catch (e: any) {
    console.warn('[Kakao] 초기화 실패 (Expo Go에서는 정상):', e?.message);
  }
}

/**
 * 네이티브 카카오 로그인 실행. 성공 시 access_token 반환.
 * 사용자가 취소하거나 에러 시 null.
 */
export async function kakaoLoginNative(): Promise<string | null> {
  try {
    const { login } = require('@react-native-kakao/user');
    const result = await login();
    return result?.accessToken ?? null;
  } catch (e: any) {
    console.warn('[Kakao] 로그인 실패:', e?.message);
    return null;
  }
}

export async function kakaoLogoutNative(): Promise<void> {
  try {
    const { logout } = require('@react-native-kakao/user');
    await logout();
  } catch {
    // 조용히 무시 (이미 로그아웃 상태일 수 있음)
  }
}
