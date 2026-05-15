import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Bell, RefreshCw, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useUser } from '@/context/UserContext'
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard'
import api from '@/api/axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const TABS = ['전체', '장학금', '공모전'] as const
type Tab = (typeof TABS)[number]

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function todayLabel(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const [activeTab, setActiveTab] = useState<Tab>('전체')
  const router = useRouter()
  const { profile } = useUser()

  const [data, setData] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mapScholarship = (d: any, recIds: Set<number>): Scholarship => {
    const tags: string[] = []
    if (d.title.includes('공모전')) tags.push('#공모전')
    else tags.push('#장학금')
    if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility)

    let parsedAiSummary = [
      d.eligibility || '자격 조건은 상세 요강 참조',
      d.amountInfo || '지원 내역은 상세 요강 참조',
      d.applyPeriod || '모집 기한은 상세 요강 참조',
    ]
    if (d.basicSummary) {
      const bullets = d.basicSummary
        .split('\n')
        .filter((s: string) => s.trim().startsWith('•'))
        .map((s: string) => s.replace('•', '').trim())
      if (bullets.length > 0) parsedAiSummary = bullets
    }

    return {
      id: d.id,
      type: d.title.includes('공모전') ? 'contest' : 'scholarship',
      isRecommended: recIds.has(d.id),
      title: d.title,
      aiSummary: parsedAiSummary,
      tags: tags.length ? tags : ['#인하대'],
      dDay: d.dDay || '상시',
    }
  }

  const keywordsKey = profile.keywords?.join(',') ?? ''

  const fetchData = useCallback(
    (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (profile.major) params.append('major', profile.major)
      if (keywordsKey) params.append('keywords', keywordsKey)

      Promise.all([
        api.get('/api/scholarships?size=100'),
        api.get(`/api/scholarships/recommended?${params.toString()}`).catch(() => ({ data: [] })),
      ])
        .then(([allRes, recRes]) => {
          const recIds = new Set<number>(
            (recRes.data || []).map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
          )

          const rawData = allRes.data.content || allRes.data
          const mapped: Scholarship[] = rawData.map((d: any) => mapScholarship(d, recIds))

          mapped.sort((a, b) => {
            if (a.isRecommended && !b.isRecommended) return -1
            if (!a.isRecommended && b.isRecommended) return 1
            return 0
          })

          setData(mapped)
          AsyncStorage.setItem('@cache_scholarships', JSON.stringify(mapped)).catch(() => {})
        })
        .catch(async (err) => {
          console.error('API Fetch Error:', err)
          try {
            const cached = await AsyncStorage.getItem('@cache_scholarships')
            if (cached) {
              setData(JSON.parse(cached))
              setError(null)
              return
            }
          } catch {}
          setError('데이터를 불러오지 못했습니다.')
        })
        .finally(() => {
          setLoading(false)
          setRefreshing(false)
        })
    },
    [profile.major, keywordsKey]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (activeTab === '전체') return true
      if (activeTab === '장학금') return item.type === 'scholarship'
      if (activeTab === '공모전') return item.type === 'contest'
      return true
    })
  }, [data, activeTab])

  const recommendedCount = useMemo(() => data.filter((d) => d.isRecommended).length, [data])

  const renderItem = useCallback(({ item }: { item: Scholarship }) => <ScholarshipCard item={item} />, [])
  const keyExtractor = useCallback((item: Scholarship) => item.id.toString(), [])

  const ListHeader = () => (
    <View>
      {/* 메타 + 종 */}
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: colors.stone400 }]}>
          INHA-CATCH ─ {todayLabel()}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/notifications' as any)}
          hitSlop={10}
        >
          <Bell size={20} strokeWidth={1.5} color={colors.stone400} />
        </Pressable>
      </View>

      {/* 큰 인사 헤드라인 */}
      <Text style={[styles.greeting, { color: colors.ink }]}>
        안녕, {profile.name || '학우'}님.{'\n'}
        오늘{' '}
        <Text style={[styles.greetingHighlight, { color: colors.signal }]}>{data.length}건</Text>의
        공고가 준비됐어요.
      </Text>

      {recommendedCount > 0 && (
        <Text style={[styles.subline, { color: colors.stone400 }]}>
          이 중 {recommendedCount}건은 당신의 조건에 잘 맞는 추천이에요.
        </Text>
      )}

      {/* 학과/키워드 미설정 안내 배너 */}
      {(!profile.major || profile.major.trim() === '') && (
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as any)}
          style={[styles.profileBanner, { backgroundColor: colors.signalSoft, borderColor: colors.signal }]}
        >
          <View style={styles.profileBannerContent}>
            <Text style={[styles.profileBannerLabel, { color: colors.signal }]}>
              맞춤 추천 ─ NEEDED
            </Text>
            <Text style={[styles.profileBannerTitle, { color: colors.ink }]}>
              학과를 알려주면 정확한 추천을 받을 수 있어요.
            </Text>
          </View>
          <ChevronRight size={16} strokeWidth={1.5} color={colors.signal} />
        </Pressable>
      )}
      {profile.major && (!profile.keywords || profile.keywords.length === 0) && (
        <Pressable
          onPress={() => router.push('/(tabs)/profile' as any)}
          style={[styles.profileBanner, { backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
        >
          <View style={styles.profileBannerContent}>
            <Text style={[styles.profileBannerLabel, { color: colors.stone400 }]}>
              관심 키워드 ─ OPTIONAL
            </Text>
            <Text style={[styles.profileBannerTitle, { color: colors.ink }]}>
              관심 키워드를 추가하면 더 정확하게 추천해드려요.
            </Text>
          </View>
          <ChevronRight size={16} strokeWidth={1.5} color={colors.stone400} />
        </Pressable>
      )}

      {/* segmented 탭 */}
      <View style={[styles.tabsContainer, { borderColor: colors.stone100 }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabChip,
                {
                  backgroundColor: active ? colors.ink : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabChipText,
                  { color: active ? colors.paperCard : colors.stone400 },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* 리스트 카운트 줄 */}
      <View style={styles.listCountRow}>
        <Text style={[styles.listCountLabel, { color: colors.stone400 }]}>
          {activeTab} ─ LISTINGS
        </Text>
        <Text style={[styles.listCountValue, { color: colors.ink }]}>
          {filteredData.length}
        </Text>
      </View>
    </View>
  )

  const ListEmpty = () => {
    if (loading) {
      return (
        <ActivityIndicator size="small" color={colors.signal} style={{ marginTop: 40 }} />
      )
    }
    if (error) {
      return (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.stone400 }]}>{error}</Text>
          <Pressable
            onPress={() => fetchData()}
            style={[styles.retryBtn, { backgroundColor: colors.ink }]}
          >
            <RefreshCw size={14} color={colors.paperCard} />
            <Text style={[styles.retryBtnText, { color: colors.paperCard }]}>다시 시도</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <Text style={[styles.emptyText, { color: colors.stone400, textAlign: 'center', marginTop: 40 }]}>
        공고가 없습니다.
      </Text>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.paper }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.paper}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={loading ? [] : filteredData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.contentContainer}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[colors.signal]}
              tintColor={colors.signal}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  greetingHighlight: {
    fontFamily: Fonts.bold,
  },
  subline: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  profileBannerContent: {
    flex: 1,
  },
  profileBannerLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  profileBannerTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
  },
  tabChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  listCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  listCountLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listCountValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 40,
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
})
