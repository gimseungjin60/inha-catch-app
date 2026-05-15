import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// JWT/refresh 같은 민감한 토큰 전용 스토리지.
// - iOS: Keychain (SecAccessibleAfterFirstUnlock)
// - Android: EncryptedSharedPreferences (AES-256, 안드로이드 keystore)
// - Web: localStorage (브라우저는 OS keystore 접근 X — XSS 방어가 별도 필요)
//
// SecureStore 의 키는 영숫자/._- 만 허용하므로 '@jwt_token' 같은 prefix 사용 금지.
// 일반 캐시는 그대로 AsyncStorage 사용 (성능/용량).

const NATIVE_AVAILABLE = Platform.OS !== 'web'

// SecureStore-safe 키 (영숫자 + _ . -)
const KEY = {
  jwt: 'inha_catch_jwt_token',
  refresh: 'inha_catch_refresh_token',
}

export const SECURE_KEYS = KEY

async function setItem(key: string, value: string): Promise<void> {
  if (NATIVE_AVAILABLE) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    })
  } else {
    // Web — XSS 방지는 CSP/세션 짧게 운영으로 보강
    await AsyncStorage.setItem(key, value)
  }
}

async function getItem(key: string): Promise<string | null> {
  if (NATIVE_AVAILABLE) {
    return SecureStore.getItemAsync(key)
  }
  return AsyncStorage.getItem(key)
}

async function deleteItem(key: string): Promise<void> {
  if (NATIVE_AVAILABLE) {
    await SecureStore.deleteItemAsync(key)
  } else {
    await AsyncStorage.removeItem(key)
  }
}

// JWT 토큰 전용 헬퍼
export async function setJwtToken(token: string) {
  await setItem(KEY.jwt, token)
}
export async function getJwtToken(): Promise<string | null> {
  return getItem(KEY.jwt)
}
export async function setRefreshToken(token: string) {
  await setItem(KEY.refresh, token)
}
export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEY.refresh)
}
export async function clearAuthTokens() {
  await Promise.all([deleteItem(KEY.jwt), deleteItem(KEY.refresh)])
}

// 기존 AsyncStorage 의 토큰을 SecureStore 로 1회 이관 (앱 업데이트 후 첫 실행).
// 이관 끝나면 AsyncStorage 의 토큰은 제거.
export async function migrateLegacyAuthTokens(): Promise<void> {
  if (!NATIVE_AVAILABLE) return // 웹은 그대로 AsyncStorage 사용
  try {
    const legacyJwt = await AsyncStorage.getItem('@jwt_token')
    const legacyRefresh = await AsyncStorage.getItem('@refresh_token')
    if (legacyJwt) {
      await setItem(KEY.jwt, legacyJwt)
      await AsyncStorage.removeItem('@jwt_token')
    }
    if (legacyRefresh) {
      await setItem(KEY.refresh, legacyRefresh)
      await AsyncStorage.removeItem('@refresh_token')
    }
  } catch (e) {
    // 이관 실패해도 앱 동작은 막지 않음
    console.warn('[secureStorage] legacy token migration failed:', e)
  }
}
