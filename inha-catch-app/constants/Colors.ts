const primaryBlue = '#2962FF';
const gradientStart = '#2962FF';
const gradientEnd = '#4A3AFF';

// ── 새 디자인 시스템 토큰 (v0 어드민과 동일한 Ink/Paper/Stone/Signal/Critical)
// 새 화면/컴포넌트는 이 토큰만 사용. 기존 화면은 기존 토큰을 그대로 사용.
const ink = '#0B1220';
const inkDark = '#E8ECF2';
const signal = '#2F6BFF';
const signalDark = '#5B8BFF';
const critical = '#C2410C';

export default {
  light: {
    // ── 기존 토큰 (legacy, 기존 화면 호환성)
    text: '#111111',
    textSecondary: '#666666',
    background: '#FFFFFF',
    screenBackground: '#F5F7FA',
    tint: primaryBlue,
    primary: primaryBlue,
    gradientStart,
    gradientEnd,
    tabIconDefault: '#A0AABF',
    tabIconSelected: primaryBlue,
    border: '#E5E8EB',
    cardBackground: '#FFFFFF',
    aiBoxBackground: '#F0F5FF',
    aiBoxText: primaryBlue,
    tagBackground: '#F2F4F8',
    tagText: '#5A6B87',

    // ── 새 토큰 (Ink/Paper/Stone/Signal/Critical)
    ink,
    paper: '#FAFAF7',
    paperCard: '#FFFFFF',
    stone50: '#F4F3EF',
    stone100: '#E8E6DF',
    stone200: '#D3CFC4',
    stone300: '#A8A398',
    stone400: '#6C6960',
    stone500: '#3D3B36',
    signal,
    signalSoft: '#E8EFFF',
    critical,
  },
  dark: {
    // ── 기존 토큰
    text: '#FFFFFF',
    textSecondary: '#A0AABF',
    background: '#111111',
    screenBackground: '#000000',
    tint: primaryBlue,
    primary: '#4D7BFF',
    gradientStart,
    gradientEnd,
    tabIconDefault: '#666666',
    tabIconSelected: '#4D7BFF',
    border: '#333333',
    cardBackground: '#1C1C1E',
    aiBoxBackground: '#1A2952',
    aiBoxText: '#7A9FFF',
    tagBackground: '#2C2C2E',
    tagText: '#8E8E93',

    // ── 새 토큰
    ink: inkDark,
    paper: '#0E0F12',
    paperCard: '#15171C',
    stone50: '#1E2028',
    stone100: 'rgba(232, 236, 242, 0.08)',
    stone200: 'rgba(232, 236, 242, 0.15)',
    stone300: '#6C6960',
    stone400: '#A8A398',
    stone500: '#D3CFC4',
    signal: signalDark,
    signalSoft: 'rgba(47, 107, 255, 0.15)',
    critical: '#D55322',
  },
};
