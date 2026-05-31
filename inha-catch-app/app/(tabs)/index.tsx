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
  ScrollView,
} from 'react-native'
import { Bell, RefreshCw, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useUser } from '@/context/UserContext'
import ScholarshipCard, { Scholarship, RecommendReason } from '@/components/ScholarshipCard'
import SectionHeader from '@/components/SectionHeader'
import api from '@/api/axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const HORIZONTAL_CARD_WIDTH = 280

const TABS = ['전체', '장학금', '공모전', '채용'] as const
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

  const mapScholarship = (d: any, recIds: Set<number>, reasonsById: Map<number, RecommendReason[]>): Scholarship => {
    const title = d.title ?? ''
    // 서버 category 우선, 없으면 제목 휴리스틱 폴백
    const cat: string = (d.category || '').toUpperCase()
    let type: Scholarship['type']
    if (cat === 'JOB') type = 'job'
    else if (cat === 'CONTEST') type = 'contest'
    else if (cat === 'SCHOLARSHIP') type = 'scholarship'
    else if (title.includes('공모전')) type = 'contest'
    else type = 'scholarship'

    const tags: string[] = []
    if (type === 'job') tags.push('#채용')
    else if (type === 'contest') tags.push('#공모전')
    else tags.push('#장학금')
    if (type === 'job' && d.companyName) tags.push('#' + d.companyName)
    else if (type === 'job' && d.workLocation) tags.push('#' + d.workLocation)
    else if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility)

    let parsedAiSummary: string[]
    if (type === 'job') {
      parsedAiSummary = [
        d.companyName || '기관 정보 없음',
        d.workLocation ? `근무지: ${d.workLocation}` : '근무지 정보 없음',
        d.applyPeriod || '모집 기한은 상세 요강 참조',
      ]
    } else {
      parsedAiSummary = [
        d.eligibility || '자격 조건은 상세 요강 참조',
        d.amountInfo || '지원 내역은 상세 요강 참조',
        d.applyPeriod || '모집 기한은 상세 요강 참조',
      ]
    }
    if (d.basicSummary) {
      const bullets = d.basicSummary
        .split('\n')
        .filter((s: string) => s.trim().startsWith('•'))
        .map((s: string) => s.replace('•', '').trim())
      if (bullets.length > 0) parsedAiSummary = bullets
    }

    return {
      id: d.id,
      type,
      isRecommended: recIds.has(d.id),
      title: title,
      aiSummary: parsedAiSummary,
      tags: tags.length ? tags : ['#인하대'],
      dDay: d.DDay || d.dDay || '상시',
      reasons: reasonsById.get(d.id),
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
        api.get('/api/scholarships?size=1500'),
        api.get(`/api/scholarships/recommended?${params.toString()}`).catch(() => ({ data: [] })),
      ])
        .then(([allRes, recRes]) => {
          const recList: any[] = recRes.data || []
          const recIds = new Set<number>(
            recList.map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
          )
          const reasonsById = new Map<number, RecommendReason[]>()
          for (const r of recList) {
            const sId = r.scholarship?.id ?? r.id
            if (sId && Array.isArray(r.reasons)) {
              reasonsById.set(sId, r.reasons)
            }
          }

          const rawData = allRes.data.content || allRes.data
          const mapped: Scholarship[] = rawData.map((d: any) => mapScholarship(d, recIds, reasonsById))

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
    const filtered = data.filter((item) => {
      if (activeTab === '전체') return true
      if (activeTab === '장학금') return item.type === 'scholarship'
      if (activeTab === '공모전') return item.type === 'contest'
      if (activeTab === '채용') return item.type === 'job'
      return true
    })
    // 탭당 50건만 노출 (화면 부하 줄임)
    return filtered.slice(0, 50)
  }, [data, activeTab])

  // dDay 문자열을 숫자로 — "D-3" → 3, "D-Day" → 0, "마감"/"상시" → null
  const parseDDay = (s: string): number | null => {
    if (!s) return null
    if (s === 'D-Day') return 0
    if (s === '마감' || s === '상시') return null
    const m = s.match(/^D-(\d+)$/)
    return m ? parseInt(m[1], 10) : null
  }

  // 가로 캐러셀 — 추천 (전체 탭에서만 노출)
  const recommendedItems = useMemo(
    () => data.filter((d) => d.isRecommended).slice(0, 10),
    [data]
  )
  // 가로 캐러셀 — 마감 임박 (D-7 이내, 마감/상시 제외)
  const urgentItems = useMemo(() => {
    return data
      .map((d) => ({ ...d, _dn: parseDDay(d.dDay) }))
      .filter((d) => d._dn !== null && d._dn! >= 0 && d._dn! <= 7)
      .sort((a, b) => a._dn! - b._dn!)
      .slice(0, 10)
  }, [data])

  const recommendedCount = recommendedItems.length

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

      {/* 맞춤 추천 진행 표시 — 학과/키워드 활성 칩 + 추천 건수 강조 */}
      {(profile.major || (profile.keywords && profile.keywords.length > 0)) && (
        <View style={[styles.matchBox, { backgroundColor: colors.signalSoft, borderColor: colors.signal }]}>
          <View style={styles.matchTopRow}>
            <Text style={[styles.matchLabel, { color: colors.signal }]}>
              MATCHING ─ ACTIVE
            </Text>
            {recommendedCount > 0 && (
              <Text style={[styles.matchCount, { color: colors.signal }]}>
                {recommendedCount}건
              </Text>
            )}
          </View>
          <Text style={[styles.matchHeadline, { color: colors.ink }]}>
            {recommendedCount > 0
              ? `당신을 위한 맞춤 추천 ${recommendedCount}건이 위쪽에 있어요.`
              : '아직 매칭된 공고가 없어요. 키워드를 추가해보세요.'}
          </Text>
          <View style={styles.matchChipRow}>
            {profile.major ? (
              <View style={[styles.matchChip, { backgroundColor: colors.paperCard, borderColor: colors.signal }]}>
                <Text style={[styles.matchChipKey, { color: colors.stone400 }]}>학과</Text>
                <Text style={[styles.matchChipVal, { color: colors.ink }]}>{profile.major}</Text>
              </View>
            ) : null}
            {(profile.keywords || []).slice(0, 4).map((kw) => (
              <View
                key={kw}
                style={[styles.matchChip, { backgroundColor: colors.paperCard, borderColor: colors.signal }]}
              >
                <Text style={[styles.matchChipKey, { color: colors.stone400 }]}>#</Text>
                <Text style={[styles.matchChipVal, { color: colors.ink }]}>{kw}</Text>
              </View>
            ))}
            {(profile.keywords || []).length > 4 && (
              <Text style={[styles.matchMore, { color: colors.stone400 }]}>
                +{(profile.keywords || []).length - 4}
              </Text>
            )}
          </View>
        </View>
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

      {/* 가로 캐러셀: 추천 공고 — 전체 탭에서만 */}
      {activeTab === '전체' && recommendedItems.length > 0 && (
        <View style={styles.carouselBlock}>
          <SectionHeader title="추천 공고" subtitle={`${recommendedItems.length}건`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselScroll}
          >
            {recommendedItems.map((item) => (
              <View key={`rec-${item.id}`} style={styles.hCardWrap}>
                <ScholarshipCard item={item} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 가로 캐러셀: 마감 임박 (D-7 이내) — 전체 탭에서만 */}
      {activeTab === '전체' && urgentItems.length > 0 && (
        <View style={styles.carouselBlock}>
          <SectionHeader title="마감 임박" subtitle={`D-7 이내 ${urgentItems.length}건`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselScroll}
          >
            {urgentItems.map((item) => (
              <View key={`urg-${item.id}`} style={styles.hCardWrap}>
                <ScholarshipCard item={item} />
              </View>
            ))}
          </ScrollView>
        </View>
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
  matchBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  matchCount: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  matchHeadline: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  matchChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  matchChipKey: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  matchChipVal: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  matchMore: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    marginLeft: 2,
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
  carouselBlock: {
    marginBottom: 8,
    marginHorizontal: -20, // 카드가 화면 끝까지 닿게 부모 padding 상쇄
  },
  carouselScroll: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  hCardWrap: {
    width: HORIZONTAL_CARD_WIDTH,
    marginRight: 12,
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
