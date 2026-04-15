import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, ActivityIndicator, Platform, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Bell, CalendarClock, Award, RefreshCw, Trash2, CheckCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import api from '@/api/axios';

const getTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return `${Math.floor(diffDays / 30)}개월 전`;
  } catch {
    return '';
  }
};

type ServerNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  scholarshipId?: number;
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [notifications, setNotifications] = useState<ServerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (err: any) {
      console.error('알림 조회 실패:', err.message);
      setError('알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.post(`/api/notifications/${id}/read`);
    } catch (err) {
      console.warn('읽음 처리 실패');
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.post('/api/notifications/read-all');
    } catch (err) {
      console.warn('전체 읽음 처리 실패');
    }
  };

  const deleteNotification = async (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch (err) {
      console.warn('알림 삭제 실패');
    }
  };

  const deleteAll = async () => {
    setNotifications([]);
    try {
      await api.delete('/api/notifications/all');
    } catch (err) {
      console.warn('전체 삭제 실패');
    }
  };

  const handleNotificationPress = (noti: ServerNotification) => {
    if (!noti.read) markAsRead(noti.id);
    if (noti.scholarshipId) {
      router.push(`/details/${noti.scholarshipId}` as any);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'DEADLINE': return <CalendarClock color="#F44336" size={20} />;
      case 'NEW': return <Award color="#9C27B0" size={20} />;
      default: return <Bell color={colors.primary} size={20} />;
    }
  };

  const getCardBorder = (type: string, read: boolean) => {
    if (read) return { borderWidth: 0 };
    if (type === 'DEADLINE') return { borderWidth: 1, borderColor: '#F44336' };
    if (type === 'NEW') return { borderWidth: 1, borderColor: '#9C27B0' };
    return { borderWidth: 1, borderColor: colors.primary };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View style={styles.titleRow}>
              <Bell color="#FFF" size={24} style={{ marginRight: 8 }} />
              <Text style={styles.titleText}>알림</Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>읽지 않음 {unreadCount}개</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitleText}>최신 공고와 마감일정을 확인하세요</Text>
        </SafeAreaView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 16 }}>{error}</Text>
          <Pressable onPress={() => { setLoading(true); fetchNotifications(); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
            <RefreshCw size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} colors={[colors.primary]} />}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>전체 알림</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {unreadCount > 0 && (
                <Pressable
                  onPress={markAllAsRead}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.tagBackground }}>
                  <CheckCheck size={14} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>모두 읽음</Text>
                </Pressable>
              )}
              {notifications.length > 0 && (
                <Pressable
                  onPress={deleteAll}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.tagBackground }}>
                  <Trash2 size={14} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>전체 삭제</Text>
                </Pressable>
              )}
            </View>
          </View>

          {notifications.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Bell color={colors.textSecondary} size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
              <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 16 }}>새로운 알림이 없습니다.</Text>
              <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>장학금이 등록되면 알려드릴게요</Text>
            </View>
          ) : (
            notifications.map((noti) => (
              <TouchableOpacity
                key={noti.id}
                activeOpacity={0.8}
                onPress={() => handleNotificationPress(noti)}
              >
                <View style={[
                  styles.notiCard,
                  { backgroundColor: noti.read ? colors.cardBackground : (colors.aiBoxBackground || (colorScheme === 'dark' ? '#1a2332' : '#f0f6ff')) },
                  getCardBorder(noti.type, noti.read),
                ]}>
                  <View style={styles.notiIconWrap}>
                    {getNotificationIcon(noti.type)}
                  </View>
                  <View style={styles.notiContent}>
                    <View style={styles.notiTitleRow}>
                      <Text style={[styles.notiTitle, { color: colors.text }]}>{noti.title}</Text>
                      {!noti.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.notiDesc, { color: colors.textSecondary }]} numberOfLines={2}>{noti.message}</Text>
                    <Text style={styles.notiTime}>{getTimeAgo(noti.createdAt)}</Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteNotification(noti.id);
                    }}
                    hitSlop={8}
                    style={{ justifyContent: 'center', paddingLeft: 8 }}>
                    <Trash2 size={16} color="#aaa" />
                  </Pressable>
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
    fontSize: 13,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
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
  },
});
