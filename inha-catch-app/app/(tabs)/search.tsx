import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search as SearchIcon, RefreshCw, X } from 'lucide-react-native'
import api from '@/api/axios'
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useUser } from '@/context/UserContext'

export default function SearchScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  const { profile } = useUser()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Scholarship[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recommendedIds, setRecommendedIds] = useState<Set<number>>(new Set())
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchSeq = useRef(0)

  const keywordsKey = profile.keywords?.join(',') ?? ''

  useEffect(() => {
    const params = new URLSearchParams()
    if (profile.major) params.append('major', profile.major)
    if (keywordsKey) params.append('keywords', keywordsKey)

    api
      .get(`/api/scholarships/recommended?${params.toString()}`)
      .then((res) => {
        const ids = new Set<number>(
          (res.data || []).map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
        )
        setRecommendedIds(ids)
      })
      .catch(() => {})
  }, [profile.major, keywordsKey])

  const runSearch = useCallback(
    (kw: string) => {
      if (!kw.trim()) return
      setLoading(true)
      setHasSearched(true)
      setError(null)

      const mySeq = ++searchSeq.current

      api
        .get(`/api/scholarships/search?keyword=${encodeURIComponent(kw)}&size=100`)
        .then((res) => {
          if (mySeq !== searchSeq.current) return // 더 새로운 검색이 시작됨 → 결과 무시
          const rawData = res.data.content || res.data
          const mapped: Scholarship[] = rawData.map((d: any) => {
            const title = d.title ?? ''
            const tags: string[] = []
            if (title.includes('공모전')) tags.push('#공모전')
            else tags.push('#장학금')
            if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility)

            return {
              id: d.id,
              type: title.includes('공모전') ? 'contest' : 'scholarship',
              isRecommended: recommendedIds.has(d.id),
              title: title,
              aiSummary: [
                d.eligibility || '자격 조건은 상세 요강 참조',
                d.amountInfo || '지원 내역은 상세 요강 참조',
                d.applyPeriod || '모집 기한은 상세 요강 참조',
              ],
              tags: tags.length ? tags : ['#인하대'],
              dDay: d.dDay || '상시',
            }
          })
          setResults(mapped)
        })
        .catch((err) => {
          if (mySeq !== searchSeq.current) return
          console.error(err)
          setError('검색 중 오류가 발생했습니다.')
        })
        .finally(() => {
          if (mySeq === searchSeq.current) setLoading(false)
        })
    },
    [recommendedIds]
  )

  const handleKeywordChange = useCallback(
    (text: string) => {
      setKeyword(text)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (text.trim().length > 0) {
        debounceTimer.current = setTimeout(() => runSearch(text), 400)
      } else {
        setHasSearched(false)
        setResults([])
        setError(null)
      }
    },
    [runSearch]
  )

  const clearKeyword = () => {
    setKeyword('')
    setHasSearched(false)
    setResults([])
    setError(null)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.paper, paddingTop: insets.top }]}>
      {/* Header: meta + search bar */}
      <View style={styles.headerWrap}>
        <Text style={[styles.meta, { color: colors.stone400 }]}>검색 ─ SEARCH</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <SearchIcon size={18} strokeWidth={1.5} color={colors.stone400} />
          <TextInput
            style={[styles.input, { color: colors.ink }]}
            placeholder="키워드, 학과, 지원금"
            placeholderTextColor={colors.stone300}
            value={keyword}
            onChangeText={handleKeywordChange}
            onSubmitEditing={() => runSearch(keyword)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {keyword.length > 0 && (
            <Pressable onPress={clearKeyword} hitSlop={8}>
              <X size={16} strokeWidth={1.5} color={colors.stone400} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.signal} />
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, { color: colors.stone400 }]}>{error}</Text>
          <Pressable
            onPress={() => runSearch(keyword)}
            style={[styles.retryBtn, { backgroundColor: colors.ink }]}
          >
            <RefreshCw size={14} color={colors.paperCard} />
            <Text style={[styles.retryBtnText, { color: colors.paperCard }]}>다시 시도</Text>
          </Pressable>
        </View>
      ) : !hasSearched ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.stone50 }]}>
            <SearchIcon size={20} strokeWidth={1.5} color={colors.stone400} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>찾고 있는 공고가 있나요?</Text>
          <Text style={[styles.emptyDesc, { color: colors.stone400 }]}>
            제목·자격·지원금 키워드로 검색해보세요.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>검색 결과가 없습니다</Text>
          <Text style={[styles.emptyDesc, { color: colors.stone400 }]}>
            "{keyword}" 와(과) 일치하는 공고를 찾지 못했어요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={
            <View style={styles.resultMetaRow}>
              <Text style={[styles.resultMetaLabel, { color: colors.stone400 }]}>RESULTS</Text>
              <Text style={[styles.resultMetaValue, { color: colors.ink }]}>{results.length}</Text>
            </View>
          }
          renderItem={({ item }) => <ScholarshipCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => runSearch(keyword)}
              colors={[colors.signal]}
              tintColor={colors.signal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  resultMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  resultMetaLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  resultMetaValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
})
