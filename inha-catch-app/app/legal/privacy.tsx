import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PrivacyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>개인정보 처리방침</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          최종 개정일: 2026-05-12
        </Text>

        <Text style={[styles.sectionBody, { color: colors.text, marginBottom: 20 }]}>
          INHA CATCH(이하 “서비스”)는 「개인정보 보호법」을 준수하며 이용자의 개인정보를 안전하게 처리하기 위하여 다음과 같은 처리방침을 마련하여 운영합니다.
        </Text>

        <Section title="1. 수집하는 개인정보 항목" colors={colors}>
          {`서비스는 회원가입 및 기능 제공을 위해 아래 항목을 수집합니다.

[필수 항목]
- 이메일 주소
- 비밀번호 (단방향 해시 저장)
- 이름 또는 닉네임

[선택 항목]
- 소속 학과(전공)
- 관심 키워드
- FCM 푸시 토큰 (알림 수신 동의 시)

[카카오 소셜 로그인 시 추가 수집]
- 카카오 회원 고유 ID
- 카카오 계정 이메일·닉네임 (카카오로부터 제공받은 범위 내)

[자동 수집 정보]
- 공고 조회 이력, 북마크 이력 (맞춤 추천 알고리즘 학습용)
- 서비스 이용 시각 및 접속 기록 (장애 분석 목적)`}
        </Section>

        <Section title="2. 개인정보의 수집 및 이용 목적" colors={colors}>
          {`- 회원 식별 및 본인 확인
- 맞춤 장학금/공모전 추천
- 마감일/신규 공고 푸시 알림 발송
- 부정 이용 방지 및 서비스 운영 안정성 확보
- 서비스 개선을 위한 통계 분석`}
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간" colors={colors}>
          {`- 회원 정보: 회원 탈퇴 시점까지 보유 후 즉시 파기
- 조회/북마크 이력: 회원 탈퇴 시 함께 삭제
- 단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 분리 보관
  · 「전자상거래법」에 따른 분쟁 처리 기록: 해당 없음 (서비스는 결제·거래 기능을 제공하지 않음)
  · 「통신비밀보호법」에 따른 접속 로그: 최대 3개월`}
        </Section>

        <Section title="4. 개인정보의 제3자 제공" colors={colors}>
          {`서비스는 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래의 경우는 예외로 합니다.
- 이용자가 사전에 동의한 경우
- 법령 또는 수사기관의 적법한 절차에 따른 요청이 있는 경우`}
        </Section>

        <Section title="5. 개인정보 처리의 위탁" colors={colors}>
          {`서비스 운영을 위해 일부 처리 업무를 아래와 같이 위탁하고 있습니다.

- Google Firebase Cloud Messaging (FCM): 푸시 알림 발송
- Kakao Corp.: 카카오 소셜 로그인 인증
- Google LLC (Gemini API): 공고 요약 가공 (개인정보가 아닌 공개 공고 본문만 전달)

각 수탁자는 개인정보 보호법 및 관련 약관에 따라 안전하게 정보를 처리하도록 관리·감독됩니다.`}
        </Section>

        <Section title="6. 이용자의 권리와 행사 방법" colors={colors}>
          {`이용자는 언제든지 아래의 권리를 행사할 수 있습니다.
- 개인정보 열람·정정 요구: 마이페이지에서 직접 수정
- 개인정보 처리 정지 요구: 운영자에게 이메일로 요청
- 회원 탈퇴 및 개인정보 삭제 요구: 마이페이지 > 회원 탈퇴`}
        </Section>

        <Section title="7. 개인정보의 파기 절차 및 방법" colors={colors}>
          {`- 파기 절차: 회원 탈퇴 또는 보유기간 만료 시 즉시 파기
- 파기 방법: 데이터베이스에서 영구 삭제 (DELETE 처리)
- 파일 형태의 정보: 복구 불가능한 방법으로 영구 삭제`}
        </Section>

        <Section title="8. 개인정보의 안전성 확보 조치" colors={colors}>
          {`- 비밀번호 단방향 암호화 저장 (BCrypt)
- JWT 기반 인증 및 토큰 블랙리스트 운영
- 통신 구간 HTTPS 암호화
- 접근 권한 최소화 및 운영자 인증 절차`}
        </Section>

        <Section title="9. 개인정보 보호책임자" colors={colors}>
          {`- 책임자: 김승진 (서비스 운영자, 인하대 학생)
- 연락처: aicapstone1111@gmail.com
이용자는 서비스 이용 중 발생한 개인정보 관련 문의·불만 사항을 위 연락처로 신고할 수 있습니다.`}
        </Section>

        <Section title="10. 처리방침의 변경" colors={colors}>
          본 처리방침은 시행일로부터 적용되며, 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제·수정이 있는 경우 시행 7일 전부터 서비스 내 공지를 통해 안내합니다.
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 4 },
  content: { padding: 20, paddingBottom: 60 },
  meta: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});
