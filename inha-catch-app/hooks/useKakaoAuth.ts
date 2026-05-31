import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import api from '@/api/axios';

// Expo AuthSession redirect URI 자동 생성
// → 처음 호출 시 콘솔에 찍히는 값을 카카오 개발자 콘솔의 Redirect URI에 등록해야 함
const REDIRECT_URI = makeRedirectUri({ preferLocalhost: false });
console.log('[Kakao] REDIRECT_URI =', REDIRECT_URI);

// 카카오 REST API 키 (카카오 개발자 콘솔에서 발급)
// app.json의 extra.kakaoRestApiKey 또는 환경변수에서 읽음
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
  try {
    // 1. 카카오 OAuth 인가 페이지 열기
    const authUrl =
      `https://kauth.kakao.com/oauth/authorize?` +
      `client_id=${KAKAO_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type !== 'success' || !result.url) {
      return null;
    }

    // 2. redirect URL에서 인가코드 추출
    const url = new URL(result.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('카카오 인가코드를 받지 못했습니다.');
      return null;
    }

    // 3. 서버에 인가코드 전송 → JWT 토큰 수신
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
