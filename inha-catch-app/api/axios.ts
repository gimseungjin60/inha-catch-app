import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// API URL 설정
// 배포/외부 테스트: TUNNEL_URL을 실제 터널 주소로 변경
// 로컬 개발: null로 두면 자동 감지
// ============================================================
// 터널 사용 시: 'https://xxx.loca.lt' / 로컬 테스트: null
const TUNNEL_URL: string | null = null;

// 같은 Wi-Fi에서 테스트 시 PC IP 직접 지정 (ipconfig로 확인)
const LOCAL_IP = '172.20.10.5';

const getApiUrl = () => {
  if (TUNNEL_URL) return TUNNEL_URL;

  // 웹 브라우저에서 테스트 시 localhost 사용
  if (Platform.OS === 'web') return `http://${LOCAL_IP}:8080`;
  // Android 에뮬레이터
  if (Platform.OS === 'android') return `http://${LOCAL_IP}:8080`;
  // iOS
  return `http://${LOCAL_IP}:8080`;
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
    const token = await AsyncStorage.getItem('@jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = error.config?.url?.indexOf('/api/auth/') !== -1;

    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('@refresh_token');
        if (refreshToken) {
          const res = await axios.post(`${apiUrl}/api/auth/refresh`, { refreshToken });
          if (res.status === 200) {
            await AsyncStorage.setItem('@jwt_token', res.data.token);
            originalRequest.headers['Authorization'] = `Bearer ${res.data.token}`;
            return api(originalRequest);
          }
        }
      } catch (e) {
        // 토큰 갱신 실패 → 전체 로그아웃 처리
        await AsyncStorage.multiRemove(['@jwt_token', '@refresh_token', '@user_profile']);
        if (onAuthFailure) onAuthFailure();
        return Promise.reject(error);
      }
      // refreshToken이 없는 경우
      await AsyncStorage.multiRemove(['@jwt_token', '@refresh_token', '@user_profile']);
      if (onAuthFailure) onAuthFailure();
    }
    return Promise.reject(error);
  }
);

export default api;
