/**
 * Sentry 초기화. EXPO_PUBLIC_SENTRY_DSN 이 비어있으면 no-op.
 * prebuild 후 네이티브 빌드에서만 실제 동작.
 */

let isInitialized = false;

export function initSentry(): void {
  if (isInitialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] EXPO_PUBLIC_SENTRY_DSN 미설정 → 초기화 스킵');
    return;
  }
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn,
      tracesSampleRate: 0.2, // 20% 트랜잭션 샘플링
      environment: __DEV__ ? 'development' : 'production',
      enableAutoSessionTracking: true,
    });
    isInitialized = true;
    console.log('[Sentry] 초기화 완료');
  } catch (e: any) {
    console.warn('[Sentry] 초기화 실패 (Expo Go에서는 정상):', e?.message);
  }
}

export function captureException(error: unknown, context?: Record<string, any>): void {
  if (!isInitialized) {
    console.error('[Error]', error, context);
    return;
  }
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // 무시
  }
}
