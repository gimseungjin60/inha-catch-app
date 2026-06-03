import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJwtToken, getRefreshToken, setJwtToken, clearAuthTokens } from '@/lib/secureStorage';

// ============================================================
// API URL 설정
// 배포/외부 테스트: TUNNEL_URL을 실제 터널 주소로 변경
// 로컬 개발: null로 두면 자동 감지
// ============================================================
// 터널 사용 시: 'https://xxx.loca.lt' / 로컬 테스트: null
const TUNNEL_URL: string | null = null;

// (개발 전용) iOS 실기기/시뮬레이터에서 로컬 서버에 붙을 때 쓰는 개발자 PC의 LAN IP.
// EXPO_PUBLIC_API_URL 이 설정돼 있으면 이 값은 무시됨.
// 본인 PC IP로 교체하거나 .env 의 EXPO_PUBLIC_LOCAL_IP 로 지정 (ipconfig / ifconfig 로 확인).
const LOCAL_DEV_IP = process.env.EXPO_PUBLIC_LOCAL_IP?.trim() || '172.20.10.5';

// Android 에뮬레이터는 10.0.2.2가 PC의 localhost를 가리킴 (특수 IP)
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const getApiUrl = () => {
  // 배포/스테이징: .env의 EXPO_PUBLIC_API_URL이 최우선 (예: https://api.inhacatch.kr)
  // 이 값이 설정되면 아래 개발용 폴백은 무시됨 → 프로덕션 빌드가 항상 실서버를 바라봄
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl.trim();

  if (TUNNEL_URL) return TUNNEL_URL;

  // 웹 브라우저에서 테스트 시 localhost 사용
  if (Platform.OS === 'web') return `http://localhost:8080`;
  // Android 에뮬레이터 → PC localhost 자동 연결
  if (Platform.OS === 'android') return `http://${ANDROID_EMULATOR_HOST}:8080`;
  // iOS (실기기 동일 Wi-Fi 테스트용 — 배포 시 EXPO_PUBLIC_API_URL로 대체)
  return `http://${LOCAL_DEV_IP}:8080`;
};

export const apiUrl = getApiUrl();

// 인증 실패 시 로그인 화면으로 리다이렉트하기 위한 콜백
let onAuthFailure: (() => void) | null = null;
export const setOnAuthFailure = (callback: () => void) => {
  onAuthFailure = callback;
};

const api = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
  headers: {
    'Bypass-Tunnel-Reminder': 'true',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getJwtToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 동시에 여러 요청이 401을 받아도 토큰 갱신은 한 번만 수행하고 나머지는 그 결과를 공유한다.
// (race condition 방지 — 이전엔 N개 요청이 각자 refresh를 호출해 2번째부터 실패했음)
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  const res = await axios.post(`${apiUrl}/api/auth/refresh`, { refreshToken });
  if (res.status === 200 && res.data?.token) {
    await setJwtToken(res.data.token);
    return res.data.token as string;
  }
  return null;
}

async function forceLogout() {
  await clearAuthTokens();
  await AsyncStorage.removeItem('@user_profile');
  if (onAuthFailure) onAuthFailure();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = error.config?.url?.indexOf('/api/auth/') !== -1;

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        // 진행 중인 갱신이 있으면 그 Promise를 재사용
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (e) {
        // 갱신 실패 → 아래 공통 로그아웃 처리로 진행
      }
      // refreshToken이 없거나 갱신 실패 → 전체 로그아웃
      await forceLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
