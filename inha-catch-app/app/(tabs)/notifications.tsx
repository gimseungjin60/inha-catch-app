import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, ActivityIndicator, Platform, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Bell, Sparkles, CalendarClock, Award, RefreshCw } from 'lucide-react-native';
import { useBookmarks } from '@/context/BookmarkContext';
import { useRouter } from 'expo-router';
import api from '@/api/axios';
import { Scholarship } from '@/components/ScholarshipCard';

const getTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  } catch {
    return '';
  }
};

type AppNotification = {
  id: string;
  scholarshipId: number;
  type: 'deadline' | 'new';
  title: string;
  message: string;
  timeStr: string;
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  
  const { bookmarkedIds } = useBookmarks();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/api/scholarships?size=200')
      .then(res => {
        const rawData = res.data.content || res.data;
        type MappedItem = { id: number; type: 'contest' | 'scholarship'; title: string; dDay: string; postedAt: string | null };
        const mapped: MappedItem[] = rawData.map((d: any) => ({
          id: d.id,
          type: d.title.includes('공모전') ? 'contest' : 'scholarship',
          title: d.title,
          dDay: d.dDay || '상시',
          postedAt: d.postedAt || null,
        }));

        let newNotis: AppNotification[] = [];

        // 1. 마감 임박 알림 (북마크 한 것 중 D-3 이하)
        const bookmarked = mapped.filter(item => bookmarkedIds.includes(item.id));
        bookmarked.forEach(item => {
          if (item.dDay.startsWith('D-') || item.dDay === 'D-Day') {
            const num = item.dDay === 'D-Day' ? 0 : parseInt(item.dDay.replace('D-', ''), 10);
            if (!isNaN(num) && num <= 3) {
              newNotis.push({
                id: `deadline-${item.id}`,
                scholarshipId: item.id,
                type: 'deadline',
                title: '마감 임박',
                message: `[${item.title}] 지원 마감이 ${num === 0 ? '오늘입니다!' : num + '일 남았습니다.'}`,
                timeStr: num === 0 ? '오늘 마감' : `D-${num}`
              });
            }
          }
        });

        // 2. 신규 등록 알림 (최신 5개)
        const recent = mapped.slice(0, 5);
        recent.forEach(item => {
          newNotis.push({
            id: `new-${item.id}`,
            scholarshipId: item.id,
            type: 'new',
            title: '신규 공고',
            message: `새로운 ${item.type === 'scholarship' ? '장학금' : '공모전'}이 등록되었습니다: [${item.title}]`,
            timeStr: getTimeAgo(item.postedAt ?? undefined)
          });
        });

        setNotifications(newNotis);
      })
      .catch(err => {
        console.error(err);
        setError('알림을 불러오지 못했습니다.');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [bookmarkedIds]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
              <Text style={styles.badgeText}>{notifications.length}개</Text>
            </View>
          </View>
          <Text style={styles.subtitleText}>최신 공고와 마감일정을 확인하세요</Text>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={fetchNotifications} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
            <RefreshCw size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={['#2962FF']} />}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>전체 알림</Text>

          {notifications.length === 0 ? (
            <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>새로운 알림이 없습니다.</Text>
          ) : (
            notifications.map((noti) => (
              <TouchableOpacity 
                key={noti.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/details/${noti.scholarshipId}` as any)}
              >
                <View style={[styles.notiCard, { backgroundColor: colors.cardBackground, borderColor: noti.type === 'deadline' ? '#F44336' : 'transparent', borderWidth: noti.type === 'deadline' ? 1 : 0 }]}>
                  <View style={styles.notiIconWrap}>
                     {noti.type === 'deadline' ? <CalendarClock color="#F44336" size={20} /> : <Award color="#9C27B0" size={20} />}
                  </View>
                  <View style={styles.notiContent}>
                     <View style={styles.notiTitleRow}>
                       <Text style={[styles.notiTitle, { color: colors.text }]}>{noti.title}</Text>
                       <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                     </View>
                     <Text style={[styles.notiDesc, { color: colors.textSecondary }]}>{noti.message}</Text>
                     <Text style={styles.notiTime}>{noti.timeStr}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 60 : 20,
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
    paddingBottom: 100
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notiCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
