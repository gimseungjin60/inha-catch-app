import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Bell, Sparkles, CalendarClock, Award } from 'lucide-react-native';

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Top Header Section */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={styles.titleRow}>
              <Bell color="#FFF" size={24} style={{ marginRight: 8 }} />
              <Text style={styles.titleText}>알림</Text>
            </View>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>2개</Text>
            </View>
          </View>
          <Text style={styles.subtitleText}>최신 공고를 확인하세요</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* AI Recommendations */}
        <View style={styles.sectionHeader}>
          <Sparkles color={colors.primary} size={20} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}> AI 추천</Text>
        </View>
        
        <View style={[styles.aiBox, { backgroundColor: colors.aiBoxBackground, borderColor: '#D9E4FF', borderWidth: 1 }]}>
          <Text style={{ color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
            회원님의 관심사와 프로필을 바탕으로 4개의 새로운 공고를 찾았습니다
          </Text>
          <Text style={{ color: colors.primary, fontWeight: 'bold' }}>추천 보기 →</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16, marginTop: 12 }]}>전체 알림</Text>

        {/* Noti Item 1 */}
        <View style={[styles.notiCard, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}>
          <View style={styles.notiIconWrap}>
             <Sparkles color={colors.primary} size={20} />
          </View>
          <View style={styles.notiContent}>
             <View style={styles.notiTitleRow}>
               <Text style={[styles.notiTitle, { color: colors.text }]}>새로운 추천</Text>
               <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
             </View>
             <Text style={[styles.notiDesc, { color: colors.textSecondary }]}>AI & 데이터 사이언스 경진대회 2026이 회원님의 기술 및 혁신 관심사와 일치합니다</Text>
             <Text style={styles.notiTime}>2시간 전</Text>
          </View>
        </View>

        {/* Noti Item 2 */}
        <View style={[styles.notiCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.notiIconWrap}>
             <CalendarClock color="#F44336" size={20} />
          </View>
          <View style={styles.notiContent}>
             <View style={styles.notiTitleRow}>
               <Text style={[styles.notiTitle, { color: colors.text }]}>마감 임박</Text>
               <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
             </View>
             <Text style={[styles.notiDesc, { color: colors.textSecondary }]}>AI & 데이터 사이언스 경진대회 지원 마감이 3일 남았습니다</Text>
             <Text style={styles.notiTime}>5시간 전</Text>
          </View>
        </View>

        {/* Noti Item 3 */}
        <View style={[styles.notiCard, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.notiIconWrap}>
             <Award color="#9C27B0" size={20} />
          </View>
          <View style={styles.notiContent}>
             <Text style={[styles.notiTitle, { color: colors.text }]}>신규 공고</Text>
             <Text style={[styles.notiDesc, { color: colors.textSecondary }]}>STEM 여성 장학금 지원이 시작되었습니다</Text>
             <Text style={styles.notiTime}>1일 전</Text>
          </View>
        </View>

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
    marginBottom: 8,
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
  badgeCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  notiCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notiIconWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  notiContent: {
    flex: 1,
  },
  notiTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notiDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notiTime: {
    fontSize: 12,
    color: '#A0AABF',
  }
});
