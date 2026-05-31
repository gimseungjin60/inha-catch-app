import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import api from '@/api/axios'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import {
  STATUS_LABEL,
  STATUS_ORDER,
  ApplicationStatus,
  useApplications,
} from '@/context/ApplicationContext'

type AppItem = {
  id: number
  status: ApplicationStatus
  memo?: string | null
  appliedAt?: string | null
  resultAt?: string | null
  updatedAt: string
  scholarship?: {
    id: number
    title: string
    applyPeriod?: string
    dDay?: string
    boardId?: string
  }
}

type Filter = 'ALL' | ApplicationStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  ...STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABEL[s] })),
]

export default function ApplicationsScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const { refresh } = useApplications()

  const [filter, setFilter] = useState<Filter>('ALL')
  const [items, setItems] = useState<AppItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/api/applications', {
          params: filter === 'ALL' ? {} : { status: filter },
        }),
        api.get('/api/applications/stats'),
      ])
      setItems(listRes.data || [])
      setStats(statsRes.data || {})
    } catch (e) {
      // 401은 axios 인터셉터가 처리
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const onRefresh = () => {
    setRefreshing(true)
    Promise.all([load(), refresh()])
  }

  const totalCount =
    (stats.INTERESTED || 0) + (stats.APPLIED || 0) + (stats.ACCEPTED || 0) + (stats.REJECTED || 0)

  const renderItem = ({ item }: { item: AppItem }) => {
    const s = item.scholarship
    if (!s) return null
    return (
      <Pressable
        onPress={() => router.push(`/details/${s.id}` as any)}
        style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}
      >
        <View style={styles.cardHead}>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg(item.status, colors) }]}>
            <Text style={[styles.statusBadgeText, { color: badgeFg(item.status, colors) }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
          {s.dDay && (
            <Text style={[styles.dDay, { color: colors.stone400 }]}>{s.dDay}</Text>
          )}
        </View>
        <Text style={[styles.cardTitle, { color: colors.ink }]} numberOfLines={2}>
          {s.title}
        </Text>
        {s.applyPeriod && (
          <Text style={[styles.cardMeta, { color: colors.stone400 }]} numberOfLines={1}>
            {s.applyPeriod}
          </Text>
        )}
        {item.memo ? (
          <Text style={[styles.memo, { color: colors.stone400 }]} numberOfLines={2}>
            📝 {item.memo}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: colors.stone100 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <ChevronLeft size={22} strokeWidth={1.5} color={colors.ink} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.stone400 }]}>
          내 지원 현황 ─ APPLICATIONS
        </Text>
        <View style={styles.iconBtn} />
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <StatCell label="전체" value={totalCount} colors={colors} />
        <StatCell label="관심" value={stats.INTERESTED || 0} colors={colors} />
        <StatCell label="지원" value={stats.APPLIED || 0} colors={colors} />
        <StatCell label="합격" value={stats.ACCEPTED || 0} colors={colors} />
      </View>

      {/* 필터 칩 */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.ink : colors.stone50,
                  borderColor: active ? colors.ink : colors.stone100,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? colors.paper : colors.stone400 },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.signal} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.stone400 }]}>
            {filter === 'ALL'
              ? '아직 추적 중인 공고가 없어요.'
              : `${STATUS_LABEL[filter as ApplicationStatus]} 상태의 공고가 없어요.`}
          </Text>
          <Text style={[styles.emptySub, { color: colors.stone300 }]}>
            상세 화면에서 상태를 지정해보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.signal} />
          }
        />
      )}
    </SafeAreaView>
  )
}

function StatCell({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.stone400 }]}>{label}</Text>
    </View>
  )
}

function badgeBg(status: ApplicationStatus, colors: any) {
  switch (status) {
    case 'ACCEPTED':
      return colors.signalSoft
    case 'REJECTED':
      return colors.stone50
    case 'APPLIED':
      return colors.signalSoft
    default:
      return colors.stone50
  }
}

function badgeFg(status: ApplicationStatus, colors: any) {
  switch (status) {
    case 'ACCEPTED':
      return colors.signal
    case 'REJECTED':
      return colors.critical
    case 'APPLIED':
      return colors.signal
    default:
      return colors.stone400
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  dDay: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
  cardTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  cardMeta: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 4,
  },
  memo: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  emptySub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
})
