// 새 디자인 시스템 폰트 토큰. RN StyleSheet에서 fontFamily로 직접 참조.
// 한글: Pretendard 4-weight. 모노/숫자: SpaceMono.
// _layout.tsx 의 useFonts 에서 로드된 키와 일치해야 함.

const Fonts = {
  // Pretendard weight 4종
  regular: 'Pretendard-Regular',   // 400
  medium: 'Pretendard-Medium',     // 500
  semibold: 'Pretendard-SemiBold', // 600
  bold: 'Pretendard-Bold',         // 700

  // 모노스페이스 (D-day 숫자, 시간 등)
  mono: 'SpaceMono',
}

export default Fonts

// 자주 쓰는 텍스트 프리셋 (필요시 사용)
export const TextPresets = {
  display: { fontFamily: Fonts.bold, fontSize: 32, letterSpacing: -0.8, lineHeight: 36 },
  title: { fontFamily: Fonts.bold, fontSize: 22, letterSpacing: -0.4, lineHeight: 28 },
  h2: { fontFamily: Fonts.semibold, fontSize: 17, letterSpacing: -0.2, lineHeight: 23 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 24 },
  bodyMedium: { fontFamily: Fonts.medium, fontSize: 15, lineHeight: 24 },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16 },
  captionUppercase: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  mono: { fontFamily: Fonts.mono, fontSize: 13, lineHeight: 16 },
  monoLarge: { fontFamily: Fonts.mono, fontSize: 20, lineHeight: 22 },
}
