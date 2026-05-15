import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, RefreshControl } from 'react-native'
import { useBookmarks } from '@/context/BookmarkContext'
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard'
import api from '@/api/axios'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RefreshCw, Bookmark as BookmarkIcon } from 'lucide-react-native'
import { useUser } from '@/context/UserContext'
import { useRouter } from 'expo-router'

export default function BookmarkScreen() {
  const { bookmarkedIds } = useBookmarks()
  const { profile } = useUser()
  const router = useRouter()
  const [bookmarkedItems, setBookmarkedItems] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendedIds, setRecommendedIds] = useState<Set<number>>(new Set())

  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  useEffect(() => {
    const params = new URLSearchParams()
    if (profile.major) params.append('major', profile.major)
    if (profile.keywords?.length) params.append('keywords', profile.keywords.join(','))

    api
      .get(`/api/scholarships/recommended?${params.toString()}`)
      .then((res) => {
        const ids = new Set<number>(
          (res.data || []).map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
        )
        setRecommendedIds(ids)
      })
      .catch(() => {})
  }, [profile.major, profile.keywords])

  const fetchBookmarked = () => {
    if (bookmarkedIds.length === 0) {
      setBookmarkedItems([])
      return
    }
    if (!profile.isLoggedIn) {
      setBookmarkedItems([])
      return
    }

    setLoading(true)
    setError(null)

    api
      .get('/api/bookmarks')
      .then((res) => {
        const rawData = res.data || []
        const mapped: Scholarship[] = rawData.map((d: any) => {
          const tags: string[] = []
          if (d.title?.includes('공모전')) tags.push('#공모전')
          else tags.push('#장학금')
          if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility)

          return {
            id: d.id,
            type: d.title?.includes('공모전') ? 'contest' : 'scholarship',
            isRecommended: recommendedIds.has(d.id),
            title: d.title,
            aiSummary: [
              d.eligibility || '자격 조건은 상세 요강 참조',
              d.amountInfo || '지원 내역은 상세 요강 참조',
              d.applyPeriod || '모집 기한은 상세 요강 참조',
            ],
            tags: tags.length ? tags : ['#인하대'],
            dDay: d.dDay || '상시',
          }
        })
        setBookmarkedItems(mapped)
      })
      .catch((err) => {
        console.error(err)
        setError('저장한 공고를 불러오지 못했습니다.')
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    fetchBookmarked()
  }, [bookmarkedIds])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.meta, { color: colors.stone400 }]}>저장 ─ BOOKMARKS</Text>
        <Text style={[styles.title, { color: colors.ink }]}>저장한 공고</Text>
        <Text style={[styles.subtitle, { color: colors.stone400 }]}>
          {bookmarkedIds.length > 0
            ? `${bookmarkedIds.length}개의 공고를 모아뒀어요.`
            : '아직 저장한 공고가 없어요.'}
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
            onPress={fetchBookmarked}
            style={[styles.retryBtn, { backgroundColor: colors.ink }]}
          >
            <RefreshCw size={14} color={colors.paperCard} />
            <Text style={[styles.retryBtnText, { color: colors.paperCard }]}>다시 시도</Text>
          </Pressable>
        </View>
      ) : bookmarkedItems.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.stone50 }]}>
            <BookmarkIcon size={20} strokeWidth={1.5} color={colors.stone400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>아직 저장한 공고가 없어요</Text>
          <Text style={[styles.emptyDesc, { color: colors.stone400 }]}>
            마음에 드는 공고를 북마크하면 여기에 모여요.
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/' as any)}
            style={[styles.linkBtn, { borderColor: colors.stone100 }]}
          >
            <Text style={[styles.linkBtnText, { color: colors.ink }]}>홈에서 둘러보기 →</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookmarkedItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => <ScholarshipCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchBookmarked()
              }}
              colors={[colors.signal]}
              tintColor={colors.signal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
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
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginBottom: 16,
  },
  linkBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
})
