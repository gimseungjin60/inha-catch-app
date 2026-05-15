import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TermsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>서비스 이용약관</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          최종 개정일: 2026-05-12
        </Text>

        <Section title="제1조 (목적)" colors={colors}>
          본 약관은 INHA CATCH(이하 “서비스”)가 제공하는 인하대학교 학생 대상 장학금/공모전 정보 알림 및 추천 서비스의 이용에 관한 권리·의무·책임사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)" colors={colors}>
          {`1. “이용자”란 본 약관에 따라 서비스를 이용하는 회원을 말합니다.
2. “계정”이란 이용자가 회원가입 또는 카카오 소셜 로그인을 통해 부여받은 식별 정보를 말합니다.
3. “콘텐츠”란 서비스가 외부 공식 출처(인하대학교 홈페이지, 위비티, 씽굿 등)에서 수집·가공해 제공하는 장학금/공모전 정보를 말합니다.`}
        </Section>

        <Section title="제3조 (약관의 효력 및 변경)" colors={colors}>
          {`1. 본 약관은 서비스 화면에 게시함으로써 효력을 발생합니다.
2. 운영자는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 시행일자 7일 전(이용자에게 불리한 변경의 경우 30일 전)부터 공지합니다.
3. 이용자가 개정 약관 시행일 이후에도 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 봅니다.`}
        </Section>

        <Section title="제4조 (회원가입 및 계정 관리)" colors={colors}>
          {`1. 회원가입은 이용자가 본 약관과 개인정보 처리방침에 동의하고 이메일/비밀번호 또는 카카오 계정을 통해 신청함으로써 성립합니다.
2. 이용자는 본인의 계정 정보를 제3자에게 양도·대여할 수 없습니다.
3. 이용자는 언제든지 마이페이지의 회원 탈퇴 메뉴를 통해 이용계약을 해지할 수 있습니다.`}
        </Section>

        <Section title="제5조 (서비스의 제공)" colors={colors}>
          {`1. 서비스는 다음과 같은 기능을 제공합니다.
   - 장학금/공모전 공고 수집 및 카테고리 분류
   - 사용자 맞춤 키워드 기반 추천
   - 마감일/신규 공고 푸시 알림
   - 북마크 및 조회 이력 관리
2. 서비스는 24시간 365일 제공을 원칙으로 하나, 시스템 점검·장애·천재지변 등 부득이한 사유로 일시 중단될 수 있습니다.`}
        </Section>

        <Section title="제6조 (콘텐츠의 출처 및 정확성)" colors={colors}>
          {`1. 서비스가 제공하는 콘텐츠는 공개된 외부 출처를 크롤링하여 자동 수집·요약한 정보이며, 운영자는 원문의 정확성·최신성을 보증하지 않습니다.
2. 이용자는 실제 지원·신청 전 반드시 원문 링크를 통해 정보를 재확인해야 합니다.
3. 콘텐츠 요약은 인공지능(LLM) 모델이 생성하며, 사실 관계 오류가 포함될 수 있습니다.`}
        </Section>

        <Section title="제7조 (이용자의 의무)" colors={colors}>
          {`이용자는 다음 행위를 해서는 안 됩니다.
1. 타인의 계정 또는 개인정보 도용
2. 서비스의 자동화된 크롤링/스크래핑(서비스의 정상 운영을 방해하는 행위)
3. 운영자의 사전 동의 없이 서비스 콘텐츠를 영리 목적으로 복제·재배포
4. 관련 법령에 위반되는 행위`}
        </Section>

        <Section title="제8조 (운영자의 책임 제한)" colors={colors}>
          {`1. 운영자는 학생 개인 프로젝트로 운영되는 비영리 서비스이며, 천재지변·통신장애·외부 출처의 변경 등 운영자의 통제를 벗어난 사유로 발생한 손해에 대하여 책임을 지지 않습니다.
2. 운영자는 콘텐츠의 정확성/적합성/완전성을 보증하지 않으며, 이용자가 서비스 정보에 근거하여 행한 결정의 결과에 대해 책임을 지지 않습니다.`}
        </Section>

        <Section title="제9조 (계약 해지 및 회원 탈퇴)" colors={colors}>
          {`1. 이용자는 마이페이지 > 회원 탈퇴를 통해 언제든지 이용계약을 해지할 수 있습니다.
2. 회원 탈퇴 시 이용자의 계정 정보, 북마크, 알림 이력, 조회 이력은 즉시 삭제되며 복구되지 않습니다.
3. 단, 관련 법령에 따라 보존이 필요한 정보는 해당 기간 동안 분리 보관 후 삭제됩니다.`}
        </Section>

        <Section title="제10조 (분쟁 해결)" colors={colors}>
          본 약관에 명시되지 않은 사항은 대한민국 관련 법령 및 일반 상관례에 따르며, 분쟁 발생 시 운영자 소재지 관할 법원을 1심 관할 법원으로 합니다.
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
