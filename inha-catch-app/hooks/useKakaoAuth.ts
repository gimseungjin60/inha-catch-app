import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '@/api/axios';

// ── Redirect URI 환경별 분기 ────────────────────────────────────
// 카카오는 http(s) 스킴만 허용 (custom scheme 등록 불가).
// 카카오 콘솔에 아래 2개만 등록:
//   1) Web:                 http://localhost:8081
//   2) Expo Go + Dev Client: https://auth.expo.io/@gimseungjin60/InhaCatch
//
// SSR/static render 시점엔 window가 없으므로 반드시 호출 시점에 lazy 계산.
// ────────────────────────────────────────────────────────────────
const EXPO_PROXY_URI = 'https://auth.expo.io/@gimseungjin60/InhaCatch';

function resolveRedirectUri(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:8081';
  }
  // 모바일은 항상 Expo proxy 경유 (카카오는 https만 허용).
  // Production native 빌드에서는 별도 작업 필요 (카카오 SDK 또는 Universal Link).
  return EXPO_PROXY_URI;
}

const KAKAO_CLIENT_ID =
  (Constants.expoConfig?.extra?.kakaoRestApiKey as string | undefined) ??
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ??
  'YOUR_KAKAO_REST_API_KEY';

export async function loginWithKakao(): Promise<{
  token: string;
  refreshToken: string;
  user: any;
  isNewUser: boolean;
} | null> {
  const REDIRECT_URI = resolveRedirectUri();
  console.log(
    '[Kakao] resolved =',
    JSON.stringify(REDIRECT_URI),
    '| platform=',
    Platform.OS,
    '| ownership=',
    Constants.appOwnership ?? 'null',
  );

  if (!REDIRECT_URI) {
    console.error('[Kakao] REDIRECT_URI 가 비어있습니다.');
    return null;
  }

  try {
    const authUrl =
      `https://kauth.kakao.com/oauth/authorize?` +
      `client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== 'success' || !result.url) {
      return null;
    }

    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('카카오 인가코드를 받지 못했습니다.');
      return null;
    }

    const res = await api.post('/api/auth/kakao', {
      code,
      redirectUri: REDIRECT_URI,
    });

    return res.data;
  } catch (error: any) {
    console.error('카카오 로그인 실패:', error.response?.data?.message || error.message);
    return null;
  }
}
