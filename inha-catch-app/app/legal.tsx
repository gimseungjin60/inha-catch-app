import React from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const PRIVACY = `# 개인정보처리방침

**최종 수정일: 2026-04-20**

Inha-Catch(이하 "서비스")는 이용자의 개인정보를 중요하게 여기며, 개인정보 보호법 등 관련 법령을 준수합니다.

## 1. 수집하는 개인정보 항목

- **필수**: 이메일, 비밀번호(해시), 이름
- **선택**: 학과, 학년, 관심 키워드
- **자동 수집**: 기기식별자(FCM 토큰), 조회·북마크 이력
- **소셜 로그인**: 카카오 식별자, 이메일, 닉네임

## 2. 수집 및 이용 목적

회원가입·인증, 맞춤 공고 추천, 푸시 알림, 서비스 개선

## 3. 보유 및 이용 기간

회원 탈퇴 시 즉시 파기 (법령에 따른 보존 제외)

## 4. 제3자 제공

원칙적으로 제3자에게 제공하지 않습니다.

## 5. 처리 위탁

- Google LLC (Gemini API) — 공고 AI 요약
- Google LLC (Firebase) — 푸시 알림 발송
- Kakao Corp. — 카카오 소셜 로그인

## 6. 이용자 권리

개인정보 열람·수정·삭제·처리정지 권리를 행사할 수 있습니다.

## 7. 안전성 확보 조치

- 비밀번호 BCrypt 단방향 해시 저장
- HTTPS 암호화 통신
- 관리자 권한 분리 및 접근 로그

## 8. 개인정보 보호책임자

- 이메일: (연락처 이메일)
- 소속: 인하공업전문대학 캡스톤팀
`;

const TERMS = `# 이용약관

**최종 수정일: 2026-04-20**

## 제1조 (목적)

본 약관은 Inha-Catch(이하 "서비스")의 이용 조건을 규정합니다.

## 제2조 (서비스 제공)

- 장학금·공모전 공고 목록 및 상세
- AI 요약 및 맞춤 추천
- 북마크, 마감 알림, 푸시 알림

공고 원문의 정확성은 보장하지 않으며, 지원 전 **원본 사이트 확인**이 필요합니다.

## 제3조 (이용자 의무)

이용자는 다음 행위를 해서는 안 됩니다:

- 서비스 크롤링·리버스 엔지니어링
- 서비스 운영 방해
- 관리자 권한 무단 획득
- 저작권·개인정보 등 타인 권리 침해

## 제4조 (서비스 중단)

시스템 점검·법령 준수·긴급 상황 시 서비스를 일시 중단할 수 있습니다.

## 제5조 (면책)

- 천재지변·불가항력으로 인한 장애 면책
- 크롤링 정보의 정확성 미보장
- 이용자 간 분쟁 불개입

## 제6조 (약관 변경)

변경 시 앱 내 공지하며, 변경 후 이용은 동의로 간주됩니다.
`;

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? '개인정보처리방침' : '이용약관';
  const content = isPrivacy ? PRIVACY : TERMS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          style={styles.backBtn}
        >
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Markdown
          style={{
            body: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
            heading1: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: 8, marginBottom: 12 },
            heading2: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 20, marginBottom: 8 },
            strong: { color: colors.text, fontWeight: '700' },
            bullet_list: { marginVertical: 6 },
          }}
        >
          {content}
        </Markdown>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
});
