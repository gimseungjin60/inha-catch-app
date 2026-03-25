import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Bookmark as BookmarkIcon, Trash2 } from 'lucide-react-native';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';

const DUMMY_DATA: Scholarship[] = [
  {
    id: 1,
    type: 'scholarship',
    isRecommended: true,
    title: '인하대학교 우수장학금 2026',
    aiSummary: ['공학·경영 전공 학점 3.8 이상', '전액 등록금 + 월 50만원', '2026년 4월 15일 (29일 남음)'],
    tags: ['#공학', '#경영'],
    dDay: 30,
  },
  {
    id: 3,
    type: 'scholarship',
    isRecommended: false,
    title: '글로벌 리더 장학 프로그램',
    aiSummary: ['유학생, TOPIK 4급 이상', '학기당 3백만원 (2년)', '2026년 4월 30일 (44일 남음)'],
    tags: ['#유학생', '#한국어', '#리더십'],
    dDay: 45,
  },
  {
    id: 4,
    type: 'scholarship',
    isRecommended: false,
    title: '사회혁신 장학금',
    aiSummary: ['사회 문제 해결 아이디어 소지자', '전액 등록금 지원', '상시 모집 (인원 충원 시 마감)'],
    tags: ['#사회공헌', '#혁신', '#창업'],
    dDay: 99,
  }
];

export default function BookmarkScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Top Header Section */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={styles.titleRow}>
              <BookmarkIcon color="#FFF" size={24} style={{ marginRight: 8 }} />
              <Text style={styles.titleText}>북마크</Text>
            </View>
            <Pressable style={styles.clearBtn}>
              <Trash2 color="#FFF" size={16} style={{ marginRight: 4 }} />
              <Text style={styles.clearBtnText}>전체 삭제</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitleText}>{DUMMY_DATA.length}개 저장됨</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {DUMMY_DATA.map((item) => (
          <ScholarshipCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    padding: 20,
  }
});
