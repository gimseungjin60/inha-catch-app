import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 우선순위: EXPO_PUBLIC_API_URL > 플랫폼 기본값
// - iOS 시뮬레이터:   http://localhost:8080
// - Android 에뮬레이터: http://10.0.2.2:8080
// - 실기기/프로덕션:   EXPO_PUBLIC_API_URL 필수
const defaultDevUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || defaultDevUrl;

// 인증 실패 시 로그인 화면으로 리다이렉트하기 위한 콜백
let onAuthFailure: (() => void) | null = null;
export const setOnAuthFailure = (callback: () => void) => {
  onAuthFailure = callback;
};

const api = axios.create({
  baseURL: apiUrl,
  timeout: 15000,
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
