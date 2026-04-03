import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';

const api = axios.create({
  baseURL: apiUrl,
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
    if (error.response && error.response.status === 401 && !originalRequest._retry && error.config.url.indexOf('/api/auth/login') === -1) {
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
        await AsyncStorage.removeItem('@jwt_token');
        await AsyncStorage.removeItem('@refresh_token');
        await AsyncStorage.removeItem('@user_profile');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
