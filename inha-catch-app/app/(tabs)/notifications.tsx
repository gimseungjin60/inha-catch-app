import React, { useEffect, useState, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { Bell, RefreshCw, Trash2 } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import api from '@/api/axios'

const getTimeAgo = (dateStr?: string): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / (1000 * 60))
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}시간 전`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return '어제'
    if (diffDays < 7) return `${diffDays}일 전`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
    return `${Math.floor(diffDays / 30)}개월 전`
  } catch {
    return ''
  }
}

const categoryLabel = (type: string): string => {
  switch (type) {
    case 'DEADLINE':
      return '마감 임박'
    case 'NEW':
      return '신규 공고'
    case 'RECOMMEND':
      return '추천'
    case 'SYSTEM':
      return '공지'
    default:
      return type
  }
}

type ServerNotification = {
  id: number
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  scholarshipId?: number
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const router = useRouter()

  const [notifications, setNotifications] = useState<ServerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null)
      const res = await api.get('/api/notifications')
      setNotifications(res.data)
    } catch (err: any) {
      console.error('알림 조회 실패:', err.message)
      setError('알림을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api.post(`/api/notifications/${id}/read`)
    } catch {
      console.warn('읽음 처리 실패')
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.post('/api/notifications/read-all')
    } catch {
      console.warn('전체 읽음 처리 실패')
    }
  }

  const deleteNotification = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await api.delete(`/api/notifications/${id}`)
    } catch {
      console.warn('알림 삭제 실패')
    }
  }

  const deleteAll = async () => {
    setNotifications([])
    try {
      await api.delete('/api/notifications/all')
    } catch {
      console.warn('전체 삭제 실패')
    }
  }

  const handlePress = (noti: ServerNotification) => {
    if (!noti.read) markAsRead(noti.id)
    if (noti.scholarshipId) {
      router.push(`/details/${noti.scholarshipId}` as any)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.stone400 }]}>알림 ─ NOTIFICATIONS</Text>
          {notifications.length > 0 && (
            <View style={styles.actionRow}>
              {unreadCount > 0 && (
                <Pressable onPress={markAllAsRead} hitSlop={6}>
                  <Text style={[styles.actionText, { color: colors.signal }]}>모두 읽음</Text>
                </Pressable>
              )}
              <Pressable onPress={deleteAll} hitSlop={6}>
                <Text style={[styles.actionText, { color: colors.stone400 }]}>전체 삭제</Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>알림</Text>
        <Text style={[styles.subtitle, { color: colors.stone400 }]}>
          {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 확인했어요'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.signal} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, { color: colors.stone400 }]}>{error}</Text>
          <Pressable
            onPress={() => {
              setLoading(true)
              fetchNotifications()
            }}
            style={[styles.retryBtn, { backgroundColor: colors.ink }]}
          >
            <RefreshCw size={14} color={colors.paperCard} />
            <Text style={[styles.retryBtnText, { color: colors.paperCard }]}>다시 시도</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.stone50 }]}>
            <Bell size={20} strokeWidth={1.5} color={colors.stone400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>새로운 알림이 없어요</Text>
          <Text style={[styles.emptyDesc, { color: colors.stone400 }]}>
            공고가 등록되거나 마감이 가까워지면 알려드릴게요.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchNotifications()
              }}
              colors={[colors.signal]}
              tintColor={colors.signal}
            />
          }
        >
          {notifications.map((noti) => (
            <Pressable
              key={noti.id}
              onPress={() => handlePress(noti)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? colors.stone50 : 'transparent',
                  borderBottomColor: colors.stone100,
                },
              ]}
            >
              {/* 좌측 Margin Marker (unread만 signal) */}
              {!noti.read && (
                <View style={[styles.markerWrap, { backgroundColor: colors.signal }]} />
              )}

              <View style={styles.rowContent}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowCategory, { color: colors.stone400 }]}>
                    {categoryLabel(noti.type)}
                  </Text>
                  <Text style={[styles.rowTime, { color: colors.stone400 }]}>
                    {getTimeAgo(noti.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.ink, fontFamily: noti.read ? Fonts.medium : Fonts.semibold },
                  ]}
                  numberOfLines={1}
                >
                  {noti.title}
                </Text>
                <Text
                  style={[styles.rowMessage, { color: colors.stone400 }]}
                  numberOfLines={2}
                >
                  {noti.message}
                </Text>
              </View>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation()
                  deleteNotification(noti.id)
                }}
                hitSlop={8}
                style={styles.deleteBtn}
              >
                <Trash2 size={14} strokeWidth={1.5} color={colors.stone300} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
  },
  actionText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  retryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  listContainer: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    position: 'relative',
  },
  markerWrap: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 3,
    height: 20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  rowCategory: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rowTime: {
    fontFamily: Fonts.mono,
    fontSize: 11,
  },
  rowTitle: {
    fontSize: 15,
    letterSpacing: -0.1,
    marginBottom: 2,
  },
  rowMessage: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    justifyContent: 'center',
    paddingLeft: 4,
  },
})
